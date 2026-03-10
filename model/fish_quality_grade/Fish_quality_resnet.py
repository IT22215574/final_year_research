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
from sklearn.model_selection import train_test_split

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau

try:
    from torch.amp import autocast, GradScaler
    USE_NEW_AMP = True
except ImportError:
    from torch.cuda.amp import autocast, GradScaler
    USE_NEW_AMP = False

import timm

warnings.filterwarnings("ignore")

# =========================================================
# CONFIGURATION
# =========================================================
STAGE1_TRAIN_CSV = "stage1_train.csv"          # fish / non-fish
STAGE2_TRAIN_CSV = "stage2_species_train.csv"  # species
STAGE3_TRAIN_CSV = "stage3_grade_train.csv"    # grade

STAGE1_MODEL_PATH = "best_stage1_binary_model.pth"
STAGE2_MODEL_PATH = "best_stage2_species_model.pth"
STAGE3_MODEL_PATH = "best_stage3_grade_model.pth"

LABEL_MAPPINGS_PATH = "label_mappings.pth"

IMG_SIZE = 224
BATCH_SIZE = 16
EPOCHS = 50
FREEZE_EPOCHS = 5

HEAD_LR = 2e-4
BACKBONE_LR = 1e-5
WEIGHT_DECAY = 1e-4

NUM_WORKERS = 0
DROPOUT_RATE = 0.3
LABEL_SMOOTHING = 0.05
PATIENCE = 12

VAL_SIZE = 0.15
TEST_SIZE = 0.15
SEED = 42

# Better for small/medium datasets
BACKBONE = "resnet50"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# =========================================================
# REPRODUCIBILITY
# =========================================================
def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if DEVICE == "cuda":
        torch.cuda.manual_seed_all(seed)

set_seed(SEED)

# =========================================================
# DATASET
# =========================================================
class FishDataset(Dataset):
    def __init__(self, dataframe, label_column, transform=None):
        self.df = dataframe.reset_index(drop=True)
        self.label_column = label_column
        self.transform = transform

        self.unique_labels = sorted(self.df[label_column].unique())
        self.label_to_idx = {label: idx for idx, label in enumerate(self.unique_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}

        print(f"\n[{label_column}] Classes: {self.unique_labels}")
        print(f"[{label_column}] Distribution: {dict(sorted(Counter(self.df[label_column]).items()))}")

    def __len__(self):
        return len(self.df)

    def _load_image(self, path):
        try:
            if not isinstance(path, str) or not os.path.exists(path):
                print(f"Warning: Missing image -> {path}")
                return Image.new("RGB", (IMG_SIZE, IMG_SIZE), color="black")
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

        label = self.label_to_idx[row[self.label_column]]
        return left_img, right_img, torch.tensor(label, dtype=torch.long)

# =========================================================
# MODEL
# =========================================================
class DualViewClassifier(nn.Module):
    """
    Better fusion than simple concat:
    [left, right, |left-right|, left*right]
    """
    def __init__(self, backbone_name="resnet50", num_classes=2, dropout_rate=0.3):
        super().__init__()

        self.backbone = timm.create_model(backbone_name, pretrained=True, num_classes=0)

        with torch.no_grad():
            dummy = torch.zeros(1, 3, IMG_SIZE, IMG_SIZE)
            feat_dim = self.backbone(dummy).shape[1]

        self.feat_dim = feat_dim
        fused_dim = feat_dim * 4

        self.attention = nn.Sequential(
            nn.Linear(feat_dim * 2, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, 2),
            nn.Softmax(dim=1)
        )

        self.classifier = nn.Sequential(
            nn.Linear(fused_dim, 512),
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
        f_left = self.backbone(left)
        f_right = self.backbone(right)

        # soft attention for left/right importance
        pair = torch.cat([f_left, f_right], dim=1)
        weights = self.attention(pair)
        w_left = weights[:, 0].unsqueeze(1)
        w_right = weights[:, 1].unsqueeze(1)

        f_left_w = f_left * w_left
        f_right_w = f_right * w_right

        diff = torch.abs(f_left_w - f_right_w)
        prod = f_left_w * f_right_w

        fused = torch.cat([f_left_w, f_right_w, diff, prod], dim=1)
        logits = self.classifier(fused)

        if return_aux:
            aux_left = self.aux_left(f_left)
            aux_right = self.aux_right(f_right)
            return logits, aux_left, aux_right

        return logits

# =========================================================
# DATA PREP
# =========================================================
def load_and_filter_dataframe(csv_path, label_column, stage_name):
    df = pd.read_csv(csv_path)

    required_cols = [label_column, "left_image", "right_image"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Column '{col}' not found in {csv_path}")

    df = df.dropna(subset=required_cols).reset_index(drop=True)

    # Stage-specific filtering for more realistic training
    if stage_name == "stage1":
        # Keep all rows with binary labels
        pass

    elif stage_name == "stage2":
        # Species classification should run on fish rows only
        # Exclude "none", "non_fish", etc.
        invalid_species = {"none", "non_fish", "background", "no_fish", "not_fish", "unknown"}
        df = df[~df[label_column].astype(str).str.lower().isin(invalid_species)].reset_index(drop=True)

        # If binary label exists, keep fish rows only
        if "binary_label" in df.columns:
            fish_aliases = {"fish", "1", "true", "yes"}
            mask = df["binary_label"].astype(str).str.lower().isin(fish_aliases)
            if mask.sum() > 0:
                df = df[mask].reset_index(drop=True)

    elif stage_name == "stage3":
        # Grade classification must only train on A/B/C fish
        valid_grades = {"A", "B", "C"}
        df = df[df[label_column].astype(str).isin(valid_grades)].reset_index(drop=True)

        # If species label exists, exclude none
        if "species_label" in df.columns:
            df = df[df["species_label"].astype(str).str.lower() != "none"].reset_index(drop=True)

        # If binary label exists, keep fish rows only
        if "binary_label" in df.columns:
            fish_aliases = {"fish", "1", "true", "yes"}
            mask = df["binary_label"].astype(str).str.lower().isin(fish_aliases)
            if mask.sum() > 0:
                df = df[mask].reset_index(drop=True)

    if len(df) == 0:
        raise ValueError(f"No rows left after filtering for {stage_name} from {csv_path}")

    print(f"\nFiltered rows for {stage_name}: {len(df)}")
    print(f"Label counts: {dict(sorted(Counter(df[label_column]).items()))}")

    return df


def create_train_val_test_splits(csv_path, label_column, stage_name):
    df = load_and_filter_dataframe(csv_path, label_column, stage_name)

    # Need at least 2 samples per class for stratify to work well
    label_counts = Counter(df[label_column])
    rare_classes = [k for k, v in label_counts.items() if v < 3]
    if rare_classes:
        raise ValueError(
            f"These classes have too few samples (<3): {rare_classes}. "
            f"Add more data or remove these classes before training."
        )

    train_df, temp_df = train_test_split(
        df,
        test_size=(VAL_SIZE + TEST_SIZE),
        stratify=df[label_column],
        random_state=SEED
    )

    val_df, test_df = train_test_split(
        temp_df,
        test_size=TEST_SIZE / (VAL_SIZE + TEST_SIZE),
        stratify=temp_df[label_column],
        random_state=SEED
    )

    print("\nSplit sizes:")
    print(f"  Train: {len(train_df)}")
    print(f"  Val:   {len(val_df)}")
    print(f"  Test:  {len(test_df)}")

    return train_df, val_df, test_df

# =========================================================
# METRICS
# =========================================================
def compute_metrics(all_labels, all_preds):
    acc = (np.array(all_labels) == np.array(all_preds)).mean()
    bal_acc = balanced_accuracy_score(all_labels, all_preds)
    macro_f1 = f1_score(all_labels, all_preds, average="macro")
    weighted_f1 = f1_score(all_labels, all_preds, average="weighted")
    return acc, bal_acc, macro_f1, weighted_f1

# =========================================================
# TRAIN / VALIDATE
# =========================================================
def train_epoch(model, loader, optimizer, criterion, scaler):
    model.train()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0

    for left, right, labels in loader:
        left = left.to(DEVICE)
        right = right.to(DEVICE)
        labels = labels.to(DEVICE)

        optimizer.zero_grad(set_to_none=True)

        if USE_NEW_AMP:
            with autocast(device_type="cuda", enabled=(DEVICE == "cuda")):
                logits, aux_left, aux_right = model(left, right, return_aux=True)
                main_loss = criterion(logits, labels)
                aux_loss_left = criterion(aux_left, labels)
                aux_loss_right = criterion(aux_right, labels)
                loss = main_loss + 0.2 * aux_loss_left + 0.2 * aux_loss_right
        else:
            with autocast(enabled=(DEVICE == "cuda")):
                logits, aux_left, aux_right = model(left, right, return_aux=True)
                main_loss = criterion(logits, labels)
                aux_loss_left = criterion(aux_left, labels)
                aux_loss_right = criterion(aux_right, labels)
                loss = main_loss + 0.2 * aux_loss_left + 0.2 * aux_loss_right

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

        preds = logits.argmax(dim=1)
        total_loss += loss.item() * labels.size(0)
        total_correct += (preds == labels).sum().item()
        total_samples += labels.size(0)

    return total_loss / total_samples, total_correct / total_samples


def validate_epoch(model, loader, criterion):
    model.eval()
    total_loss = 0.0
    total_samples = 0
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for left, right, labels in loader:
            left = left.to(DEVICE)
            right = right.to(DEVICE)
            labels = labels.to(DEVICE)

            if USE_NEW_AMP:
                with autocast(device_type="cuda", enabled=(DEVICE == "cuda")):
                    logits = model(left, right)
                    loss = criterion(logits, labels)
            else:
                with autocast(enabled=(DEVICE == "cuda")):
                    logits = model(left, right)
                    loss = criterion(logits, labels)

            preds = logits.argmax(dim=1)

            total_loss += loss.item() * labels.size(0)
            total_samples += labels.size(0)

            all_preds.extend(preds.cpu().numpy().tolist())
            all_labels.extend(labels.cpu().numpy().tolist())

    acc, bal_acc, macro_f1, weighted_f1 = compute_metrics(all_labels, all_preds)

    return (
        total_loss / total_samples,
        acc,
        bal_acc,
        macro_f1,
        weighted_f1,
        all_preds,
        all_labels,
    )

# =========================================================
# OPTIMIZER
# =========================================================
def build_optimizer(model, backbone_frozen=True):
    if backbone_frozen:
        for param in model.backbone.parameters():
            param.requires_grad = False

        params = filter(lambda p: p.requires_grad, model.parameters())
        optimizer = AdamW(params, lr=HEAD_LR, weight_decay=WEIGHT_DECAY)
    else:
        for param in model.backbone.parameters():
            param.requires_grad = True

        optimizer = AdamW(
            [
                {"params": model.backbone.parameters(), "lr": BACKBONE_LR},
                {"params": model.attention.parameters(), "lr": HEAD_LR},
                {"params": model.classifier.parameters(), "lr": HEAD_LR},
                {"params": model.aux_left.parameters(), "lr": HEAD_LR},
                {"params": model.aux_right.parameters(), "lr": HEAD_LR},
            ],
            weight_decay=WEIGHT_DECAY,
        )

    return optimizer

# =========================================================
# TRAIN STAGE
# =========================================================
def train_stage(csv_path, label_column, model_save_path, stage_name):
    print(f"\n{'=' * 90}")
    print(f"TRAINING {stage_name.upper()}")
    print(f"{'=' * 90}")

    train_df, val_df, test_df = create_train_val_test_splits(csv_path, label_column, stage_name)

    # For grading/color-sensitive task, use mild augmentation
    train_transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(5),
        transforms.ColorJitter(brightness=0.10, contrast=0.10, saturation=0.10, hue=0.02),
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

    train_dataset = FishDataset(train_df, label_column, transform=train_transform)
    val_dataset = FishDataset(val_df, label_column, transform=val_transform)
    test_dataset = FishDataset(test_df, label_column, transform=val_transform)

    num_classes = len(train_dataset.unique_labels)

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS,
        pin_memory=(DEVICE == "cuda"),
        drop_last=False,
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
        dropout_rate=DROPOUT_RATE
    ).to(DEVICE)

    # class-weighted loss only
    train_labels = [train_dataset.label_to_idx[val] for val in train_df[label_column].tolist()]
    class_counts = Counter(train_labels)

    class_weights = torch.tensor(
        [len(train_labels) / (num_classes * class_counts.get(i, 1)) for i in range(num_classes)],
        dtype=torch.float32,
        device=DEVICE
    )

    criterion = nn.CrossEntropyLoss(
        weight=class_weights,
        label_smoothing=LABEL_SMOOTHING
    )

    optimizer = build_optimizer(model, backbone_frozen=True)
    scheduler = ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=4
    )

    scaler = GradScaler(enabled=(DEVICE == "cuda"))

    # choose metric depending on stage
    if stage_name == "stage1":
        best_metric_name = "balanced_accuracy"
    else:
        best_metric_name = "macro_f1"

    best_metric = -1.0
    best_epoch = 0
    patience_counter = 0

    print("\nStarting training...")
    print("-" * 120)

    for epoch in range(1, EPOCHS + 1):
        if epoch == FREEZE_EPOCHS + 1:
            print(f"\n>>> Unfreezing backbone at epoch {epoch} <<<\n")
            optimizer = build_optimizer(model, backbone_frozen=False)
            scheduler = ReduceLROnPlateau(
                optimizer,
                mode="max",
                factor=0.5,
                patience=4
            )

        train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, scaler)
        val_loss, val_acc, val_bal_acc, val_macro_f1, val_weighted_f1, _, _ = validate_epoch(
            model, val_loader, criterion
        )

        current_metric = val_bal_acc if best_metric_name == "balanced_accuracy" else val_macro_f1
        scheduler.step(current_metric)

        print(
            f"Epoch {epoch:02d}/{EPOCHS} | "
            f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f} | "
            f"Val Bal Acc: {val_bal_acc:.4f} | Val Macro F1: {val_macro_f1:.4f} | "
            f"Val Weighted F1: {val_weighted_f1:.4f}"
        )

        if current_metric > best_metric:
            best_metric = current_metric
            best_epoch = epoch

            save_obj = {
                "model_state_dict": model.state_dict(),
                "backbone": BACKBONE,
                "img_size": IMG_SIZE,
                "num_classes": num_classes,
                "label_to_idx": train_dataset.label_to_idx,
                "idx_to_label": train_dataset.idx_to_label,
                "stage_name": stage_name,
                "label_column": label_column,
                "best_metric_name": best_metric_name,
                "best_metric_value": best_metric,
            }
            torch.save(save_obj, model_save_path)

            print(f"   New best model saved! ({best_metric_name}: {best_metric:.4f})")
            patience_counter = 0
        else:
            patience_counter += 1

        if patience_counter >= PATIENCE:
            print(f"\nEarly stopping triggered after epoch {epoch}")
            break

    print(f"\nBest epoch: {best_epoch} | Best {best_metric_name}: {best_metric:.4f}")

    # Load best model
    checkpoint = torch.load(model_save_path, map_location=DEVICE)
    model.load_state_dict(checkpoint["model_state_dict"])

    test_loss, test_acc, test_bal_acc, test_macro_f1, test_weighted_f1, test_preds, test_labels = validate_epoch(
        model, test_loader, criterion
    )

    print(f"\nTest Results for {stage_name}:")
    print(f"  Loss:        {test_loss:.4f}")
    print(f"  Accuracy:    {test_acc:.4f}")
    print(f"  Bal Acc:     {test_bal_acc:.4f}")
    print(f"  Macro F1:    {test_macro_f1:.4f}")
    print(f"  Weighted F1: {test_weighted_f1:.4f}")

    target_names = [train_dataset.idx_to_label[i] for i in range(num_classes)]

    print("\nConfusion Matrix:")
    print(confusion_matrix(test_labels, test_preds))

    print("\nClassification Report:")
    print(classification_report(test_labels, test_preds, target_names=target_names, digits=4))

    return model, train_dataset.label_to_idx, train_dataset.idx_to_label

# =========================================================
# MAIN
# =========================================================
def main():
    print("=" * 90)
    print("MULTI-STAGE FISH MODEL TRAINING")
    print("=" * 90)
    print(f"Device:      {DEVICE}")
    print(f"Backbone:    {BACKBONE}")
    print(f"IMG_SIZE:    {IMG_SIZE}")
    print(f"BATCH_SIZE:  {BATCH_SIZE}")
    print(f"EPOCHS:      {EPOCHS}")
    print(f"FREEZE_EPOCHS: {FREEZE_EPOCHS}")

    # -----------------------------
    # STAGE 1: fish vs non-fish
    # -----------------------------
    stage1_model, stage1_label_map, stage1_idx_map = train_stage(
        csv_path=STAGE1_TRAIN_CSV,
        label_column="binary_label",
        model_save_path=STAGE1_MODEL_PATH,
        stage_name="stage1"
    )

    # -----------------------------
    # STAGE 2: fish species only
    # -----------------------------
    stage2_model, stage2_label_map, stage2_idx_map = train_stage(
        csv_path=STAGE2_TRAIN_CSV,
        label_column="species_label",
        model_save_path=STAGE2_MODEL_PATH,
        stage_name="stage2"
    )

    # -----------------------------
    # STAGE 3: fish grade A/B/C only
    # -----------------------------
    stage3_model, stage3_label_map, stage3_idx_map = train_stage(
        csv_path=STAGE3_TRAIN_CSV,
        label_column="grade_label",
        model_save_path=STAGE3_MODEL_PATH,
        stage_name="stage3"
    )

    mappings = {
        "stage1": {"label_to_idx": stage1_label_map, "idx_to_label": stage1_idx_map},
        "stage2": {"label_to_idx": stage2_label_map, "idx_to_label": stage2_idx_map},
        "stage3": {"label_to_idx": stage3_label_map, "idx_to_label": stage3_idx_map},
    }
    torch.save(mappings, LABEL_MAPPINGS_PATH)

    print("\n" + "=" * 90)
    print("TRAINING COMPLETE")
    print("=" * 90)
    print(f"Stage 1 model: {STAGE1_MODEL_PATH}")
    print(f"Stage 2 model: {STAGE2_MODEL_PATH}")
    print(f"Stage 3 model: {STAGE3_MODEL_PATH}")
    print(f"Mappings:      {LABEL_MAPPINGS_PATH}")


if __name__ == "__main__":
    main()