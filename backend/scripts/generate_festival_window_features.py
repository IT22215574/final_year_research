import pandas as pd
from pathlib import Path

def generate_festival_window():
    """Generate festival window features for price data"""
    
    # Get correct paths
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent
    
    # Input data path
    DATA_PATH = backend_dir / "dataset" / "processed" / "catch_volume_features.csv"
    FESTIVALS_PATH = backend_dir / "dataset" / "raw" / "festivals" / "festivals_2021_2025.csv"
    
    # Output path
    OUTPUT_PATH = backend_dir / "dataset" / "processed" / "festival_window_features.csv"
    
    print("\n" + "="*60)
    print("Generating Festival Window Features")
    print("="*60)
    
    # Check if input files exist
    if not DATA_PATH.exists():
        print(f"\n⚠️  Input file not found: {DATA_PATH}")
        print("Please run feature engineering or merge scripts first")
        return
    
    if not FESTIVALS_PATH.exists():
        print(f"\n⚠️  Festivals file not found: {FESTIVALS_PATH}")
        print("Please ensure festivals CSV exists in:", FESTIVALS_PATH.parent)
        return
    
    print(f"\n📥 Loading data from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"✅ Loaded {len(df)} records")
    
    print(f"📥 Loading festivals from: {FESTIVALS_PATH}")
    festivals_df = pd.read_csv(FESTIVALS_PATH)
    
    # Find date column in festivals
    festival_date_col = None
    for col in festivals_df.columns:
        if 'date' in col.lower():
            festival_date_col = col
            break
    
    if not festival_date_col:
        print("❌ No date column found in festivals CSV")
        return
    
    festivals_df = festivals_df.rename(columns={festival_date_col: 'festival_date'})
    festivals_df['festival_date'] = pd.to_datetime(festivals_df['festival_date'], errors='coerce')
    festivals_df = festivals_df.dropna(subset=['festival_date'])
    print(f"✅ Loaded {len(festivals_df)} festival dates")
    
    # Ensure date column exists
    if 'date' not in df.columns:
        print("❌ No 'date' column found in input data")
        return
    
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df = df.dropna(subset=['date'])
    
    # Create festival window features
    print("\n🔄 Creating festival window features...")
    
    df['days_to_festival'] = 999  # Default: far from festival
    df['days_from_festival'] = 999
    df['in_festival_window'] = 0
    df['festival_name'] = ''
    
    # For each row, find nearest festivals
    for idx, row in df.iterrows():
        current_date = row['date']
        
        # Find festivals within 30 days before and after
        for _, fest in festivals_df.iterrows():
            fest_date = fest['festival_date']
            days_diff = (current_date - fest_date).days
            
            # If within 30-day window
            if -30 <= days_diff <= 30:
                df.at[idx, 'in_festival_window'] = 1
                df.at[idx, 'days_to_festival'] = min(df.at[idx, 'days_to_festival'], abs(days_diff))
                
                if days_diff < 0:
                    df.at[idx, 'days_from_festival'] = min(df.at[idx, 'days_from_festival'], abs(days_diff))
                
                # Store festival name
                if df.at[idx, 'festival_name']:
                    df.at[idx, 'festival_name'] += ' | '
                df.at[idx, 'festival_name'] += fest.get('local_name', fest.get('name', 'Festival'))
    
    # Save output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False, encoding='utf-8-sig')
    
    print("\n✅ Festival window features saved!")
    print(f"📁 File: {OUTPUT_PATH}")
    print(f"📊 Rows: {len(df)}")
    print(f"🎉 Festival windows found: {df['in_festival_window'].sum()}")

if __name__ == "__main__":
    try:
        generate_festival_window()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
