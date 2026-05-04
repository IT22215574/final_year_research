# merge_all_data.py
import pandas as pd
from pathlib import Path
import re
from datetime import datetime, timedelta

def get_week_start_date(month_name, week_ordinal, year):
    """
    Calculate the start date of a week in a given month.
    week_ordinal: 1st, 2nd, 3rd, 4th
    """
    month_map = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    
    month = month_map.get(month_name.lower()[:3])
    if not month:
        return None
    
    # Extract week number (1st, 2nd, 3rd, 4th)
    week_num = int(week_ordinal[0]) if week_ordinal[0].isdigit() else None
    if not week_num:
        return None
    
    # First day of the month
    first_day = datetime(year, month, 1)
    
    # Calculate week start: (week_num - 1) * 7 days from first day
    week_start = first_day + timedelta(days=(week_num - 1) * 7)
    
    return pd.Timestamp(week_start)

def extract_fish_prices_from_csv(csv_folder):
    """Extract actual fish prices from CSV files"""
    fish_prices = []
    csv_files = sorted(list(csv_folder.glob("*.csv")))
    
    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file, skiprows=3)
            
            # Extract date from filename
            filename = csv_file.stem
            match = re.search(r'([A-Za-z]+)_?(\d+(?:st|nd|rd|th))_?week_(\d{4})', filename, re.IGNORECASE)
            
            if not match:
                continue
            
            month_name = match.group(1)
            week_ordinal = match.group(2)
            year = int(match.group(3))
            date_obj = get_week_start_date(month_name, week_ordinal, year)
            
            # Extract fish data
            for idx, row in df.iterrows():
                try:
                    fish_id = row.iloc[0]
                    sinhala_name = row.iloc[1]
                    common_name = row.iloc[2]
                    price = row.iloc[5]  # 2025 current week price (column 5)
                    
                    if (pd.notna(fish_id) and pd.notna(sinhala_name) and 
                        pd.notna(common_name) and pd.notna(price) and 
                        str(fish_id).isdigit() and fish_id != 'Sinhala Name'):
                        
                        try:
                            price_val = float(price)
                            if price_val > 0:
                                fish_prices.append({
                                    'date': date_obj,
                                    'fish_id': int(fish_id),
                                    'sinhala_name': str(sinhala_name).strip(),
                                    'common_name': str(common_name).strip(),
                                    'price': price_val
                                })
                        except (ValueError, TypeError):
                            continue
                except:
                    continue
        except Exception as e:
            print(f"⚠ Error reading {csv_file.name}: {e}")
    
    if fish_prices:
        df = pd.DataFrame(fish_prices)
        
        # Remove duplicates: keep the record with highest price for same date+fish
        df = df.sort_values('price', ascending=False)
        df = df.drop_duplicates(subset=['date', 'fish_id'], keep='first')
        
        print(f"📊 After removing duplicates: {len(df)} records")
        return df
    return None

def merge_all():
    script_dir = Path(__file__).resolve().parent
    # Navigate: scripts/ → fish_price_prediction/ → model/ → final_year_research/ → Backend/
    project_root = script_dir.parent.parent.parent
    backend_dir = project_root / "Backend"
    
    processed = backend_dir / "dataset" / "processed"
    raw_csv = backend_dir / "dataset" / "raw" / "csv"
    festivals_path = backend_dir / "dataset" / "raw" / "festivals" / "festivals_2020_2026.csv"
    weather_path = processed / "weather_dataset.csv"
    fuel_path = processed / "fuel_price_daily.csv"

    processed.mkdir(parents=True, exist_ok=True)

    print("\n========== MERGING PRICE + FUEL + WEATHER + FESTIVALS ==========")

    # 1️⃣ Extract fish prices directly from CSVs
    print("\n📊 Extracting fish prices from CSV files...")
    fish_price_df = extract_fish_prices_from_csv(raw_csv)
    
    if fish_price_df is None or len(fish_price_df) == 0:
        print("❌ No price data extracted from CSV files.")
        return
    
    print(f"✅ Extracted {len(fish_price_df)} fish price records")
    
    price_df = fish_price_df.sort_values("date")
    price_df.to_csv(processed / "merged_price.csv", index=False)

    # 2️⃣ Load WEATHER (Focus on Colombo)
    if weather_path.exists():
        weather_df = pd.read_csv(weather_path)
        weather_df["date"] = pd.to_datetime(weather_df["date"], errors="coerce")
        weather_df = weather_df.dropna(subset=["date"])
        
        # Filter for Colombo since the market data is from Colombo
        if "city" in weather_df.columns:
            colombo_weather = weather_df[weather_df["city"] == "Colombo"]
            if not colombo_weather.empty:
                weather_df = colombo_weather
                print("✅ Filtered weather data for Colombo")

        # Aggregate by date so we do not explode rows when merging
        agg = weather_df.groupby("date").agg({
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

        weather_df = agg
        print("✅ Weather data loaded and aggregated across ports")
    else:
        print("⚠ No weather dataset found")
        weather_df = None

    # 3️⃣ Load FUEL PRICE (LK – Lanka Kerosene, daily forward-filled)
    if fuel_path.exists():
        fuel_df = pd.read_csv(fuel_path)
        fuel_df["date"] = pd.to_datetime(fuel_df["date"], errors="coerce")
        fuel_df = fuel_df.dropna(subset=["date"])
        # Keep only the fuel columns we need
        fuel_cols = [c for c in ["date", "lk_price", "lk_price_lag1", "lk_price_lag2",
                                  "lk_price_change", "lk_price_pct_change"]
                     if c in fuel_df.columns]
        fuel_df = fuel_df[fuel_cols]
        print(f"✅ Fuel price data loaded: {len(fuel_df)} rows, cols: {fuel_cols}")
    else:
        fuel_df = None
        print("⚠ No fuel price dataset found (run process_fuel_price.py first)")

    # 4️⃣ Load FESTIVALS
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
            fest_df = fest_df[["date", "festival_name", "is_festival"]]
            print("✅ Festival data loaded")
        else:
            print("⚠ No date column found in festivals CSV")
            fest_df = None
    else:
        fest_df = None
        print("⚠ No festival dataset found")

    # 5️⃣ Merge everything
    # Fish prices ← fuel price (left join on date)
    merged = price_df.merge(fuel_df, on="date", how="left") if fuel_df is not None else price_df

    # Fish+fuel ← weather (left join on date)
    merged = merged.merge(weather_df, on="date", how="left") if weather_df is not None else merged

    # Fish+fuel+weather ← festivals (left join on date)
    merged = merged.merge(fest_df, on="date", how="left") if fest_df is not None else merged
    merged["is_festival"] = merged["is_festival"].fillna(0)
    merged["festival_name"] = merged["festival_name"].fillna("None")

    out = processed / "final_merged_dataset.csv"
    merged.to_csv(out, index=False)
    print("\n✅ FINAL MERGED DATASET SAVED:", out)
    print(f"📊 Total records: {len(merged)}")

if __name__ == "__main__":
    merge_all()
