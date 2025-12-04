# feature_engineering.py
import pandas as pd
from pathlib import Path
import sys

def add_features():
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    processed_folder = backend_dir / "dataset" / "processed"
    IN_FILE = processed_folder / "final_merged_dataset.csv"
    OUT_FILE = processed_folder / "features_dataset.csv"

    print("\n" + "="*60)
    print("Feature Engineering")
    print("="*60)

    if not IN_FILE.exists():
        print(f"\n❌ Input file not found: {IN_FILE}")
        print("Please run merge_all_data.py first!")
        return

    print(f"\n📁 Loading data from: {IN_FILE}")
    df = pd.read_csv(IN_FILE)
    print(f"✅ Loaded {len(df)} records")

    # Ensure date is datetime
    if "date" not in df.columns:
        print("❌ 'date' column not found in merged dataset. Aborting.")
        return

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)

    # --- Time features
    df["day_of_week"] = df["date"].dt.dayofweek   # Monday=0
    df["is_weekend"] = df["day_of_week"].isin([5,6]).astype(int)
    df["month"] = df["date"].dt.month
    df["year"] = df["date"].dt.year
    df["day"] = df["date"].dt.day

    # --- Holiday indicator
    # Check common holiday columns
    holiday_cols = [c for c in df.columns if "holiday" in c.lower() or "is_holiday" in c.lower()]
    if "is_holiday" in df.columns:
        df["is_holiday"] = df["is_holiday"].fillna(0).astype(int)
    elif holiday_cols:
        # use presence of holiday name/local as indicator
        col = holiday_cols[0]
        df["is_holiday"] = df[col].notna().astype(int)
    else:
        # fallback: no holiday info
        df["is_holiday"] = 0

    # --- Price columns detection (pick first price-like column)
    price_cols = [c for c in df.columns if "price" in c.lower() or c.lower() in ("price", "avg_price", "value")]
    if not price_cols:
        # try numeric columns that look like price (heuristic)
        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
        if numeric_cols:
            price_col = numeric_cols[0]
            print(f"⚠ No explicit price column found. Using numeric column '{price_col}' as price.")
        else:
            print("❌ No price-like column found in merged data. Feature engineering aborted.")
            return
    else:
        price_col = price_cols[0]
        print(f"ℹ Using price column '{price_col}' for lag/rolling features.")

    # Cast price col to numeric
    df[price_col] = pd.to_numeric(df[price_col], errors="coerce")

    # --- Lag features
    df["price_lag_1"] = df[price_col].shift(1)
    df["price_lag_7"] = df[price_col].shift(7)

    # --- Rolling / trend features
    df["price_roll_7"] = df[price_col].rolling(window=7, min_periods=1).mean()
    df["price_roll_14"] = df[price_col].rolling(window=14, min_periods=1).mean()
    df["price_diff_1"] = df[price_col].diff(1)
    df["price_pct_change_1"] = df[price_col].pct_change(1)

    # --- Fill missing values sensibly
    df = df.sort_values("date")
    df[price_col] = df[price_col].fillna(method="ffill").fillna(method="bfill")
    df = df.fillna(0)  # fallback fill zeros for other features

    # Save
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_FILE, index=False, encoding="utf-8-sig")

    print("\n✅ Feature dataset saved to:", OUT_FILE)
    print(f"📊 Rows: {len(df)} | Columns: {len(df.columns)}")

if __name__ == "__main__":
    try:
        add_features()
    except Exception as e:
        print("Feature engineering error:", e)
        sys.exit(1)
