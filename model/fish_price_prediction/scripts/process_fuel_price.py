# process_fuel_price.py
# Loads the Fuel Price Excel, extracts LK (Lanka Kerosene) column,
# forward-fills it to a continuous daily time-series, and saves it
# as processed/fuel_price_daily.csv.

import pandas as pd
from pathlib import Path


def process_fuel_price():
    script_dir = Path(__file__).resolve().parent
    # Navigate: scripts/ → fish_price_prediction/ → model/ → final_year_research/ → Backend/
    project_root = script_dir.parent.parent.parent
    backend_dir = project_root / "Backend"
    
    fuel_xlsx = backend_dir / "dataset" / "raw" / "fuel_price" / "Fuel Price.xlsx"
    processed_dir = backend_dir / "dataset" / "processed"
    out_path = processed_dir / "fuel_price_daily.csv"

    processed_dir.mkdir(parents=True, exist_ok=True)

    if not fuel_xlsx.exists():
        print(f"❌ Fuel price file not found: {fuel_xlsx}")
        return

    print(f"📂 Loading fuel price data: {fuel_xlsx}")

    # ── Try reading the Excel.  The sheet may have different date-column names,
    #    so we probe a few rows first.
    try:
        df_raw = pd.read_excel(fuel_xlsx, sheet_name=0)
    except Exception as e:
        print(f"❌ Error reading Excel: {e}")
        return

    print(f"📋 Raw columns: {list(df_raw.columns)}")
    print(df_raw.head(5))

    # ── Normalise column names (strip whitespace, lower)
    df_raw.columns = [str(c).strip() for c in df_raw.columns]

    # ── Locate the date column (flexible matching)
    date_col = None
    for col in df_raw.columns:
        if col.lower() in ("date", "effective date", "effective_date", "period", "month"):
            date_col = col
            break
    if date_col is None:
        # Fallback: first column is usually the date
        date_col = df_raw.columns[0]
        print(f"⚠ Date column not detected – using first column: '{date_col}'")

    # ── Locate the LK (Lanka Kerosene) column
    lk_col = None
    for col in df_raw.columns:
        if "lk" in col.lower() or "kerosene" in col.lower():
            lk_col = col
            break
    if lk_col is None:
        print(f"❌ LK / Kerosene column not found.  Available columns: {list(df_raw.columns)}")
        return

    print(f"✅ Using date column  : '{date_col}'")
    print(f"✅ Using kerosene col : '{lk_col}'")

    # ── Keep only the two relevant columns and clean up
    df = df_raw[[date_col, lk_col]].copy()
    df.columns = ["effective_date", "lk_price"]

    df["effective_date"] = pd.to_datetime(df["effective_date"], errors="coerce")
    df["lk_price"] = pd.to_numeric(df["lk_price"], errors="coerce")

    df = df.dropna(subset=["effective_date", "lk_price"])
    df = df.sort_values("effective_date").reset_index(drop=True)

    print(f"✅ Valid fuel price records: {len(df)}")
    print(df.head(10))

    # ── Expand to daily granularity and forward-fill the price
    #    (because fuel prices only change on specific dates)
    if df.empty:
        print("❌ No valid fuel price rows after cleaning.")
        return

    date_start = df["effective_date"].min()
    date_end   = pd.Timestamp.today().normalize()  # up to today

    daily_index = pd.date_range(start=date_start, end=date_end, freq="D")
    daily_df = pd.DataFrame({"date": daily_index})

    # Left-merge: bring lk_price only on the effective dates, then ffill
    daily_df = daily_df.merge(
        df.rename(columns={"effective_date": "date"}),
        on="date",
        how="left"
    )
    daily_df["lk_price"] = daily_df["lk_price"].ffill()

    # Drop rows still NaN (dates before the first price record)
    daily_df = daily_df.dropna(subset=["lk_price"]).reset_index(drop=True)

    # ── Add derived fuel columns (1-day and 2-day lag, and daily price change)
    #    These are the "lag effect" features used during model training.
    daily_df = daily_df.sort_values("date").reset_index(drop=True)
    daily_df["lk_price_lag1"]   = daily_df["lk_price"].shift(1)    # yesterday's price
    daily_df["lk_price_lag2"]   = daily_df["lk_price"].shift(2)    # two-days-ago price
    daily_df["lk_price_change"] = daily_df["lk_price"].diff()      # daily change

    # Percentage change (handle 0 division)
    daily_df["lk_price_pct_change"] = daily_df["lk_price"].pct_change() * 100

    daily_df.to_csv(out_path, index=False)
    print(f"\n✅ Daily fuel price data saved: {out_path}")
    print(f"   Date range : {daily_df['date'].min().date()} → {daily_df['date'].max().date()}")
    print(f"   Total rows : {len(daily_df)}")
    print(daily_df.head(10))


if __name__ == "__main__":
    process_fuel_price()
