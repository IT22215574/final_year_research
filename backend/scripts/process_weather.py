import pandas as pd
from pathlib import Path

def process_weather():
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent

    RAW = backend_dir / "dataset" / "raw" / "weather" / "weather_data.csv"
    OUT = backend_dir / "dataset" / "processed" / "weather_dataset.csv"

    if not RAW.exists():
        print("⚠ No raw weather data found")
        return

    df = pd.read_csv(RAW)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])

    # Simple weather severity rule
    df["bad_weather"] = 0
    df.loc[(df["humidity"] > 85) | (df["wind_speed"] > 7), "bad_weather"] = 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT, index=False)

    print("✅ Processed weather dataset created:", OUT)

if __name__ == "__main__":
    process_weather()
