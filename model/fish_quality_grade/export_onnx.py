import os
import io
import sys
import torch
import torch.nn as nn
import timm

# ---------------------------------------------------------
# Windows UTF-8 safe output
# ---------------------------------------------------------
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ---------------------------------------------------------
# CONFIG
# ---------------------------------------------------------
IMG_SIZE = 224
DEVICE = "cpu"   # export on cpu for compatibility

MODELS_TO_EXPORT = [
    {
        "name": "fish_detector",
        "weights_path": "best_model.pth",
        "onnx_path": "fish_detector.onnx",
        "num_classes": 2,
    },
    {
        "name": "species_classifier",
        "weights_path": "best_species_classifier.pth",
        "onnx_path": "species_classifier.onnx",
        "num_classes": 6,   # change if your species count is different
    },
    {
        "name": "grade_classifier",
        "weights_path": "best_grade_classifier.pth",
        "onnx_path": "grade_classifier.onnx",
        "num_classes": 3,
    },
]


# ---------------------------------------------------------
# MODEL ARCHITECTURE
# MUST MATCH YOUR LATEST TRAINING CODE
# ---------------------------------------------------------
class DualViewClassifier(nn.Module):
    def __init__(self, backbone_name="efficientnet_b0", num_classes=2, img_size=224, dropout_rate=0.35):
        super().__init__()

        self.backbone = timm.create_model(backbone_name, pretrained=False, num_classes=0)

        with torch.no_grad():
            dummy = torch.zeros(1, 3, img_size, img_size)
            feat_dim = self.backbone(dummy).shape[1]

        self.feat_dim = feat_dim

        self.view_gate = nn.Sequential(
            nn.Linear(feat_dim * 2, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, 2),
            nn.Softmax(dim=1),
        )

        self.classifier = nn.Sequential(
            nn.Linear(feat_dim * 2, 512),
            nn.LayerNorm(512),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_rate),

            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_rate * 0.8),

            nn.Linear(256, num_classes),
        )

        self.aux_left = nn.Linear(feat_dim, num_classes)
        self.aux_right = nn.Linear(feat_dim, num_classes)

    def forward(self, left, right):
        f1 = self.backbone(left)
        f2 = self.backbone(right)

        fused = torch.cat([f1, f2], dim=1)

        gates = self.view_gate(fused)
        g1 = gates[:, 0].unsqueeze(1)
        g2 = gates[:, 1].unsqueeze(1)

        weighted_f1 = f1 * g1
        weighted_f2 = f2 * g2
        fused_weighted = torch.cat([weighted_f1, weighted_f2], dim=1)

        logits = self.classifier(fused_weighted)
        return logits


# ---------------------------------------------------------
# SAFE LOAD
# ---------------------------------------------------------
def load_checkpoint(path):
    return torch.load(path, map_location="cpu")


# ---------------------------------------------------------
# EXPORT ONE MODEL
# ---------------------------------------------------------
def export_one_model(weights_path, onnx_path, num_classes, model_name):
    print("\n" + "=" * 70)
    print(f"EXPORTING: {model_name}")
    print("=" * 70)

    if not os.path.exists(weights_path):
        print(f"[ERROR] Weights file not found: {weights_path}")
        return False

    model = DualViewClassifier(
        backbone_name="efficientnet_b0",
        num_classes=num_classes,
        img_size=IMG_SIZE,
        dropout_rate=0.35,
    ).to(DEVICE)

    checkpoint = load_checkpoint(weights_path)

    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
    else:
        state_dict = checkpoint

    missing, unexpected = model.load_state_dict(state_dict, strict=False)

    if missing:
        print(f"[WARN] Missing keys: {len(missing)}")
        print(missing[:5])

    if unexpected:
        print(f"[WARN] Unexpected keys: {len(unexpected)}")
        print(unexpected[:5])

    model.eval()

    left = torch.randn(1, 3, IMG_SIZE, IMG_SIZE, device=DEVICE)
    right = torch.randn(1, 3, IMG_SIZE, IMG_SIZE, device=DEVICE)

    with torch.no_grad():
        output = model(left, right)
        print(f"Output shape: {tuple(output.shape)}")

    torch.onnx.export(
        model,
        (left, right),
        onnx_path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["left", "right"],
        output_names=["logits"],
        dynamic_axes={
            "left": {0: "batch_size"},
            "right": {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
    )

    size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f"[OK] Exported: {onnx_path}")
    print(f"File size: {size_mb:.2f} MB")
    return True


# ---------------------------------------------------------
# OPTIONAL VERIFY
# ---------------------------------------------------------
def verify_onnx(onnx_path):
    try:
        import onnx
        import onnxruntime as ort
        import numpy as np

        print(f"\nVerifying {onnx_path} ...")

        model = onnx.load(onnx_path)
        onnx.checker.check_model(model)

        session = ort.InferenceSession(onnx_path)
        left = np.random.randn(1, 3, IMG_SIZE, IMG_SIZE).astype("float32")
        right = np.random.randn(1, 3, IMG_SIZE, IMG_SIZE).astype("float32")

        outputs = session.run(["logits"], {"left": left, "right": right})
        print(f"[OK] Verified with ONNX Runtime. Output shape: {outputs[0].shape}")
        return True

    except ImportError:
        print("[INFO] Install onnx and onnxruntime to verify:")
        print("pip install onnx onnxruntime")
        return False
    except Exception as e:
        print(f"[ERROR] Verification failed for {onnx_path}: {e}")
        return False


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------
def main():
    results = []

    for item in MODELS_TO_EXPORT:
        ok = export_one_model(
            weights_path=item["weights_path"],
            onnx_path=item["onnx_path"],
            num_classes=item["num_classes"],
            model_name=item["name"],
        )
        results.append((item["onnx_path"], ok))

    print("\n" + "=" * 70)
    print("EXPORT SUMMARY")
    print("=" * 70)
    for path, ok in results:
        print(f"{path}: {'SUCCESS' if ok else 'FAILED'}")

    for path, ok in results:
        if ok:
            verify_onnx(path)


if __name__ == "__main__":
    main()