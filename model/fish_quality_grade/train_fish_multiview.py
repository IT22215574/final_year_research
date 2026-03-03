import pandas as pd
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms

import timm
from torch.amp import autocast, GradScaler  # NEW AMP API


# -----------------------------
# CONFIG (MEMORY SAFE)
# -----------------------------
TRAIN_CSV = "train.csv"
VAL_CSV   = "val.csv"
TEST_CSV  = "test.csv"

IMG_SIZE = 160
BATCH_SIZE = 4      # if still heavy, set 2
EPOCHS = 20
LR = 3e-4
NUM_WORKERS = 0     # recommended for Windows

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Your real labels:
# tuna: A/B/C
# makerel: B/C (NO A)
CLASS_TO_IDX = {
    "tuna_A": 0,
    "tuna_B": 1,
    "tuna_C": 2,
    "makerel_B": 3,
    "makerel_C": 4,
}
IDX_TO_CLASS = {v: k for k, v in CLASS_TO_IDX.items()}


# -----------------------------
# DATASET
# -----------------------------
class FishPairDataset(Dataset):
    def __init__(self, csv_path, transform=None):
        self.df = pd.read_csv(csv_path)
        self.transform = transform

        self.df["label"] = self.df["species"].astype(str) + "_" + self.df["grade"].astype(str)

        valid = set(CLASS_TO_IDX.keys())
        before = len(self.df)
        self.df = self.df[self.df["label"].isin(valid)].reset_index(drop=True)
        after = len(self.df)

        if after < before:
            print(f"[INFO] Filtered out {before - after} invalid-label rows from {csv_path}")

        if len(self.df) == 0:
            raise ValueError(f"No valid rows found in {csv_path}. Check labels/species/grade columns.")

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]

        left_path = row["left_image"]
        right_path = row["right_image"]
        label_name = row["label"]

        left_img = Image.open(left_path).convert("RGB")
        right_img = Image.open(right_path).convert("RGB")

        if self.transform:
            left_img = self.transform(left_img)
            right_img = self.transform(right_img)

        y = CLASS_TO_IDX[label_name]
        return left_img, right_img, torch.tensor(y, dtype=torch.long)


# -----------------------------
# MODEL (Two-branch + fusion)
# -----------------------------
class MultiViewClassifier(nn.Module):
    def __init__(self, backbone_name="mobilenetv3_large_100", num_classes=5, img_size=160):
        super().__init__()
        self.backbone = timm.create_model(backbone_name, pretrained=True, num_classes=0)

        # IMPORTANT: infer actual feature dim using a dummy forward
        self.feat_dim = self._infer_feat_dim(img_size)

        self.classifier = nn.Sequential(
            nn.Linear(self.feat_dim * 2, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )

    def _infer_feat_dim(self, img_size: int) -> int:
        self.backbone.eval()
        with torch.no_grad():
            dummy = torch.zeros(1, 3, img_size, img_size)
            out = self.backbone(dummy)
            # out shape: (1, feat_dim)
            return out.shape[1]

    def forward(self, left, right):
        f1 = self.backbone(left)
        f2 = self.backbone(right)
        fused = torch.cat([f1, f2], dim=1)
        return self.classifier(fused)


# -----------------------------
# TRAIN / EVAL (AMP)
# -----------------------------
def run_epoch(model, loader, optimizer=None, scaler=None):
    train_mode = optimizer is not None
    model.train(train_mode)
    criterion = nn.CrossEntropyLoss()

    total_loss = 0.0
    total_correct = 0
    total = 0

    for left, right, y in loader:
        left, right, y = left.to(DEVICE), right.to(DEVICE), y.to(DEVICE)

        if train_mode:
            optimizer.zero_grad(set_to_none=True)

            with autocast(device_type="cuda"):
                logits = model(left, right)
                loss = criterion(logits, y)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            with torch.no_grad():
                with autocast(device_type="cuda"):
                    logits = model(left, right)
                    loss = criterion(logits, y)

        total_loss += loss.item() * y.size(0)
        preds = logits.argmax(dim=1)
        total_correct += (preds == y).sum().item()
        total += y.size(0)

    return total_loss / total, total_correct / total


@torch.no_grad()
def predict_all(model, loader):
    model.eval()
    all_preds, all_true = [], []
    for left, right, y in loader:
        left, right = left.to(DEVICE), right.to(DEVICE)
        with autocast(device_type="cuda"):
            logits = model(left, right)
        preds = logits.argmax(dim=1).cpu().tolist()
        all_preds.extend(preds)
        all_true.extend(y.tolist())
    return all_true, all_preds


# -----------------------------
# MAIN
# -----------------------------
def main():
    train_tf = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.485, 0.456, 0.406),
                             std=(0.229, 0.224, 0.225)),
    ])

    val_tf = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.485, 0.456, 0.406),
                             std=(0.229, 0.224, 0.225)),
    ])

    train_ds = FishPairDataset(TRAIN_CSV, transform=train_tf)
    val_ds   = FishPairDataset(VAL_CSV, transform=val_tf)
    test_ds  = FishPairDataset(TEST_CSV, transform=val_tf)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS)
    val_loader   = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS)
    test_loader  = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS)

    model = MultiViewClassifier(
        backbone_name="mobilenetv3_large_100",
        num_classes=5,
        img_size=IMG_SIZE
    ).to(DEVICE)

    optimizer = torch.optim.AdamW(model.parameters(), lr=LR)
    scaler = GradScaler("cuda")

    best_val_acc = 0.0
    best_path = "best_fish_model.pt"

    print("Device:", DEVICE)
    print("Train samples:", len(train_ds), "Val samples:", len(val_ds), "Test samples:", len(test_ds))
    print("Backbone feature dim:", model.feat_dim)

    for epoch in range(1, EPOCHS + 1):
        tr_loss, tr_acc = run_epoch(model, train_loader, optimizer=optimizer, scaler=scaler)
        va_loss, va_acc = run_epoch(model, val_loader, optimizer=None, scaler=scaler)

        print(f"Epoch {epoch:02d}/{EPOCHS} | "
              f"train loss {tr_loss:.4f} acc {tr_acc:.4f} | "
              f"val loss {va_loss:.4f} acc {va_acc:.4f}")

        if va_acc > best_val_acc:
            best_val_acc = va_acc
            torch.save(model.state_dict(), best_path)
            print("Saved best model:", best_path)

    # Test evaluation
    model.load_state_dict(torch.load(best_path, map_location=DEVICE))
    y_true, y_pred = predict_all(model, test_loader)

    print("\nTEST RESULTS")
    print("Confusion matrix:\n", confusion_matrix(y_true, y_pred))
    target_names = [IDX_TO_CLASS[i] for i in range(len(IDX_TO_CLASS))]
    print("\nClassification report:")
    print(classification_report(y_true, y_pred, target_names=target_names))


if __name__ == "__main__":
    main()