# feature_engineering.py
import pandas as pd
from pathlib import Path
import re

def extract_fish_names_from_csv():
    """Extract fish names from all CSV files in raw/csv folder"""
    script_dir = Path(__file__).resolve().parent
    # Navigate: scripts/ → fish_price_prediction/ → model/ → final_year_research/
    project_root = script_dir.parent.parent.parent
    backend_dir = project_root / "model"
    raw_csv_dir = backend_dir / "dataset" / "raw" / "csv"
    processed_dir = backend_dir / "dataset" / "processed"
    
    fish_data = []
    
    # Read all CSV files
    csv_files = list(raw_csv_dir.glob("*.csv"))
    
    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file, skiprows=3)  # Skip header rows
            
            # Extract fish data (rows with Sinhala and Common names)
            for idx, row in df.iterrows():
                try:
                    # Column 0 is number, Column 1 is Sinhala name, Column 2 is Common name
                    fish_num = row.iloc[0]
                    sinhala_name = row.iloc[1]
                    common_name = row.iloc[2]
                    
                    # Check if valid fish entry
                    if (pd.notna(fish_num) and pd.notna(sinhala_name) and pd.notna(common_name) and
                        str(fish_num).isdigit() and fish_num != 'Sinhala Name'):
                        
                        fish_data.append({
                            'fish_id': int(fish_num),
                            'sinhala_name': str(sinhala_name).strip(),
                            'common_name': str(common_name).strip()
                        })
                except:
                    continue
        except Exception as e:
            print(f"⚠ Error reading {csv_file.name}: {e}")
    
    # Remove duplicates and sort
    if fish_data:
        fish_df = pd.DataFrame(fish_data)
        fish_df = fish_df.drop_duplicates(subset=['fish_id'])
        fish_df = fish_df.sort_values('fish_id')
        
        # Save fish names
        fish_names_path = processed_dir / "fish_names.csv"
        fish_df.to_csv(fish_names_path, index=False)
        
        print(f"✅ Extracted {len(fish_df)} unique fish species")
        print(f"📁 Fish names saved: {fish_names_path}")
        print(fish_df.head(10))
        
        return fish_df
    
    return None

def add_sri_lankan_seasons(df: "pd.DataFrame") -> "pd.DataFrame":
    """
    Assign Sri Lankan fishing seasons based on monsoon patterns.

    West Coast (Colombo, Negombo, Chilaw) – Waragam (Rough Season):
        South-West monsoon: May–September  →  is_waragam_west = 1
    East Coast (Trincomalee, Batticaloa)   – Waragam (Rough Season):
        North-East monsoon: October–January →  is_waragam_east = 1
    Awaragam (Calm / Open Season) = when neither west nor east waragam applies.

    Combined season label:
        0 = Awaragam  (open sea, abundant supply, lower prices)
        1 = Waragam-West  (rough SW monsoon, reduced supply)
        2 = Waragam-East  (rough NE monsoon, reduced supply)
    """
    month = df["date"].dt.month

    df["is_waragam_west"] = month.isin([5, 6, 7, 8, 9]).astype(int)
    df["is_waragam_east"] = month.isin([10, 11, 12, 1]).astype(int)
    df["is_awaragam"]     = (~month.isin([5, 6, 7, 8, 9, 10, 11, 12, 1])).astype(int)  # Feb-Apr

    # Consolidated numeric season (used by the ML model)
    # 0=Awaragam, 1=Waragam-West, 2=Waragam-East
    df["fishing_season"] = 0
    df.loc[df["is_waragam_west"] == 1, "fishing_season"] = 1
    df.loc[df["is_waragam_east"] == 1, "fishing_season"] = 2

    return df


def add_features():
    script_dir = Path(__file__).resolve().parent
    # Navigate: scripts/ → fish_price_prediction/ → model/ → final_year_research/
    project_root = script_dir.parent.parent.parent
    backend_dir = project_root / "model"
    processed_dir = backend_dir / "dataset" / "processed"

    IN = processed_dir / "merged_festival_features.csv"
    OUT = processed_dir / "features_dataset.csv"

    # Check if input file exists
    if not IN.exists():
        print(f"❌ Input file not found: {IN}")
        print("Please run generate_festival_window_features.py first.")
        return

    df = pd.read_csv(IN)
    df["date"] = pd.to_datetime(df["date"])

    # ── Time features ────────────────────────────────────────────────
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"]       = df["date"].dt.month
    df["year"]        = df["date"].dt.year
    df["week_of_year"]= df["date"].dt.isocalendar().week.astype(int)
    df["is_weekend"]  = df["day_of_week"].isin([5, 6]).astype(int)

    # Cyclical month encoding
    import numpy as np
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    # ── Sri Lankan fishing seasons ────────────────────────────────────
    df = add_sri_lankan_seasons(df)

    # Legacy rough-sea flag (kept for backward compatibility)
    df["is_rough_sea_season"] = (df["is_waragam_west"] | df["is_waragam_east"]).astype(int)

    # ── Weather effect ────────────────────────────────────────────────
    rain_col = ("rainfall_sum" if "rainfall_sum" in df.columns
                else ("rainfall" if "rainfall" in df.columns else None))
    if rain_col:
        df["weather_effect"] = (df[rain_col] > 10).astype(int)
    else:
        df["weather_effect"] = 0

    # ── Festival / Poya / Holiday features ───────────────────────────
    festival_name_col = "festival_name" if "festival_name" in df.columns else None

    df["is_poya"] = (
        df[festival_name_col].str.lower().str.contains("poya", na=False) |
        df[festival_name_col].str.lower().str.contains("full moon", na=False)
    ).astype(int) if festival_name_col else 0

    festival_day_col = ("is_festival_day" if "is_festival_day" in df.columns
                        else ("is_festival" if "is_festival" in df.columns else None))
    df["is_holiday"] = (
        (df["is_poya"] == 1) |
        (df[festival_day_col] == 1 if festival_day_col else False)
    ).astype(int)

    df["poya_effect"]    = df["is_poya"]
    df["festival_effect"]= df[festival_day_col] if festival_day_col else 0

    # ── Fuel price features ───────────────────────────────────────────
    # These arrive from the merge step already; just make sure NaN is filled
    for fuel_col in ["lk_price", "lk_price_lag1", "lk_price_lag2",
                     "lk_price_change", "lk_price_pct_change"]:
        if fuel_col not in df.columns:
            df[fuel_col] = 0
        else:
            df[fuel_col] = df[fuel_col].ffill().fillna(0)

    # Boolean: did kerosene price rise vs yesterday?
    df["lk_price_rose"]  = (df["lk_price_change"] > 0).astype(int)

    # ── Final composite signal ────────────────────────────────────────
    df["price_behavior_signal"] = (
        df["weather_effect"] +
        df["poya_effect"] +
        df["festival_effect"]
    )

    df = df.sort_values("date").reset_index(drop=True)

    df.to_csv(OUT, index=False)
    print("✅ Feature dataset ready:", OUT)
    print(f"📊 Total rows: {len(df)}")
    print(f"📋 Columns: {list(df.columns)}")

if __name__ == "__main__":
    # Extract fish names from CSV files
    extract_fish_names_from_csv()
    
    # Add features
    add_features()
