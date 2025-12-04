# merge_all_data.py
import pandas as pd
from pathlib import Path
import sys
import glob

def safe_read_csv(path, parse_dates=None):
    try:
        # First read without parsing dates to check columns
        df = pd.read_csv(path)
        
        # If parse_dates specified, check if column exists
        if parse_dates:
            existing_date_cols = [col for col in parse_dates if col in df.columns]
            if existing_date_cols:
                # Re-read with date parsing for existing columns only
                df = pd.read_csv(path, parse_dates=existing_date_cols)
        
        return df
    except Exception as e:
        print(f"  ❌ Error reading {path.name}: {e}")
        return None

def merge_all():
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    csv_folder = backend_dir / "dataset" / "raw" / "csv"
    processed_folder = backend_dir / "dataset" / "processed"
    processed_folder.mkdir(parents=True, exist_ok=True)

    print("\n" + "="*60)
    print("Merging datasets (price CSVs + processed datasets)")
    print("="*60)

    # 1) Load price CSVs from backend/dataset/raw/csv/*.csv (if present)
    price_files = list(csv_folder.glob("*.csv")) if csv_folder.exists() else []
    price_df = None

    if price_files:
        frames = []
        print(f"📁 Found {len(price_files)} CSV(s) in {csv_folder}")
        for f in price_files:
            print(f"  ➤ Loading price CSV: {f.name}")
            df = safe_read_csv(f)
            if df is None:
                continue
            
            # Debug: print first few column names
            # print(f"    Columns: {df.columns.tolist()[:5]}")
            
            # ensure date column exists or try to detect
            if "date" not in df.columns:
                # try to find a date-like column
                date_col = None
                for c in df.columns:
                    c_lower = str(c).lower()
                    if "date" in c_lower or "day" in c_lower or "time" in c_lower:
                        date_col = c
                        break
                
                if date_col:
                    df = df.rename(columns={date_col: "date"})
                    print(f"    ℹ Renamed '{date_col}' to 'date'")
                else:
                    # If no date column found, skip this file
                    print(f"    ⚠ No date column found - skipping")
                    continue
            
            frames.append(df)
        
        if frames:
            price_df = pd.concat(frames, ignore_index=True)
            # parse date
            if "date" in price_df.columns:
                price_df["date"] = pd.to_datetime(price_df["date"], errors="coerce")
                price_df = price_df.dropna(subset=["date"])
                print(f"✅ Parsed {len(price_df)} price records with valid dates")
            # Save intermediate merged_price.csv
            merged_price_path = processed_folder / "merged_price.csv"
            price_df.to_csv(merged_price_path, index=False, encoding="utf-8-sig")
            print(f"✅ Merged price CSVs saved: {merged_price_path} ({len(price_df)} rows)")
        else:
            print("⚠ No valid price frames found in csv/ folder.")
    else:
        print(f"ℹ No CSV files found in {csv_folder} (skipping price consolidation).")

    # 2) Load processed datasets (if exist)
    files = {
        "price": processed_folder / "merged_price.csv",
        "catch": processed_folder / "catch_volume.csv",
        "weather": processed_folder / "weather_dataset.csv",
    }
    
    # Load multiple holiday files
    holiday_files = [
        backend_dir / "dataset" / "raw" / "holidays" / "holidays_2024_2026.csv",
        backend_dir / "dataset" / "raw" / "festivals" / "festivals_2021_2025.csv",
    ]

    loaded = {}
    for name, path in files.items():
        if path.exists():
            print(f"📥 Loading processed file: {path.name}")
            df = safe_read_csv(path, parse_dates=["date"])
            if df is None:
                continue
            # Ensure date column
            if "date" not in df.columns:
                # try detect
                for c in df.columns:
                    if "date" in c.lower() or "day" in c.lower():
                        df = df.rename(columns={c: "date"})
                        print(f"    ℹ Renamed '{c}' to 'date'")
                        break
            # parse date if still not parsed
            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"], errors="coerce")
                df = df.dropna(subset=["date"])
            
            loaded[name] = df
        else:
            print(f"  - (not found) {name}: {path.name}")
    
    # Load and combine holiday files
    all_holidays = []
    for holiday_path in holiday_files:
        if holiday_path.exists():
            print(f"📥 Loading holiday file: {holiday_path.name}")
            df = safe_read_csv(holiday_path, parse_dates=["date"])
            if df is not None:
                if "date" not in df.columns:
                    for c in df.columns:
                        c_lower = str(c).lower()
                        if "date" in c_lower or "day" in c_lower:
                            df = df.rename(columns={c: "date"})
                            print(f"    ℹ Renamed '{c}' to 'date'")
                            break
                if "date" in df.columns:
                    df["date"] = pd.to_datetime(df["date"], errors="coerce")
                    df = df.dropna(subset=["date"])
                    df["is_holiday"] = 1
                    all_holidays.append(df[["date", "is_holiday"]])
        else:
            print(f"  - (not found) holiday file: {holiday_path.name}")
    
    # Combine all holidays
    if all_holidays:
        holidays_combined = pd.concat(all_holidays, ignore_index=True)
        holidays_combined = holidays_combined.drop_duplicates(subset=["date"])
        loaded["holidays"] = holidays_combined
        print(f"✅ Combined holidays: {len(holidays_combined)} unique dates")

    if "price" not in loaded:
        # if price_df in memory, use that
        if price_df is not None:
            loaded["price"] = price_df
        else:
            print("❌ No price data found. Cannot continue merge without price timeline.")
            print("Please provide price CSVs in dataset/csv/ or a processed merged_price.csv in dataset/processed/")
            return

    # 3) Merge datasets on 'date' using price as timeline
    merged = loaded["price"].copy()
    if "date" not in merged.columns:
        print("❌ Price data has no 'date' column. Cannot merge.")
        print(f"Available columns: {merged.columns.tolist()}")
        return

    # Ensure date is datetime
    merged["date"] = pd.to_datetime(merged["date"], errors="coerce")
    merged = merged.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)

    for name, df in loaded.items():
        if name == "price":
            continue
        if "date" not in df.columns:
            print(f"  ⚠ {name} has no date column — skipping join.")
            continue
        # join left (keep price dates)
        print(f"  ↳ Merging with {name} ({len(df)} rows) on 'date' (left join)")
        merged = merged.merge(df, on="date", how="left", suffixes=("", f"_{name}"))

    # final clean-up: drop duplicate date rows (if any)
    merged = merged.drop_duplicates(subset=["date"], keep="first").reset_index(drop=True)

    out_path = processed_folder / "final_merged_dataset.csv"
    merged.to_csv(out_path, index=False, encoding="utf-8-sig")
    print("\n" + "="*60)
    print(f"✅ Final merged dataset saved: {out_path} ({len(merged)} rows)")
    print("="*60)

if __name__ == "__main__":
    try:
        merge_all()
    except Exception as e:
        print("Fatal merge error:", e)
        sys.exit(1)
