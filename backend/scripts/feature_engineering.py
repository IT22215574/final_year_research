# feature_engineering.py
import pandas as pd
from pathlib import Path

def add_features():
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent

    IN = backend_dir / "dataset" / "processed" / "festival_window_features.csv"
    OUT = backend_dir / "dataset" / "processed" / "features_dataset.csv"

    df = pd.read_csv(IN)
    df["date"] = pd.to_datetime(df["date"])

    # Time features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # Weather effect simulation
    if "rainfall" in df.columns:
        df["weather_effect"] = (df["rainfall"] > 10).astype(int)
    else:
        df["weather_effect"] = 0

    # Final fish price behavior signal
    df["price_behavior_signal"] = (
        df["weather_effect"] +
        df["poya_effect"] +
        df["festival_effect"]
    )

    df.to_csv(OUT, index=False)
    print("✅ Feature dataset ready:", OUT)

if __name__ == "__main__":
    add_features()
