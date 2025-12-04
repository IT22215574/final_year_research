# merge_all_data.py
import pandas as pd
from pathlib import Path
import sys

def merge_all():
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    processed = backend_dir / "dataset" / "processed"
    raw_csv = backend_dir / "dataset" / "raw" / "csv"
    festivals_path = backend_dir / "dataset" / "raw" / "festivals" / "festivals_2021_2025.csv"
    weather_path = processed / "weather_dataset.csv"

    processed.mkdir(parents=True, exist_ok=True)

    print("\n========== MERGING PRICE + WEATHER + FESTIVALS ==========")

    # 1️⃣ Load PRICE data
    price_files = list(raw_csv.glob("*.csv"))
    if not price_files:
        print("❌ No price CSV files found in raw/csv/")
        return

    frames = []
    skipped = 0
    
    for f in price_files:
        df = pd.read_csv(f)
        
        has_date = False
        if "date" not in df.columns:
            for c in df.columns:
                if "date" in c.lower():
                    df = df.rename(columns={c: "date"})
                    has_date = True
                    break
        else:
            has_date = True
        
        if not has_date:
            skipped += 1
            continue
            
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"])
        
        if len(df) > 0:
            frames.append(df)

    if not frames:
        print("\n⚠️  IMPORTANT NOTE:")
        print("="*60)
        print("Your CSV files don't have 'date' columns.")
        print("They appear to be raw fish price data files.")
        print("\n✅ SOLUTION: Use model_train.py instead!")
        print("   It parses dates from filenames and handles your data correctly.")
        print("\nRun: python backend/model_train.py")
        print("="*60)
        return

    price_df = pd.concat(frames).sort_values("date")
    price_df.to_csv(processed / "merged_price.csv", index=False)
    print(f"✅ Price data merged ({len(frames)} files, {skipped} skipped)")

    # 2️⃣ Load WEATHER
    if weather_path.exists():
        weather_df = pd.read_csv(weather_path)
        weather_df["date"] = pd.to_datetime(weather_df["date"], errors="coerce")
        weather_df = weather_df.dropna(subset=["date"])
        print("✅ Weather data loaded")
    else:
        print("⚠ No weather dataset found")
        weather_df = None

    # 3️⃣ Load FESTIVALS
    if festivals_path.exists():
        fest_df = pd.read_csv(festivals_path)
        
        date_col = None
        for col in fest_df.columns:
            if 'date' in col.lower():
                date_col = col
                break
        
        if date_col:
            fest_df = fest_df.rename(columns={date_col: "date"})
            fest_df["date"] = pd.to_datetime(fest_df["date"])
            fest_df["is_festival"] = 1
            fest_df = fest_df[["date", "is_festival"]]
            print("✅ Festival data loaded")
        else:
            print("⚠ No date column found in festivals CSV")
            fest_df = None
    else:
        fest_df = None
        print("⚠ No festival dataset found")

    # 4️⃣ Merge everything
    merged = price_df.merge(weather_df, on="date", how="left") if weather_df is not None else price_df
    merged = merged.merge(fest_df, on="date", how="left") if fest_df is not None else merged
    merged["is_festival"] = merged["is_festival"].fillna(0)

    out = processed / "final_merged_dataset.csv"
    merged.to_csv(out, index=False)
    print("\n✅ FINAL MERGED DATASET SAVED:", out)

if __name__ == "__main__":
    merge_all()
