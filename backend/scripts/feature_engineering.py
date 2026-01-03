# feature_engineering.py
import pandas as pd
from pathlib import Path
import re

def extract_fish_names_from_csv():
    """Extract fish names from all CSV files in raw/csv folder"""
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
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

def add_features():
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
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

    # Time features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # Weather effect simulation
    if "rainfall" in df.columns:
        df["weather_effect"] = (df["rainfall"] > 10).astype(int)
    else:
        df["weather_effect"] = 0

    # Festival and price behavior signals
    # FIX: Better Poya detection
    df["poya_effect"] = (
        df["festival_name"].str.lower().str.contains("poya", na=False) |
        df["festival_name"].str.lower().str.contains("full moon", na=False)
    ).astype(int)
    df["festival_effect"] = df["is_festival_day"]

    # Final price behavior signal
    df["price_behavior_signal"] = (
        df["weather_effect"] +
        df["poya_effect"] +
        df["festival_effect"]
    )

    df.to_csv(OUT, index=False)
    print("✅ Feature dataset ready:", OUT)
    print(f"📊 Total rows: {len(df)}")
    print(f"📋 Columns: {list(df.columns)}")

if __name__ == "__main__":
    # Extract fish names from CSV files
    extract_fish_names_from_csv()
    
    # Add features
    add_features()
