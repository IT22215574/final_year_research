import os
import pandas as pd
import numpy as np
from pathlib import Path
import pickle
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

def parse_date_from_filename(filename):
    """Extract year, month, week from filename"""
    filename = filename.replace('.csv', '')
    
    # Month mapping
    month_map = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'mar': 3, 'Apr': 4,
        'May': 5, 'June': 6, 'July': 7, 'Aug': 8,
        'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    }
    
    # Extract components
    parts = filename.split('_')
    month = None
    week = None
    year = None
    
    for i, part in enumerate(parts):
        # Find month
        for m_name, m_num in month_map.items():
            if m_name in part:
                month = m_num
                break
        
        # Find week number
        if 'week' in part.lower() and i > 0:
            week_part = parts[i-1]
            if '1st' in week_part:
                week = 1
            elif '2nd' in week_part:
                week = 2
            elif '3rd' in week_part or '3nd' in week_part:
                week = 3
            elif '4th' in week_part:
                week = 4
        
        # Find year
        if part.isdigit() and len(part) == 4:
            year = int(part)
    
    return year, month, week

def load_holidays(backend_dir):
    """Load holidays data from multiple CSV files"""
    holidays_files = [
        backend_dir / "dataset" / "raw" / "holidays" / "holidays_2024_2026.csv",
        backend_dir / "dataset" / "raw" / "festivals" / "festivals_2021_2025.csv"
    ]
    
    all_holidays = []
    
    for holidays_path in holidays_files:
        if not holidays_path.exists():
            print(f"⚠️  Holidays file not found: {holidays_path}")
            continue
        
        try:
            df_holidays = pd.read_csv(holidays_path)
            
            # Try to find date column
            date_col = None
            for col in df_holidays.columns:
                if 'date' in col.lower():
                    date_col = col
                    break
            
            if date_col and date_col != 'date':
                df_holidays = df_holidays.rename(columns={date_col: 'date'})
                print(f"✅ Loaded {len(df_holidays)} holidays from {holidays_path.name} (renamed '{date_col}' to 'date')")
            else:
                print(f"✅ Loaded {len(df_holidays)} holidays from {holidays_path.name}")
            
            df_holidays['date'] = pd.to_datetime(df_holidays['date'], errors='coerce')
            df_holidays = df_holidays.dropna(subset=['date'])
            all_holidays.append(df_holidays)
        except Exception as e:
            print(f"❌ Error loading {holidays_path.name}: {e}")
    
    if not all_holidays:
        print("⚠️  No holiday data loaded")
        return None
    
    # Combine all holiday dataframes
    combined_holidays = pd.concat(all_holidays, ignore_index=True)
    combined_holidays = combined_holidays.drop_duplicates(subset=['date'])
    combined_holidays['is_holiday'] = 1
    
    print(f"🎉 Total unique holidays loaded: {len(combined_holidays)}")
    return combined_holidays[['date', 'is_holiday']]

def load_and_process_data(csv_folder, holidays_df=None):
    """Load all CSV files and process them into a unified dataset"""
    csv_folder = Path(csv_folder)
    all_data = []
    
    print("Loading CSV files...")
    csv_files = list(csv_folder.glob('*.csv'))
    
    if not csv_files:
        print(f"❌ No CSV files found in '{csv_folder}'")
        return pd.DataFrame()
    
    for csv_file in csv_files:
        try:
            # Parse date information from filename
            year, month, week = parse_date_from_filename(csv_file.name)
            
            if year is None or month is None or week is None:
                print(f"⚠️  Skipping {csv_file.name} - couldn't parse date")
                continue
            
            # Read CSV
            df = pd.read_csv(csv_file)
            
            # Find the correct columns (skip header rows)
            # Look for rows with fish data (has Sinhala name and Common name)
            for idx, row in df.iterrows():
                if idx < 3:  # Skip first 3 header rows
                    continue
                
                # Extract fish information
                try:
                    sinhala_name = str(row.iloc[1]) if pd.notna(row.iloc[1]) else None
                    common_name = str(row.iloc[2]) if pd.notna(row.iloc[2]) else None
                    
                    if sinhala_name and common_name and sinhala_name != 'nan' and common_name != 'nan':
                        # Get current year price (usually column 5)
                        price = None
                        for col_idx in [5, 4, 3]:  # Try different columns for price
                            try:
                                price_val = row.iloc[col_idx]
                                if pd.notna(price_val) and str(price_val).replace('.', '').isdigit():
                                    price = float(price_val)
                                    break
                            except:
                                continue
                        
                        if price and price > 0:
                            all_data.append({
                                'year': year,
                                'month': month,
                                'week': week,
                                'sinhala_name': sinhala_name.strip(),
                                'common_name': common_name.strip(),
                                'price': price
                            })
                except:
                    continue
            
            print(f"✅ Loaded: {csv_file.name} ({year}-{month:02d}, Week {week})")
            
        except Exception as e:
            print(f"❌ Error loading {csv_file.name}: {str(e)}")
    
    # Create DataFrame
    df_all = pd.DataFrame(all_data)
    print(f"\n📊 Total records loaded: {len(df_all)}")
    
    if len(df_all) > 0:
        print(f"📅 Date range: {df_all['year'].min()}-{df_all['year'].max()}")
        print(f"🐟 Unique fish types: {df_all['sinhala_name'].nunique()}")
        
        # Add date column for holiday merge
        df_all['date'] = pd.to_datetime(
            df_all['year'].astype(str) + '-' + 
            df_all['month'].astype(str).str.zfill(2) + '-01'
        ) + pd.to_timedelta((df_all['week'] - 1) * 7, unit='d')
        
        # Merge with holidays
        if holidays_df is not None:
            df_all = df_all.merge(holidays_df, on='date', how='left')
            df_all['is_holiday'] = df_all['is_holiday'].fillna(0).astype(int)
            print(f"🎉 Holiday data merged: {df_all['is_holiday'].sum()} holiday records")
        else:
            df_all['is_holiday'] = 0
    
    return df_all

def create_features(df):
    """Create features for machine learning"""
    df = df.copy()
    
    # Encode fish names
    le_sinhala = LabelEncoder()
    le_common = LabelEncoder()
    
    df['sinhala_encoded'] = le_sinhala.fit_transform(df['sinhala_name'])
    df['common_encoded'] = le_common.fit_transform(df['common_name'])
    
    # Create additional time-based features
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    df['week_sin'] = np.sin(2 * np.pi * df['week'] / 4)
    df['week_cos'] = np.cos(2 * np.pi * df['week'] / 4)
    
    # Add season feature
    df['season'] = df['month'].apply(lambda x: 
        1 if x in [12, 1, 2] else  # Winter
        2 if x in [3, 4, 5] else    # Spring
        3 if x in [6, 7, 8] else    # Summer
        4                            # Fall
    )
    
    return df, le_sinhala, le_common

def train_model(df):
    """Train the price prediction model"""
    print("\n" + "="*60)
    print("TRAINING MODEL")
    print("="*60)
    
    # Create features
    df_processed, le_sinhala, le_common = create_features(df)
    
    # Feature columns - now including is_holiday
    feature_cols = ['year', 'month', 'week', 'sinhala_encoded', 'common_encoded',
                    'month_sin', 'month_cos', 'week_sin', 'week_cos', 'season', 'is_holiday']
    
    X = df_processed[feature_cols]
    y = df_processed['price']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"\n📊 Training samples: {len(X_train)}")
    print(f"📊 Testing samples: {len(X_test)}")
    
    # Train multiple models and ensemble
    print("\n🔄 Training Random Forest model...")
    rf_model = RandomForestRegressor(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    
    print("🔄 Training Gradient Boosting model...")
    gb_model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=7,
        learning_rate=0.1,
        random_state=42
    )
    gb_model.fit(X_train, y_train)
    
    # Evaluate models
    print("\n" + "-"*60)
    print("MODEL EVALUATION")
    print("-"*60)
    
    rf_pred = rf_model.predict(X_test)
    gb_pred = gb_model.predict(X_test)
    
    # Ensemble prediction (average of both models)
    ensemble_pred = (rf_pred + gb_pred) / 2
    
    # Calculate metrics
    mae_rf = mean_absolute_error(y_test, rf_pred)
    mae_gb = mean_absolute_error(y_test, gb_pred)
    mae_ensemble = mean_absolute_error(y_test, ensemble_pred)
    
    r2_rf = r2_score(y_test, rf_pred)
    r2_gb = r2_score(y_test, gb_pred)
    r2_ensemble = r2_score(y_test, ensemble_pred)
    
    print(f"\n📈 Random Forest:")
    print(f"   MAE: Rs. {mae_rf:.2f}")
    print(f"   R² Score: {r2_rf:.4f}")
    
    print(f"\n📈 Gradient Boosting:")
    print(f"   MAE: Rs. {mae_gb:.2f}")
    print(f"   R² Score: {r2_gb:.4f}")
    
    print(f"\n📈 Ensemble Model:")
    print(f"   MAE: Rs. {mae_ensemble:.2f}")
    print(f"   R² Score: {r2_ensemble:.4f}")
    
    return rf_model, gb_model, le_sinhala, le_common, df_processed

def save_model(rf_model, gb_model, le_sinhala, le_common, fish_data):
    """Save trained model and encoders"""
    # Get script directory and navigate to backend/models
    script_dir = Path(__file__).parent
    models_folder = script_dir / "models"
    models_folder.mkdir(exist_ok=True)
    
    print("\n" + "="*60)
    print("SAVING MODEL")
    print("="*60)
    
    # Save models
    with open(models_folder / "rf_model.pkl", "wb") as f:
        pickle.dump(rf_model, f)
    print("✅ Saved: Random Forest model")
    
    with open(models_folder / "gb_model.pkl", "wb") as f:
        pickle.dump(gb_model, f)
    print("✅ Saved: Gradient Boosting model")
    
    # Save encoders
    with open(models_folder / "le_sinhala.pkl", "wb") as f:
        pickle.dump(le_sinhala, f)
    print("✅ Saved: Sinhala name encoder")
    
    with open(models_folder / "le_common.pkl", "wb") as f:
        pickle.dump(le_common, f)
    print("✅ Saved: Common name encoder")
    
    # Save fish names list
    fish_names = fish_data[['sinhala_name', 'common_name']].drop_duplicates()
    fish_names.to_csv(models_folder / "fish_names.csv", index=False)
    print("✅ Saved: Fish names list")
    
    print(f"\n📁 All models saved in '{models_folder}' folder")

def main():
    print("="*60)
    print("FISH PRICE PREDICTION MODEL TRAINING")
    print("="*60)
    
    # Get script directory (backend folder)
    script_dir = Path(__file__).parent
    backend_dir = script_dir
    
    # Load holidays data
    holidays_df = load_holidays(backend_dir)
    
    # Load data from correct path
    csv_folder = backend_dir / "dataset" / "raw" / "csv"
    
    print(f"\n📁 Looking for CSV files in: {csv_folder}")
    
    if not csv_folder.exists():
        print(f"\n❌ CSV folder does not exist: {csv_folder}")
        print("Please run 'xl_to_csv_converter.py' first to convert Excel files.")
        return
    
    # Load data with holidays
    df = load_and_process_data(csv_folder, holidays_df)
    
    if len(df) == 0:
        print("\n❌ No data loaded. Please check your CSV files.")
        return
    
    # Train model
    rf_model, gb_model, le_sinhala, le_common, df_processed = train_model(df)
    
    # Save model
    save_model(rf_model, gb_model, le_sinhala, le_common, df_processed)
    
    print("\n" + "="*60)
    print("✅ MODEL TRAINING COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\nYou can now run 'PricePredict.py' to make predictions.")

if __name__ == "__main__":
    main()
