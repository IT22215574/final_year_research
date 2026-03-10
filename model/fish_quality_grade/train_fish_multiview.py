import os
import copy
import random
import warnings
from collections import Counter

import numpy as np
import pandas as pd
from PIL import Image

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    balanced_accuracy_score,
    f1_score,
)
from sklearn.utils.class_weight import compute_class_weight

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.cuda.amp import autocast, GradScaler

import timm

warnings.filterwarnings("ignore")

try:
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


# =========================================================
# CONFIG
# =========================================================
TRAIN_CSV = "stage3_grade_train.csv"
VAL_CSV = "stage3_grade_val.csv"
TEST_CSV = "stage3_grade_test.csv"


# Change this depending on stage:
# Stage 1 -> "binary_label"
# Stage 2 -> "species_label"
# Stage 3 -> "grade_label"
LABEL_COLUMN = "grade_label"

BEST_MODEL_PATH = "best_grade_classifier.pth"

IMG_SIZE = 224
BATCH_SIZE = 8
EPOCHS = 40
LR = 2e-4
NUM_WORKERS = 0
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

FREEZE_EPOCHS = 3
UNFREEZE_LR = 2e-5

WEIGHT_DECAY = 1e-4
DROPOUT_RATE = 0.35
LABEL_SMOOTHING = 0.1

PATIENCE = 10
SEED = 42
BACKBONE = "efficientnet_b0"


# =========================================================
# REPRODUCIBILITY
# =========================================================
def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


set_seed(SEED)


# =========================================================
# LABEL MAPPING
# =========================================================
def create_class_mapping(train_df, label_column):
    unique_labels = sorted(train_df[label_column].dropna().astype(str).unique())
    class_to_idx = {label: idx for idx, label in enumerate(unique_labels)}
    idx_to_class = {idx: label for label, idx in class_to_idx.items()}

    print(f"\nLabel column: {label_column}")
    print(f"Number of classes: {len(class_to_idx)}")
    print("Classes:", unique_labels)

    return class_to_idx, idx_to_class


# =========================================================
# DATASET
# =========================================================
class DualImageDataset(Dataset):
    def __init__(self, csv_path, label_column, transform=None, class_to_idx=None):
        self.df = pd.read_csv(csv_path).copy()
        self.label_column = label_column
        self.transform = transform

        self.df = self.df.dropna(subset=["left_image", "right_image", label_column]).reset_index(drop=True)
        self.df[label_column] = self.df[label_column].astype(str)

        if class_to_idx is not None:
            self.class_to_idx = class_to_idx
            self.df = self.df[self.df[label_column].isin(class_to_idx.keys())].reset_index(drop=True)
        else:
            self.class_to_idx, _ = create_class_mapping(self.df, label_column)

        print(f"\nLoaded {len(self.df)} samples from {csv_path}")
        print(f"Class distribution: {dict(sorted(Counter(self.df[label_column]).items()))}")

    def __len__(self):
        return len(self.df)

    def _load_image(self, path):
        try:
            return Image.open(path).convert("RGB")
        except Exception as e:
            print(f"Error loading image {path}: {e}")
            return Image.new("RGB", (IMG_SIZE, IMG_SIZE), color="black")

    def __getitem__(self, idx):
        row = self.df.iloc[idx]

        left_img = self._load_image(row["left_image"])
        right_img = self._load_image(row["right_image"])

        if self.transform:
            left_img = self.transform(left_img)
            right_img = self.transform(right_img)

        y = self.class_to_idx[row[self.label_column]]
        return left_img, right_img, torch.tensor(y, dtype=torch.long)


# =========================================================
# MODEL
# =========================================================
class DualViewClassifier(nn.Module):
    def __init__(self, backbone_name="efficientnet_b0", num_classes=2, img_size=224, dropout_rate=0.35):
        super().__init__()

        self.backbone = timm.create_model(backbone_name, pretrained=True, num_classes=0)

        with torch.no_grad():
            dummy = torch.zeros(1, 3, img_size, img_size)
            feat_dim = self.backbone(dummy).shape[1]

        self.feat_dim = feat_dim

        # Lightweight attention-like fusion
        self.view_gate = nn.Sequential(
            nn.Linear(feat_dim * 2, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, 2),
            nn.Softmax(dim=1),
        )

        self.classifier = nn.Sequential(
            nn.Linear(feat_dim * 2, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_rate),

            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_rate * 0.8),

            nn.Linear(256, num_classes)
        )

        self.aux_left = nn.Linear(feat_dim, num_classes)
        self.aux_right = nn.Linear(feat_dim, num_classes)

        self._init_weights()

    def _init_weights(self):
        for m in self.classifier.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, mode="fan_in", nonlinearity="relu")
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def forward(self, left, right, return_aux=False):
        f1 = self.backbone(left)
        f2 = self.backbone(right)

        fused = torch.cat([f1, f2], dim=1)

        # Gate the two views
        gates = self.view_gate(fused)  # [B, 2]
        g1 = gates[:, 0].unsqueeze(1)
        g2 = gates[:, 1].unsqueeze(1)

        weighted_f1 = f1 * g1
        weighted_f2 = f2 * g2
        fused_weighted = torch.cat([weighted_f1, weighted_f2], dim=1)

        logits = self.classifier(fused_weighted)

        if return_aux:
            aux_left = self.aux_left(f1)
            aux_right = self.aux_right(f2)
            return logits, aux_left, aux_right

        return logits


# =========================================================
# SAMPLER / CLASS WEIGHTS
# =========================================================
def get_class_weights(df, label_column, class_to_idx):
    labels = df[label_column].map(class_to_idx).values
    classes = np.arange(len(class_to_idx))
    class_weights = compute_class_weight(
        class_weight="balanced",
        classes=classes,
        y=labels
    )
    return torch.tensor(class_weights, dtype=torch.float32).to(DEVICE)


def get_weighted_sampler(df, label_column, class_to_idx):
    labels = df[label_column].map(class_to_idx).values
    class_counts = Counter(labels)
    weights = [1.0 / class_counts[label] for label in labels]

    sampler = WeightedRandomSampler(
        weights=weights,
        num_samples=len(weights),
        replacement=True
    )
    return sampler


# =========================================================
# TRAIN / VALIDATE
# =========================================================
def train_epoch(model, loader, optimizer, criterion, scaler):
    model.train()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0

    for left, right, y in loader:
        left, right, y = left.to(DEVICE), right.to(DEVICE), y.to(DEVICE)

        optimizer.zero_grad(set_to_none=True)

        with autocast(enabled=(DEVICE == "cuda")):
            logits, aux_left, aux_right = model(left, right, return_aux=True)

            main_loss = criterion(logits, y)
            aux_loss_l = criterion(aux_left, y)
            aux_loss_r = criterion(aux_right, y)

            loss = main_loss + 0.2 * aux_loss_l + 0.2 * aux_loss_r

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

        preds = logits.argmax(dim=1)

        total_loss += loss.item() * y.size(0)
        total_correct += (preds == y).sum().item()
        total_samples += y.size(0)

    return total_loss / total_samples, total_correct / total_samples


def validate_epoch(model, loader, criterion):
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for left, right, y in loader:
            left, right, y = left.to(DEVICE), right.to(DEVICE), y.to(DEVICE)

            with autocast(enabled=(DEVICE == "cuda")):
                logits = model(left, right)
                loss = criterion(logits, y)

            preds = logits.argmax(dim=1)

            total_loss += loss.item() * y.size(0)
            total_correct += (preds == y).sum().item()
            total_samples += y.size(0)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(y.cpu().numpy())

    acc = total_correct / total_samples
    bal_acc = balanced_accuracy_score(all_labels, all_preds)
    macro_f1 = f1_score(all_labels, all_preds, average="macro")

    return total_loss / total_samples, acc, bal_acc, macro_f1, all_preds, all_labels


# =========================================================
# MAIN
# =========================================================
def main():
    print(f"Device: {DEVICE}")

    train_df = pd.read_csv(TRAIN_CSV)
    class_to_idx, idx_to_class = create_class_mapping(train_df, LABEL_COLUMN)
    num_classes = len(class_to_idx)

    # Lighter and safer augmentation
    train_transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(8),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1, hue=0.03),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])

    train_dataset = DualImageDataset(TRAIN_CSV, LABEL_COLUMN, transform=train_transform, class_to_idx=class_to_idx)
    val_dataset = DualImageDataset(VAL_CSV, LABEL_COLUMN, transform=val_transform, class_to_idx=class_to_idx)
    test_dataset = DualImageDataset(TEST_CSV, LABEL_COLUMN, transform=val_transform, class_to_idx=class_to_idx)

    sampler = get_weighted_sampler(train_dataset.df, LABEL_COLUMN, class_to_idx)

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=NUM_WORKERS,
        pin_memory=(DEVICE == "cuda"),
        drop_last=True,
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=(DEVICE == "cuda"),
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=(DEVICE == "cuda"),
    )

    model = DualViewClassifier(
        backbone_name=BACKBONE,
        num_classes=num_classes,
        img_size=IMG_SIZE,
        dropout_rate=DROPOUT_RATE,
    ).to(DEVICE)

    # Freeze backbone first
    for p in model.backbone.parameters():
        p.requires_grad = False

    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\nTotal parameters: {total_params:,}")
    print(f"Initially trainable parameters: {trainable_params:,}")

    class_weights = get_class_weights(train_dataset.df, LABEL_COLUMN, class_to_idx)
    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=LABEL_SMOOTHING)

    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LR,
        weight_decay=WEIGHT_DECAY,
    )

    scheduler = ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=3,
    )

    scaler = GradScaler(enabled=(DEVICE == "cuda"))

    best_val_bal_acc = 0.0
    best_model_state = None
    patience_counter = 0

    print("\nStarting training...")
    print("-" * 90)

    for epoch in range(1, EPOCHS + 1):
        if epoch == FREEZE_EPOCHS + 1:
            for p in model.backbone.parameters():
                p.requires_grad = True

            optimizer = AdamW(
                model.parameters(),
                lr=UNFREEZE_LR,
                weight_decay=WEIGHT_DECAY,
            )

            scheduler = ReduceLROnPlateau(
                optimizer,
                mode="max",
                factor=0.5,
                patience=3,
            )

            print(f"\n[INFO] Backbone unfrozen. New LR = {UNFREEZE_LR}")

        train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, scaler)
        val_loss, val_acc, val_bal_acc, val_macro_f1, val_preds, val_labels = validate_epoch(model, val_loader, criterion)

        scheduler.step(val_bal_acc)

        current_lr = optimizer.param_groups[0]["lr"]

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} | "
            f"Val Bal Acc: {val_bal_acc:.4f} | "
            f"Val Macro F1: {val_macro_f1:.4f} | "
            f"LR: {current_lr:.2e}"
        )

        # Save best based on balanced accuracy
        if val_bal_acc > best_val_bal_acc:
            best_val_bal_acc = val_bal_acc
            best_model_state = copy.deepcopy(model.state_dict())
            torch.save(best_model_state, BEST_MODEL_PATH)
            print(f"  [OK] New best model saved! Val Balanced Acc: {val_bal_acc:.4f}")
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= PATIENCE:
                print(f"Early stopping triggered at epoch {epoch}")
                break

    print("\nLoading best model...")
    model.load_state_dict(torch.load(BEST_MODEL_PATH, map_location=DEVICE))

    print("\n" + "=" * 90)
    print("FINAL TEST EVALUATION")
    print("=" * 90)

    test_loss, test_acc, test_bal_acc, test_macro_f1, test_preds, test_labels = validate_epoch(model, test_loader, criterion)

    print(f"Test Loss: {test_loss:.4f}")
    print(f"Test Accuracy: {test_acc:.4f}")
    print(f"Test Balanced Accuracy: {test_bal_acc:.4f}")
    print(f"Test Macro F1: {test_macro_f1:.4f}")

    target_names = [idx_to_class[i] for i in range(num_classes)]

    print("\n" + "=" * 90)
    print("CLASSIFICATION REPORT")
    print("=" * 90)
    print(classification_report(test_labels, test_preds, target_names=target_names, digits=4))

    cm = confusion_matrix(test_labels, test_preds)
    cm_normalized = cm.astype(float) / np.clip(cm.sum(axis=1, keepdims=True), a_min=1, a_max=None)

    print("\n" + "=" * 90)
    print("PER-CLASS ACCURACY")
    print("=" * 90)
    for i, class_name in enumerate(target_names):
        support = cm[i].sum()
        correct = cm[i, i]
        acc = cm_normalized[i, i]
        print(f"{class_name:20s}: {acc:.4f} ({correct}/{support})")

    return model


if __name__ == "__main__":
    main()