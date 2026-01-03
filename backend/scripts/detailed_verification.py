import pandas as pd
from pathlib import Path
import numpy as np

def detailed_verification():
    """Detailed verification with examples"""
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    processed_dir = backend_dir / "dataset" / "processed"
    
    print("="*80)
    print("🔬 DETAILED PIPELINE VERIFICATION")
    print("="*80)
    
    # Load features dataset
    features_path = processed_dir / "features_dataset.csv"
    if not features_path.exists():
        print("❌ features_dataset.csv not found!")
        return
    
    df = pd.read_csv(features_path)
    df["date"] = pd.to_datetime(df["date"])
    
    print(f"\n📊 Total Records: {len(df)}")
    print(f"📅 Date Range: {df['date'].min()} to {df['date'].max()}")
    print(f"🐟 Fish Species: {df['sinhala_name'].nunique()}")
    print(f"💰 Price Range: Rs. {df['price'].min():.2f} - Rs. {df['price'].max():.2f}")
    
    # ==========================================
    # 1️⃣ Check Fish-specific Prices
    # ==========================================
    print("\n" + "="*80)
    print("1️⃣ FISH-SPECIFIC PRICE VERIFICATION")
    print("="*80)
    
    sample_fish = df['sinhala_name'].unique()[:3]
    for fish in sample_fish:
        fish_data = df[df['sinhala_name'] == fish]
        print(f"\n🐟 {fish}:")
        print(f"   Records: {len(fish_data)}")
        print(f"   Price: Rs. {fish_data['price'].min():.2f} - Rs. {fish_data['price'].max():.2f}")
        print(f"   Average: Rs. {fish_data['price'].mean():.2f}")
    
    # ==========================================
    # 2️⃣ Check Festival Detection
    # ==========================================
    print("\n" + "="*80)
    print("2️⃣ FESTIVAL DETECTION VERIFICATION")
    print("="*80)
    
    festival_days = df[df['is_festival_day'] == 1]
    print(f"\n🎉 Festival Days Detected: {len(festival_days)}")
    
    if len(festival_days) > 0:
        print("\n   Sample Festival Days:")
        sample_festivals = festival_days[['date', 'festival_name', 'sinhala_name', 'price']].head(10)
        print(sample_festivals.to_string(index=False))
    
    # ==========================================
    # 3️⃣ Check Poya Detection
    # ==========================================
    print("\n" + "="*80)
    print("3️⃣ POYA DAY DETECTION VERIFICATION")
    print("="*80)
    
    poya_days = df[df['poya_effect'] == 1]
    print(f"\n🌙 Poya Days Detected: {len(poya_days)}")
    
    if len(poya_days) > 0:
        print("\n   Sample Poya Days:")
        sample_poya = poya_days[['date', 'festival_name', 'sinhala_name', 'price']].head(5)
        print(sample_poya.to_string(index=False))
    else:
        print("\n   ⚠️ No Poya days detected!")
        print("   Check if festival_name contains 'Poya' or 'Full Moon'")
    
    # ==========================================
    # 4️⃣ Check Festival Window Detection
    # ==========================================
    print("\n" + "="*80)
    print("4️⃣ FESTIVAL WINDOW DETECTION VERIFICATION")
    print("="*80)
    
    before_window = df[df['before_festival_window'] == 1]
    print(f"\n📅 Days Before Festival (within 14 days): {len(before_window)}")
    
    if len(before_window) > 0:
        print("\n   Sample Days Before Festival:")
        sample_before = before_window[['date', 'days_to_festival', 'sinhala_name', 'price']].head(5)
        print(sample_before.to_string(index=False))
    
    # ==========================================
    # 5️⃣ Check Weather Effect
    # ==========================================
    print("\n" + "="*80)
    print("5️⃣ WEATHER EFFECT VERIFICATION")
    print("="*80)
    
    if 'weather_effect' in df.columns:
        bad_weather = df[df['weather_effect'] == 1]
        print(f"\n🌧️ Bad Weather Days: {len(bad_weather)}")
        
        if 'temp_c' in df.columns:
            print(f"   Temperature Range: {df['temp_c'].min():.1f}°C - {df['temp_c'].max():.1f}°C")
        if 'humidity' in df.columns:
            print(f"   Humidity Range: {df['humidity'].min():.1f}% - {df['humidity'].max():.1f}%")
    else:
        print("\n⚠️ No weather_effect column found")
    
    # ==========================================
    # 6️⃣ Check Model Features
    # ==========================================
    print("\n" + "="*80)
    print("6️⃣ MODEL FEATURES VERIFICATION")
    print("="*80)
    
    required_features = [
        'sinhala_name',  # For fish encoding
        'date',
        'price',
        'is_festival_day',
        'before_festival_window',
        'days_to_festival',
        'poya_effect',
        'festival_effect'
    ]
    
    print("\n   Feature Availability:")
    for feat in required_features:
        status = "✅" if feat in df.columns else "❌"
        print(f"   {status} {feat}")
    
    # ==========================================
    # 7️⃣ Example Prediction Scenario
    # ==========================================
    print("\n" + "="*80)
    print("7️⃣ EXAMPLE PREDICTION SCENARIO")
    print("="*80)
    
    # Find a festival day with data
    if len(festival_days) > 0:
        example = festival_days.iloc[0]
        print(f"\n📅 Example Date: {example['date'].strftime('%Y-%m-%d')}")
        print(f"🐟 Fish: {example['sinhala_name']}")
        print(f"🎉 Festival: {example['festival_name']}")
        print(f"💰 Actual Price: Rs. {example['price']:.2f}")
        print(f"🌙 Is Poya?: {example.get('poya_effect', 0)}")
        print(f"📊 Festival Effect: {example.get('festival_effect', 0)}")
        
        # Find days before this festival
        date_before = example['date'] - pd.Timedelta(days=7)
        before_data = df[(df['date'] == date_before) & (df['sinhala_name'] == example['sinhala_name'])]
        
        if len(before_data) > 0:
            before = before_data.iloc[0]
            print(f"\n📅 7 Days Before Festival:")
            print(f"   Date: {before['date'].strftime('%Y-%m-%d')}")
            print(f"   Price: Rs. {before['price']:.2f}")
            print(f"   Days to Festival: {before.get('days_to_festival', 'N/A')}")
            print(f"   In Festival Window?: {before.get('before_festival_window', 'N/A')}")
    
    # ==========================================
    # 8️⃣ Price Variation Analysis
    # ==========================================
    print("\n" + "="*80)
    print("8️⃣ PRICE VARIATION ANALYSIS")
    print("="*80)
    
    print("\n   Price comparison:")
    
    # Normal days
    normal_days = df[df['is_festival_day'] == 0]
    print(f"   📊 Normal Days Average: Rs. {normal_days['price'].mean():.2f}")
    
    # Festival days
    if len(festival_days) > 0:
        print(f"   🎉 Festival Days Average: Rs. {festival_days['price'].mean():.2f}")
        diff = ((festival_days['price'].mean() - normal_days['price'].mean()) / normal_days['price'].mean()) * 100
        print(f"   📈 Difference: {diff:+.2f}%")
    
    # Days before festival
    if len(before_window) > 0:
        print(f"   📅 Before Festival Average: Rs. {before_window['price'].mean():.2f}")
        diff = ((before_window['price'].mean() - normal_days['price'].mean()) / normal_days['price'].mean()) * 100
        print(f"   📈 Difference: {diff:+.2f}%")
    
    print("\n" + "="*80)
    print("✅ DETAILED VERIFICATION COMPLETE!")
    print("="*80)
    
    # Summary
    print("\n📝 SUMMARY:")
    print(f"   ✅ Fish-specific prices: {df['sinhala_name'].nunique()} fish types")
    print(f"   ✅ Festival detection: {len(festival_days)} festival days")
    print(f"   ✅ Festival window: {len(before_window)} days before festivals")
    print(f"   ✅ Poya detection: {len(poya_days)} poya days")
    print(f"   ✅ Weather data: {'Yes' if 'temp_c' in df.columns else 'No'}")
    
    print("\n🎯 YOUR MODEL TRAINS ON:")
    print("   • Fish type (32 varieties)")
    print("   • Date/time features")
    print("   • Is it a festival day?")
    print("   • Is it near a festival? (within 14 days)")
    print("   • Is it a Poya day?")
    print("   • Weather conditions")
    print("\n   → Predicts: Fish price per Kg")

if __name__ == "__main__":
    detailed_verification()
