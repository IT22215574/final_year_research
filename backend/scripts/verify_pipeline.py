import pandas as pd
from pathlib import Path
import numpy as np

def verify_pipeline():
    """Verify the complete pipeline flow"""
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    processed_dir = backend_dir / "dataset" / "processed"
    raw_csv_dir = backend_dir / "dataset" / "raw" / "csv"
    
    print("="*70)
    print("🔍 PIPELINE VERIFICATION")
    print("="*70)
    
    # 1️⃣ Check CSV files
    print("\n1️⃣ Checking CSV Files...")
    csv_files = list(raw_csv_dir.glob("*.csv"))
    print(f"   ✅ Found {len(csv_files)} CSV files")
    if csv_files:
        print(f"   📁 Sample: {csv_files[0].name}")
    
    # 2️⃣ Check merged price data
    print("\n2️⃣ Checking Merged Price Data...")
    merged_price_path = processed_dir / "merged_price.csv"
    if merged_price_path.exists():
        price_df = pd.read_csv(merged_price_path)
        print(f"   ✅ merged_price.csv exists")
        print(f"   📊 Records: {len(price_df)}")
        print(f"   🐟 Unique fish: {price_df['sinhala_name'].nunique()}")
        print(f"   💰 Price range: Rs. {price_df['price'].min():.2f} - Rs. {price_df['price'].max():.2f}")
        print(f"   📅 Date range: {price_df['date'].min()} to {price_df['date'].max()}")
        
        # Show sample
        print("\n   Sample data:")
        print(price_df[['date', 'sinhala_name', 'price']].head(5).to_string(index=False))
    else:
        print(f"   ❌ merged_price.csv NOT FOUND")
        return False
    
    # 3️⃣ Check weather data
    print("\n3️⃣ Checking Weather Data...")
    weather_path = processed_dir / "weather_dataset.csv"
    if weather_path.exists():
        weather_df = pd.read_csv(weather_path)
        print(f"   ✅ weather_dataset.csv exists")
        print(f"   📊 Records: {len(weather_df)}")
        print(f"   🌡️ Temp range: {weather_df['temp_c'].min()}°C - {weather_df['temp_c'].max()}°C")
    else:
        print(f"   ⚠️ weather_dataset.csv NOT FOUND (optional)")
    
    # 4️⃣ Check festival data
    print("\n4️⃣ Checking Festival Data...")
    festival_path = backend_dir / "dataset" / "raw" / "festivals" / "festivals_2020_2026.csv"
    if festival_path.exists():
        fest_df = pd.read_csv(festival_path)
        print(f"   ✅ festivals_2020_2026.csv exists")
        print(f"   📊 Records: {len(fest_df)}")
        print(f"   🎉 Unique festivals: {fest_df['festival_name'].nunique()}")
        poya_count = fest_df[fest_df['festival_name'].str.contains('Poya', case=False, na=False)]
        print(f"   🌙 Poya days: {len(poya_count)}")
    else:
        print(f"   ❌ festivals_2020_2026.csv NOT FOUND")
        return False
    
    # 5️⃣ Check final merged dataset
    print("\n5️⃣ Checking Final Merged Dataset...")
    final_path = processed_dir / "final_merged_dataset.csv"
    if final_path.exists():
        final_df = pd.read_csv(final_path)
        print(f"   ✅ final_merged_dataset.csv exists")
        print(f"   📊 Records: {len(final_df)}")
        print(f"   📋 Columns: {list(final_df.columns)}")
        
        # Check key columns
        required_cols = ['date', 'sinhala_name', 'price', 'festival_name']
        missing = [c for c in required_cols if c not in final_df.columns]
        if missing:
            print(f"   ⚠️ Missing columns: {missing}")
        else:
            print(f"   ✅ All required columns present")
    else:
        print(f"   ❌ final_merged_dataset.csv NOT FOUND")
        return False
    
    # 6️⃣ Check features dataset
    print("\n6️⃣ Checking Features Dataset...")
    features_path = processed_dir / "features_dataset.csv"
    if features_path.exists():
        features_df = pd.read_csv(features_path)
        print(f"   ✅ features_dataset.csv exists")
        print(f"   📊 Records: {len(features_df)}")
        print(f"   📋 Columns ({len(features_df.columns)}): {list(features_df.columns)}")
        
        # Check festival features
        if 'is_festival_day' in features_df.columns:
            festival_days = features_df[features_df['is_festival_day'] == 1]
            print(f"   🎉 Festival days marked: {len(festival_days)}")
        
        if 'poya_effect' in features_df.columns:
            poya_days = features_df[features_df['poya_effect'] == 1]
            print(f"   🌙 Poya effect marked: {len(poya_days)}")
        
        if 'price' in features_df.columns:
            print(f"   💰 Price column: ✅ (range: Rs. {features_df['price'].min():.2f} - Rs. {features_df['price'].max():.2f})")
    else:
        print(f"   ❌ features_dataset.csv NOT FOUND")
        return False
    
    # 7️⃣ Check fish names
    print("\n7️⃣ Checking Fish Names...")
    fish_names_path = processed_dir / "fish_names.csv"
    if fish_names_path.exists():
        fish_df = pd.read_csv(fish_names_path)
        print(f"   ✅ fish_names.csv exists")
        print(f"   🐟 Fish species: {len(fish_df)}")
        print("\n   Sample fish:")
        print(fish_df[['fish_id', 'sinhala_name', 'common_name']].head(5).to_string(index=False))
    else:
        print(f"   ❌ fish_names.csv NOT FOUND")
        return False
    
    # 8️⃣ Check models
    print("\n8️⃣ Checking Trained Models...")
    models_dir = backend_dir / "models"
    if models_dir.exists():
        model_files = ['rf_model.pkl', 'gb_model.pkl', 'feature_names.pkl', 'le_sinhala.pkl']
        for mf in model_files:
            if (models_dir / mf).exists():
                print(f"   ✅ {mf}")
            else:
                print(f"   ❌ {mf} NOT FOUND")
    else:
        print(f"   ❌ models/ directory NOT FOUND")
        print(f"   ℹ️ Run: python backend/model_train.py")
        return False
    
    # 9️⃣ Data Quality Checks
    print("\n9️⃣ Data Quality Checks...")
    
    # Check for fish with multiple prices on same date
    if 'date' in features_df.columns and 'sinhala_name' in features_df.columns:
        duplicates = features_df.groupby(['date', 'sinhala_name']).size()
        dup_count = (duplicates > 1).sum()
        if dup_count > 0:
            print(f"   ⚠️ Found {dup_count} date-fish combinations with multiple prices")
        else:
            print(f"   ✅ No duplicate date-fish combinations")
    
    # Check price distribution per fish
    if 'sinhala_name' in features_df.columns and 'price' in features_df.columns:
        print("\n   💰 Price statistics per fish (sample):")
        price_stats = features_df.groupby('sinhala_name')['price'].agg(['mean', 'min', 'max', 'std']).round(2)
        print(price_stats.head(5).to_string())
    
    print("\n" + "="*70)
    print("✅ PIPELINE VERIFICATION COMPLETE!")
    print("="*70)
    
    return True

if __name__ == "__main__":
    verify_pipeline()
