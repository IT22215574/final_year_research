import os
import pickle
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from datetime import datetime

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "dataset", "fish_prices.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model", "model.pkl")

def detect_price_column(df):
    for col in df.columns:
        if "price" in col.lower():
            return col
    return None

def prepare_df(df):
    df.columns = df.columns.str.strip().str.replace("\n", " ").str.replace("\r", "")
    price_col = detect_price_column(df)
    if price_col is None:
        raise ValueError("No price column detected in dataset.")

    # ensure basic columns exist
    if "FishType" in df.columns:
        df["FishType"] = df["FishType"].fillna("Unknown")
    else:
        df["FishType"] = "Unknown"

    # --- clean price column first (ensure numeric) ---
    df[price_col] = pd.to_numeric(
        df[price_col].astype(str).str.replace(",", "").str.extract(r"([-0-9.]+)")[0],
        errors="coerce"
    )
    df = df.dropna(subset=[price_col])
    if df.empty:
        raise ValueError("Dataset is empty after cleaning.")

    # convert Date if present
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce", dayfirst=True)

    # Add lag feature PrevPrice after numeric price available
    sort_cols = [c for c in ["FishType", "Market", "Date"] if c in df.columns]
    if sort_cols:
        df = df.sort_values(by=sort_cols)
    df["PrevPrice"] = df.groupby([c for c in ["FishType", "Market"] if c in df.columns])[price_col].shift(1)
    df["PrevPrice"] = df["PrevPrice"].fillna(0.0)

    # add default numeric columns if missing
    for col in ["Temp_C", "Rainfall_mm", "FuelPrice_LKR", "DemandIndex", "Season", "PrevPrice"]:
        if col not in df.columns:
            df[col] = 0.0

    mappings = {}
    if "FishType" in df.columns:
        df["FishType"] = df["FishType"].astype(str).str.strip()
        df["FishType_cat"] = df["FishType"].astype("category")
        mappings["fishtypes"] = list(df["FishType_cat"].cat.categories)
        df["FishType_id"] = df["FishType_cat"].cat.codes
    else:
        mappings["fishtypes"] = []

    if "Market" in df.columns:
        df["Market"] = df["Market"].astype(str).str.strip()
        df["Market_cat"] = df["Market"].astype("category")
        mappings["markets"] = list(df["Market_cat"].cat.categories)
        df["Market_id"] = df["Market_cat"].cat.codes
    else:
        mappings["markets"] = []

    feature_cols = []
    if "FishType_id" in df.columns:
        feature_cols.append("FishType_id")
    if "Market_id" in df.columns:
        feature_cols.append("Market_id")
    for col in ["Temp_C", "Rainfall_mm", "FuelPrice_LKR", "DemandIndex", "Season", "PrevPrice"]:
        if col in df.columns:
            feature_cols.append(col)

    return df.reset_index(drop=True), price_col, mappings, feature_cols

def train_and_save():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    df, price_col, mappings, feature_cols = prepare_df(df)

    if df.empty or df.shape[0] < 2:
        raise ValueError("Not enough data to train model. Please add more rows.")

    if not feature_cols:
        raise ValueError("No feature columns available for training.")

    X = df[feature_cols].astype(float).fillna(0.0)
    y = df[price_col].astype(float)

    # --- time-aware split if Date exists ---
    test_size = 0.2 if df.shape[0] >= 5 else 0.5
    if "Date" in df.columns and df["Date"].notna().sum() > 0:
        df_sorted = df.sort_values("Date").reset_index(drop=True)
        split_idx = int(len(df_sorted) * (1 - test_size))
        X_train = df_sorted[feature_cols].iloc[:split_idx].astype(float).fillna(0.0)
        y_train = df_sorted[price_col].iloc[:split_idx].astype(float)
        X_test = df_sorted[feature_cols].iloc[split_idx:].astype(float).fillna(0.0)
        y_test = df_sorted[price_col].iloc[split_idx:].astype(float)
    else:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42, shuffle=True)

    model = RandomForestRegressor(n_estimators=200, random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"✅ Trained model. MAE: {mae:.2f}")

    # Save model + mappings
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    payload = {"model": model, "mappings": mappings, "feature_cols": feature_cols, "price_col": price_col}
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(payload, f)
    print(f"💾 Model + mappings saved to {MODEL_PATH}")

    # Log metrics
    metrics_path = os.path.join(BASE_DIR, "model", "metrics.log")
    os.makedirs(os.path.dirname(metrics_path), exist_ok=True)
    with open(metrics_path, "a") as log:
        log.write(f"{datetime.now().isoformat()} - MAE: {mae:.2f}\n")

if __name__ == "__main__":
    train_and_save()