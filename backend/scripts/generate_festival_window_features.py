import pandas as pd
from pathlib import Path
import numpy as np

def generate_festival_window_features():

    # -------------------------------------------------
    # PATH SETUP
    # -------------------------------------------------
    SCRIPT_DIR = Path(__file__).parent
    BACKEND_DIR = SCRIPT_DIR.parent

    DATA_PATH = BACKEND_DIR / "dataset" / "processed" / "catch_volume_features.csv"
    FESTIVALS_PATH = BACKEND_DIR / "dataset" / "raw" / "festivals" / "festivals_2021_2025.csv"

    OUTPUT_PATH = BACKEND_DIR / "dataset" / "processed" / "festival_window_features.csv"

    print("\n" + "="*70)
    print("🔄 GENERATING OPTIMIZED FESTIVAL WINDOW FEATURES")
    print("="*70)

    if not DATA_PATH.exists():
        print(f"❌ Missing input file: {DATA_PATH}")
        return

    if not FESTIVALS_PATH.exists():
        print(f"❌ Missing festival file: {FESTIVALS_PATH}")
        return

    # -------------------------------------------------
    # LOAD DATA
    # -------------------------------------------------
    df = pd.read_csv(DATA_PATH)
    festivals_df = pd.read_csv(FESTIVALS_PATH)

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    festivals_df["festival_date"] = pd.to_datetime(festivals_df["festival_date"], errors="coerce")

    df.dropna(subset=["date"], inplace=True)
    festivals_df.dropna(subset=["festival_date"], inplace=True)

    print(f"✅ Price rows loaded: {len(df)}")
    print(f"✅ Festival dates loaded: {len(festivals_df)}")

    # -------------------------------------------------
    # FESTIVAL TYPE WEIGHTING
    # -------------------------------------------------
    BIG_FESTIVALS = [
        "SinhalaNewYear", "TamilNewYear",
        "Vesak", "Poson",
        "Eid", "Christmas"
    ]

    festivals_df["festival_weight"] = np.where(
        festivals_df["festival_name"].str.contains(
            "|".join(BIG_FESTIVALS), case=False, na=False
        ),
        2,  # BIG FESTIVAL
        1   # NORMAL FESTIVAL
    )

    festivals_df["is_poya"] = festivals_df["festival_name"].str.contains("poya", case=False).astype(int)

    # -------------------------------------------------
    # EXPAND FESTIVAL WINDOWS (±30 DAYS)
    # -------------------------------------------------
    expanded_rows = []

    for _, row in festivals_df.iterrows():
        for offset in range(-30, 31):
            expanded_rows.append({
                "date": row["festival_date"] + pd.Timedelta(days=offset),
                "festival_name": row["festival_name"],
                "festival_weight": row["festival_weight"],
                "is_poya": row["is_poya"],
                "days_from_festival": offset
            })

    festival_window_df = pd.DataFrame(expanded_rows)

    # -------------------------------------------------
    # AGGREGATE PER DAY
    # -------------------------------------------------
    daily_fest = festival_window_df.groupby("date").agg(
        in_festival_window=("festival_name", "count"),
        festival_weight=("festival_weight", "sum"),
        is_poya=("is_poya", "max"),
        min_days_from_festival=("days_from_festival", "min")
    ).reset_index()

    # -------------------------------------------------
    # MERGE WITH PRICE DATA
    # -------------------------------------------------
    final_df = df.merge(daily_fest, on="date", how="left")

    final_df.fillna({
        "in_festival_window": 0,
        "festival_weight": 0,
        "is_poya": 0,
        "min_days_from_festival": 999
    }, inplace=True)

    # -------------------------------------------------
    # CREATE ML SIGNAL FEATURES
    # -------------------------------------------------
    final_df["is_pre_festival"] = ((final_df["min_days_from_festival"] < 0) & 
                                   (final_df["in_festival_window"] > 0)).astype(int)

    final_df["is_festival_day"] = (final_df["min_days_from_festival"] == 0).astype(int)

    final_df["is_post_festival"] = ((final_df["min_days_from_festival"] > 0) & 
                                    (final_df["in_festival_window"] > 0)).astype(int)

    # 🔥 FINAL POWER FEATURE (PRICE DIRECTION FORCE)
    final_df["festival_price_pressure"] = (
        final_df["festival_weight"]
        + final_df["is_festival_day"]*2
        - final_df["is_poya"]*3
    )

    # -------------------------------------------------
    # SAVE OUTPUT
    # -------------------------------------------------
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print("\n✅ OPTIMIZED FESTIVAL FEATURES GENERATED SUCCESSFULLY")
    print(f"📁 File saved to: {OUTPUT_PATH}")
    print(f"📊 Total rows: {len(final_df)}")
    print(f"🎯 Festival affected rows: {(final_df['in_festival_window'] > 0).sum()}")

if __name__ == "__main__":
    generate_festival_window_features()
