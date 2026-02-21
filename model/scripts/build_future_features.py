import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

# Paths
backend_dir = Path(__file__).parent.parent
processed_dir = backend_dir / "dataset" / "processed"
forecast_path = processed_dir / "weather_forecast.csv"
festivals_path = backend_dir / "dataset" / "raw" / "festivals" / "festivals_2020_2026.csv"
out_path = processed_dir / "future_features.csv"


def load_forecast():
    if not forecast_path.exists():
        print(f"❌ Forecast file not found: {forecast_path}")
        return None
    df = pd.read_csv(forecast_path)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    return df


def aggregate_weather(forecast_df):
    agg = forecast_df.groupby("date").agg({
        "temp_c": "mean",
        "humidity": "mean",
        "wind_speed": "max",
        "rainfall": "sum",
        "bad_weather": "max"
    }).reset_index()
    agg = agg.rename(columns={
        "temp_c": "temp_c_mean",
        "humidity": "humidity_mean",
        "wind_speed": "wind_speed_max",
        "rainfall": "rainfall_sum",
        "bad_weather": "bad_weather_any"
    })
    return agg


def attach_festivals(df):
    if not festivals_path.exists():
        df["festival_name"] = "None"
        df["is_festival_day"] = 0
        df["days_to_festival"] = 999
        df["days_after_festival"] = 999
        df["before_festival_window"] = 0
        df["after_festival_window"] = 0
        return df

    fest_df = pd.read_csv(festivals_path)
    if "festival_date" in fest_df.columns:
        fest_df = fest_df.rename(columns={"festival_date": "date"})
    fest_df["date"] = pd.to_datetime(fest_df["date"], errors="coerce")
    fest_df = fest_df.dropna(subset=["date"])

    df = df.merge(fest_df, on="date", how="left", suffixes=("", "_fest"))
    if "festival_name_fest" in df.columns:
        df["festival_name"] = df["festival_name_fest"]
        df = df.drop(columns=["festival_name_fest"])
    df["festival_name"] = df["festival_name"].fillna("None")
    df["is_festival_day"] = (df["festival_name"] != "None").astype(int)

    window_size = 14
    df = df.sort_values("date")
    df["days_to_festival"] = 999
    df["days_after_festival"] = 999

    fest_dates = df[df["is_festival_day"] == 1]["date"].tolist()

    for fday in fest_dates:
        df["days_to_festival"] = df["days_to_festival"].where(
            (df["days_to_festival"] < (fday - df["date"]).dt.days) |
            ((fday - df["date"]).dt.days < 0),
            (fday - df["date"]).dt.days
        )
        df["days_after_festival"] = df["days_after_festival"].where(
            (df["days_after_festival"] < (df["date"] - fday).dt.days) |
            ((df["date"] - fday).dt.days < 0),
            (df["date"] - fday).dt.days
        )

    df["before_festival_window"] = df["days_to_festival"].between(1, window_size).astype(int)
    df["after_festival_window"] = df["days_after_festival"].between(1, window_size).astype(int)
    return df


def add_time_and_effects(df):
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["year"] = df["date"].dt.year
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["season"] = df["month"].apply(lambda x: 1 if x in [12,1,2] else 2 if x in [3,4,5] else 3 if x in [6,7,8] else 4)
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    rain_col = "rainfall_sum" if "rainfall_sum" in df.columns else ("rainfall" if "rainfall" in df.columns else None)
    if rain_col:
        df["weather_effect"] = (df[rain_col] > 10).astype(int)
    else:
        df["weather_effect"] = 0

    df["poya_effect"] = (
        df["festival_name"].str.lower().str.contains("poya", na=False) |
        df["festival_name"].str.lower().str.contains("full moon", na=False)
    ).astype(int)

    df["festival_effect"] = df["is_festival_day"]

    df["price_behavior_signal"] = df["weather_effect"] + df["poya_effect"] + df["festival_effect"]
    return df


def build_future_features():
    forecast_df = load_forecast()
    if forecast_df is None or forecast_df.empty:
        print("❌ No forecast data to build features")
        return

    weather_agg = aggregate_weather(forecast_df)
    df = weather_agg.copy()
    df = attach_festivals(df)
    df = add_time_and_effects(df)

    df.to_csv(out_path, index=False)
    print(f"✅ Future features saved: {out_path} ({len(df)} rows)")
    print(f"📋 Columns: {list(df.columns)}")


if __name__ == "__main__":
    build_future_features()
