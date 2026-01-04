import pandas as pd
import numpy as np
import pickle
from pathlib import Path

backend_dir = Path(__file__).parent.parent
processed_dir = backend_dir / "dataset" / "processed"
models_dir = backend_dir / "models"

FUTURE_FEATURES = processed_dir / "future_features.csv"
FISH_NAMES = processed_dir / "fish_names.csv"
OUT_FILE = processed_dir / "future_price_predictions.csv"


def load_models():
    with open(models_dir / "rf_model.pkl", "rb") as f:
        rf = pickle.load(f)
    with open(models_dir / "gb_model.pkl", "rb") as f:
        gb = pickle.load(f)
    with open(models_dir / "feature_names.pkl", "rb") as f:
        feature_names = pickle.load(f)
    with open(models_dir / "le_sinhala.pkl", "rb") as f:
        le_sinhala = pickle.load(f)
    return rf, gb, feature_names, le_sinhala


def build_prediction_frame(future_df, fish_df, le_sinhala):
    # cross join fish with future dates
    future_df = future_df.copy()
    fish_df = fish_df.copy()

    # Encode fish names using trained encoder
    fish_df["fish_encoded"] = le_sinhala.transform(fish_df["sinhala_name"])

    future_df["key"] = 1
    fish_df["key"] = 1
    combined = future_df.merge(fish_df, on="key").drop(columns=["key"])
    return combined


def predict():
    if not FUTURE_FEATURES.exists():
        print(f"❌ Future features not found: {FUTURE_FEATURES}")
        return
    if not FISH_NAMES.exists():
        print(f"❌ Fish names not found: {FISH_NAMES}")
        return

    future_df = pd.read_csv(FUTURE_FEATURES)
    future_df["date"] = pd.to_datetime(future_df["date"], errors="coerce")
    future_df = future_df.dropna(subset=["date"])

    fish_df = pd.read_csv(FISH_NAMES)

    rf, gb, feature_names, le_sinhala = load_models()

    pred_df = build_prediction_frame(future_df, fish_df, le_sinhala)

    # Ensure all feature columns exist
    for col in feature_names:
        if col not in pred_df.columns:
            pred_df[col] = 0

    X = pred_df[feature_names].fillna(0)

    rf_pred = rf.predict(X)
    gb_pred = gb.predict(X)
    ensemble = (rf_pred + gb_pred) / 2

    pred_df["predicted_price"] = ensemble

    out_cols = ["date", "fish_id", "sinhala_name", "common_name", "predicted_price"]
    pred_df[out_cols].sort_values(["date", "fish_id"]).to_csv(OUT_FILE, index=False)

    print(f"✅ Future price predictions saved: {OUT_FILE} ({len(pred_df)} rows)")


if __name__ == "__main__":
    predict()
