"""
Fish Quality Grading - Multi-Stage Training Pipeline
Trains 3 models and converts them to ONNX format
Run this script directly from the train directory
"""

import os
import sys
import copy
import random
import warnings
from collections import Counter
from pathlib import Path

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
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.cuda.amp import autocast, GradScaler

import timm
import onnx
import onnxruntime as ort

warnings.filterwarnings("ignore")

# =========================================================
# CONFIGURATION
# =========================================================
# Get the data directory (parent of train)
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent

STAGE1_TRAIN_CSV = DATA_DIR / "stage1_train.csv"
STAGE2_TRAIN_CSV = DATA_DIR / "stage2_species_train.csv"
STAGE3_TRAIN_CSV = DATA_DIR / "stage3_grade_train.csv"

# Model paths
STAGE1_MODEL_PATH = SCRIPT_DIR / "Effecient_best1_binary_model.pth"
STAGE2_MODEL_PATH = SCRIPT_DIR / "Effecient_best1_species_model.pth"
STAGE3_MODEL_PATH = SCRIPT_DIR / "Effecient_best1_grade_model.pth"

# ONNX model paths
STAGE1_ONNX_PATH = SCRIPT_DIR / "Effecient_best1_binary_model.onnx"
STAGE2_ONNX_PATH = SCRIPT_DIR / "Effecient_best1_species_model.onnx"
STAGE3_ONNX_PATH = SCRIPT_DIR / "Effecient_best1_grade_model.onnx"

# Training parameters
IMG_SIZE = 224
BATCH_SIZE = 16
EPOCHS = 50
LR = 2e-4
NUM_WORKERS = 0
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

BACKBONE = "efficientnet_b0"
DROPOUT_RATE = 0.3
FREEZE_EPOCHS = 3
UNFREEZE_LR = 1e-4
WEIGHT_DECAY = 1e-4
LABEL_SMOOTHING = 0.1
PATIENCE = 15
VAL_SIZE = 0.15
TEST_SIZE = 0.15
SEED = 42

# Set seed for reproducibility
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if DEVICE == "cuda":
    torch.cuda.manual_seed_all(SEED)

print(f"\n{'='*80}")
print(f"Fish Quality Grading - Multi-Stage Training Pipeline")
print(f"{'='*80}")
print(f"Device: {DEVICE}")
print(f"Batch size: {BATCH_SIZE}")
print(f"Epochs: {EPOCHS}")
print(f"Backbone: {BACKBONE}")
print(f"Data directory: {DATA_DIR}")


# =========================================================
# DATASET CLASS
# =========================================================
class FishDataset(Dataset):
    def __init__(self, dataframe, label_column, transform=None):
        self.df = dataframe.reset_index(drop=True)
        self.label_column = label_column
        self.transform = transform
        
        # Create label mapping
        self.unique_labels = sorted(self.df[label_column].unique())
        self.label_to_idx = {label: idx for idx, label in enumerate(self.unique_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
        
        print(f"\nClasses: {self.unique_labels}")
        print(f"Class distribution: {dict(sorted(Counter(self.df[label_column]).items()))}")
    
    def __len__(self):
        return len(self.df)
    
    def _load_image(self, path):
        try:
            if not os.path.exists(path):
                print(f"Warning: Image not found: {path}")
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
# MODEL ARCHITECTURE
# =========================================================
class DualViewClassifier(nn.Module):
    def __init__(self, backbone_name="efficientnet_b0", num_classes=2, dropout_rate=0.3):
        super().__init__()
        
        self.backbone = timm.create_model(backbone_name, pretrained=True, num_classes=0)
        
        with torch.no_grad():
            dummy = torch.zeros(1, 3, IMG_SIZE, IMG_SIZE)
            feat_dim = self.backbone(dummy).shape[1]
        
        self.feat_dim = feat_dim
        
        self.attention = nn.Sequential(
            nn.Linear(feat_dim * 2, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, 2),
            nn.Softmax(dim=1)
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
        f_left = self.backbone(left)
        f_right = self.backbone(right)
        
        fused = torch.cat([f_left, f_right], dim=1)
        
        weights = self.attention(fused)
        w_left = weights[:, 0].unsqueeze(1)
        w_right = weights[:, 1].unsqueeze(1)
        
        weighted_left = f_left * w_left
        weighted_right = f_right * w_right
        
        fused_weighted = torch.cat([weighted_left, weighted_right], dim=1)
        logits = self.classifier(fused_weighted)
        
        if return_aux:
            aux_left = self.aux_left(f_left)
            aux_right = self.aux_right(f_right)
            return logits, aux_left, aux_right
        
        return logits


# =========================================================
# TRAINING FUNCTIONS
# =========================================================
def create_train_val_test_splits(csv_path, label_column):
    """Create train/val/test splits from CSV"""
    df = pd.read_csv(csv_path)
    df = df.dropna(subset=[label_column, "left_image", "right_image"]).reset_index(drop=True)
    
    train_df, temp_df = train_test_split(
        df, 
        test_size=(VAL_SIZE + TEST_SIZE),
        stratify=df[label_column],
        random_state=SEED
    )
    
    val_df, test_df = train_test_split(
        temp_df,
        test_size=TEST_SIZE/(VAL_SIZE + TEST_SIZE),
        stratify=temp_df[label_column],
        random_state=SEED
    )
    
    print(f"\nSplit sizes:")
    print(f"  Train: {len(train_df)}")
    print(f"  Val: {len(val_df)}")
    print(f"  Test: {len(test_df)}")
    
    return train_df, val_df, test_df


def get_weighted_sampler(dataset):
    """Create weighted sampler for imbalanced data"""
    labels = [dataset.label_to_idx[dataset.df.iloc[i][dataset.label_column]] 
              for i in range(len(dataset))]
    
    class_counts = Counter(labels)
    weights = [1.0 / class_counts[label] for label in labels]
    
    return WeightedRandomSampler(weights=weights, num_samples=len(weights), replacement=True)


def train_epoch(model, loader, optimizer, criterion, scaler):
    """Train for one epoch"""
    model.train()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0
    
    for left, right, labels in loader:
        left = left.to(DEVICE)
        right = right.to(DEVICE)
        labels = labels.to(DEVICE)
        
        optimizer.zero_grad(set_to_none=True)
        
        with autocast(enabled=(DEVICE == "cuda")):
            logits, aux_left, aux_right = model(left, right, return_aux=True)
            
            main_loss = criterion(logits, labels)
            aux_loss_left = criterion(aux_left, labels)
            aux_loss_right = criterion(aux_right, labels)
            
            loss = main_loss + 0.3 * aux_loss_left + 0.3 * aux_loss_right
        
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        
        preds = logits.argmax(dim=1)
        total_loss += loss.item() * labels.size(0)
        total_correct += (preds == labels).sum().item()
        total_samples += labels.size(0)
    
    return total_loss / total_samples, total_correct / total_samples


def validate_epoch(model, loader, criterion):
    """Validate for one epoch"""
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for left, right, labels in loader:
            left = left.to(DEVICE)
            right = right.to(DEVICE)
            labels = labels.to(DEVICE)
            
            with autocast(enabled=(DEVICE == "cuda")):
                logits = model(left, right)
                loss = criterion(logits, labels)
            
            preds = logits.argmax(dim=1)
            
            total_loss += loss.item() * labels.size(0)
            total_correct += (preds == labels).sum().item()
            total_samples += labels.size(0)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    
    accuracy = total_correct / total_samples
    balanced_acc = balanced_accuracy_score(all_labels, all_preds)
    macro_f1 = f1_score(all_labels, all_preds, average="macro")
    
    return total_loss / total_samples, accuracy, balanced_acc, macro_f1, all_preds, all_labels


def convert_to_onnx(pytorch_model, onnx_path, num_classes):
    """Convert PyTorch model to ONNX format"""
    print(f"\nConverting model to ONNX: {onnx_path}")
    
    pytorch_model.eval()
    
    # Create dummy inputs
    dummy_left = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(DEVICE)
    dummy_right = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(DEVICE)
    
    # Export to ONNX
    torch.onnx.export(
        pytorch_model,
        (dummy_left, dummy_right),
        str(onnx_path),
        input_names=['left_image', 'right_image'],
        output_names=['logits'],
        dynamic_axes={
            'left_image': {0: 'batch_size'},
            'right_image': {0: 'batch_size'},
            'logits': {0: 'batch_size'}
        },
        opset_version=14,
        do_constant_folding=True,
        verbose=False
    )
    
    # Verify the ONNX model
    onnx_model = onnx.load(str(onnx_path))
    onnx.checker.check_model(onnx_model)
    
    print(f"✓ ONNX model saved successfully: {onnx_path}")
    print(f"✓ ONNX model verified successfully")
    
    # Test inference with ONNX Runtime
    try:
        sess = ort.InferenceSession(str(onnx_path))
        test_input_left = np.random.randn(1, 3, IMG_SIZE, IMG_SIZE).astype(np.float32)
        test_input_right = np.random.randn(1, 3, IMG_SIZE, IMG_SIZE).astype(np.float32)
        
        outputs = sess.run(
            None,
            {'left_image': test_input_left, 'right_image': test_input_right}
        )
        print(f"✓ ONNX model inference test passed. Output shape: {outputs[0].shape}")
    except Exception as e:
        print(f"⚠ Warning during ONNX inference test: {e}")


def train_stage(csv_path, label_column, model_save_path, onnx_save_path, stage_name):
    """Train a single stage"""
    print(f"\n{'='*80}")
    print(f"TRAINING STAGE {stage_name}")
    print(f"{'='*80}")
    
    # Check if CSV exists
    if not os.path.exists(csv_path):
        print(f"⚠ Warning: CSV file not found: {csv_path}")
        print(f"Skipping {stage_name}...")
        return None, {}, {}
    
    # Create splits
    train_df, val_df, test_df = create_train_val_test_splits(csv_path, label_column)
    
    # Transforms
    train_transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    # Datasets
    train_dataset = FishDataset(train_df, label_column, transform=train_transform)
    val_dataset = FishDataset(val_df, label_column, transform=val_transform)
    test_dataset = FishDataset(test_df, label_column, transform=val_transform)
    
    num_classes = len(train_dataset.unique_labels)
    
    # DataLoaders
    sampler = get_weighted_sampler(train_dataset)
    train_loader = DataLoader(
        train_dataset, batch_size=BATCH_SIZE, sampler=sampler,
        num_workers=NUM_WORKERS, pin_memory=(DEVICE == "cuda"), drop_last=True
    )
    val_loader = DataLoader(
        val_dataset, batch_size=BATCH_SIZE, shuffle=False,
        num_workers=NUM_WORKERS, pin_memory=(DEVICE == "cuda")
    )
    test_loader = DataLoader(
        test_dataset, batch_size=BATCH_SIZE, shuffle=False,
        num_workers=NUM_WORKERS, pin_memory=(DEVICE == "cuda")
    )
    
    # Model
    model = DualViewClassifier(
        backbone_name=BACKBONE,
        num_classes=num_classes,
        dropout_rate=DROPOUT_RATE
    ).to(DEVICE)
    
    # Freeze backbone initially
    for param in model.backbone.parameters():
        param.requires_grad = False
    
    # Loss with class weights
    labels = [train_dataset.label_to_idx[train_df.iloc[i][label_column]] 
              for i in range(len(train_df))]
    class_counts = Counter(labels)
    class_weights = torch.tensor([
        len(labels) / (num_classes * class_counts.get(i, 1)) 
        for i in range(num_classes)
    ], dtype=torch.float32).to(DEVICE)
    
    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=LABEL_SMOOTHING)
    
    # Optimizer (only trainable params)
    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LR, weight_decay=WEIGHT_DECAY
    )
    scheduler = ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=5)
    scaler = GradScaler(enabled=(DEVICE == "cuda"))
    
    # Training loop
    best_val_balanced_acc = 0.0
    best_epoch = 0
    patience_counter = 0
    
    print("\nStarting training...")
    print("-" * 100)
    
    for epoch in range(1, EPOCHS + 1):
        # Unfreeze backbone after FREEZE_EPOCHS
        if epoch == FREEZE_EPOCHS + 1:
            for param in model.backbone.parameters():
                param.requires_grad = True
            
            optimizer = AdamW(model.parameters(), lr=UNFREEZE_LR, weight_decay=WEIGHT_DECAY)
            scheduler = ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=5)
            print(f"\n>>> Backbone unfrozen at epoch {epoch} <<<\n")
        
        # Train and validate
        train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, scaler)
        val_loss, val_acc, val_bal_acc, val_f1, _, _ = validate_epoch(model, val_loader, criterion)
        
        scheduler.step(val_bal_acc)
        
        print(f"Epoch {epoch:02d}/{EPOCHS} | Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} | Val Bal Acc: {val_bal_acc:.4f} | "
              f"Val F1: {val_f1:.4f}")
        
        # Save best model
        if val_bal_acc > best_val_balanced_acc:
            best_val_balanced_acc = val_bal_acc
            best_epoch = epoch
            torch.save(model.state_dict(), str(model_save_path))
            print(f"   New best model saved! (Bal Acc: {val_bal_acc:.4f})")
            patience_counter = 0
        else:
            patience_counter += 1
        
        if patience_counter >= PATIENCE:
            print(f"\nEarly stopping triggered after {epoch} epochs")
            break
    
    print(f"\nBest model from epoch {best_epoch} with Val Balanced Acc: {best_val_balanced_acc:.4f}")
    
    # Test evaluation
    model.load_state_dict(torch.load(str(model_save_path), map_location=DEVICE))
    test_loss, test_acc, test_bal_acc, test_f1, test_preds, test_labels = validate_epoch(
        model, test_loader, criterion
    )
    
    print(f"\nTest Results - Loss: {test_loss:.4f}, Acc: {test_acc:.4f}, "
          f"Bal Acc: {test_bal_acc:.4f}, F1: {test_f1:.4f}")
    
    # Classification report
    target_names = [train_dataset.idx_to_label[i] for i in range(num_classes)]
    print("\nClassification Report:")
    print(classification_report(test_labels, test_preds, target_names=target_names, digits=4))
    
    # Convert to ONNX
    convert_to_onnx(model, onnx_save_path, num_classes)
    
    return model, train_dataset.label_to_idx, train_dataset.idx_to_label


# =========================================================
# MAIN EXECUTION
# =========================================================
if __name__ == "__main__":
    # Verify CSV files exist
    print("\nVerifying CSV files...")
    for csv_path in [STAGE1_TRAIN_CSV, STAGE2_TRAIN_CSV, STAGE3_TRAIN_CSV]:
        status = "✓" if csv_path.exists() else "✗"
        print(f"  {status} {csv_path.name}")
    
    # Train Stage 1: Binary Classification
    stage1_model, stage1_label_map, stage1_idx_map = train_stage(
        csv_path=str(STAGE1_TRAIN_CSV),
        label_column="binary_label",
        model_save_path=str(STAGE1_MODEL_PATH),
        onnx_save_path=str(STAGE1_ONNX_PATH),
        stage_name="1 - BINARY CLASSIFICATION"
    )
    
    # Train Stage 2: Species Classification
    stage2_model, stage2_label_map, stage2_idx_map = train_stage(
        csv_path=str(STAGE2_TRAIN_CSV),
        label_column="species_label",
        model_save_path=str(STAGE2_MODEL_PATH),
        onnx_save_path=str(STAGE2_ONNX_PATH),
        stage_name="2 - SPECIES CLASSIFICATION"
    )
    
    # Train Stage 3: Grade Classification
    stage3_model, stage3_label_map, stage3_idx_map = train_stage(
        csv_path=str(STAGE3_TRAIN_CSV),
        label_column="grade_label",
        model_save_path=str(STAGE3_MODEL_PATH),
        onnx_save_path=str(STAGE3_ONNX_PATH),
        stage_name="3 - GRADE CLASSIFICATION"
    )
    
    # Save label mappings for inference
    mappings = {
        "stage1": {"label_to_idx": stage1_label_map, "idx_to_label": stage1_idx_map},
        "stage2": {"label_to_idx": stage2_label_map, "idx_to_label": stage2_idx_map},
        "stage3": {"label_to_idx": stage3_label_map, "idx_to_label": stage3_idx_map},
    }
    torch.save(mappings, SCRIPT_DIR / "label_mappings.pth")
    
    print("\n" + "="*80)
    print("TRAINING COMPLETE!")
    print("="*80)
    print(f"\nGenerated files:")
    print(f"  ✓ {STAGE1_MODEL_PATH.name}")
    print(f"  ✓ {STAGE1_ONNX_PATH.name}")
    print(f"  ✓ {STAGE2_MODEL_PATH.name}")
    print(f"  ✓ {STAGE2_ONNX_PATH.name}")
    print(f"  ✓ {STAGE3_MODEL_PATH.name}")
    print(f"  ✓ {STAGE3_ONNX_PATH.name}")
    print(f"  ✓ label_mappings.pth")
