import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

DATA_PATH = "data/fuel_training_dataset.csv" # <-- your real file
MODEL_PATH = os.path.join("models", "fuel_model.pkl")

FEATURES = [
    "distanceKm",
    "speed",
    "engineHP",
    "fishingHours",
    "weatherSeverityIndex",
]
TARGET = "fuelUsedLiters"

def main():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    # keep only needed columns (ignore createdAt)
    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in CSV: {missing}. Found: {list(df.columns)}")

    # Convert to numeric safely
    for c in FEATURES + [TARGET]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # Drop NaNs
    df = df.dropna(subset=FEATURES + [TARGET])

    # IMPORTANT: keep only real (logged) trips
    df = df[df[TARGET] > 0]

    print("✅ Rows used for training:", len(df))
    if len(df) < 10:
        print("⚠️ Too few real rows. Add more trips with actual fuel logs for better ML.")

    X = df[FEATURES]
    y = df[TARGET]

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42
    )

    # Train
    model = RandomForestRegressor(
        n_estimators=300,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Evaluate
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"✅ MAE (liters): {mae:.2f}")

    # Save where FastAPI loads
    os.makedirs("models", exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print("✅ Model saved as:", MODEL_PATH)

if __name__ == "__main__":
    main()