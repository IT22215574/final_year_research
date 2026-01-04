import os
import pandas as pd
import numpy as np
from pathlib import Path
import pickle
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# Set matplotlib style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

def load_features_dataset(backend_dir):
    """Load the processed features dataset"""
    features_path = backend_dir / "dataset" / "processed" / "features_dataset.csv"
    
    if not features_path.exists():
        print(f"❌ Features dataset not found: {features_path}")
        print("Please run the pipeline: python backend/run_excel_pipeline.py")
        return None
    
    try:
        df = pd.read_csv(features_path)
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        print(f"✅ Loaded features dataset: {len(df)} records")
        print(f"📋 Columns: {list(df.columns)}")
        return df
    except Exception as e:
        print(f"❌ Error loading features dataset: {e}")
        return None

def create_ml_features(df):
    """Create machine learning features from the dataset"""
    df = df.copy()
    
    # Time-based features
    df['day_of_week'] = df['date'].dt.dayofweek
    df['month'] = df['date'].dt.month
    df['year'] = df['date'].dt.year
    df['week_of_year'] = df['date'].dt.isocalendar().week
    
    # Cyclical encoding for month and week
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    # Season feature
    df['season'] = df['month'].apply(lambda x: 
        1 if x in [12, 1, 2] else  # Winter
        2 if x in [3, 4, 5] else    # Spring
        3 if x in [6, 7, 8] else    # Summer
        4                            # Fall
    )
    
    return df

def prepare_training_data(df):
    """Prepare data for training"""
    print("\n" + "="*60)
    print("PREPARING TRAINING DATA")
    print("="*60)
    
    # Create features
    df_processed = create_ml_features(df)
    
    # Encode fish names (CRITICAL FIX)
    le_sinhala = LabelEncoder()
    le_common = LabelEncoder()
    
    if 'sinhala_name' in df_processed.columns:
        df_processed['fish_encoded'] = le_sinhala.fit_transform(df_processed['sinhala_name'])
        print(f"✅ Encoded {len(le_sinhala.classes_)} unique fish species")
    else:
        df_processed['fish_encoded'] = 0
        le_sinhala = None
    
    # Available feature columns (INCLUDE FISH_ENCODED)
    feature_cols = [
        'fish_encoded', 'day_of_week', 'month', 'year', 'week_of_year',
        'month_sin', 'month_cos', 'season',
        'is_weekend', 'is_festival_day', 'before_festival_window',
        'days_to_festival', 'weather_effect', 'poya_effect', 'festival_effect',
        'temp_c_mean', 'humidity_mean', 'wind_speed_max', 'rainfall_sum', 'bad_weather_any'
    ]
    
    # Filter to columns that exist
    available_cols = [col for col in feature_cols if col in df_processed.columns]
    print(f"\n📊 Using features: {available_cols}")
    
    X = df_processed[available_cols].fillna(0)
    
    # Target variable: price
    if 'price' not in df_processed.columns:
        print("❌ 'price' column not found in dataset")
        return None, None, None, None, None
    
    y = df_processed['price']
    
    # Remove invalid prices
    mask = (y > 0) & (y.notna())
    X = X[mask]
    y = y[mask]
    
    print(f"📊 Valid training samples: {len(X)}")
    print(f"💰 Price range: Rs. {y.min():.2f} - Rs. {y.max():.2f}")
    
    return X, y, available_cols, df_processed, le_sinhala

def train_model(X, y):
    """Train ensemble prediction models"""
    print("\n" + "="*60)
    print("TRAINING MODELS")
    print("="*60)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"\n📊 Training samples: {len(X_train)}")
    print(f"📊 Testing samples: {len(X_test)}")
    
    # Train Random Forest
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
    
    # Train Gradient Boosting
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
    ensemble_pred = (rf_pred + gb_pred) / 2
    
    # Metrics
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
    
    # Store metrics for visualization
    metrics = {
        'models': ['Random Forest', 'Gradient Boosting', 'Ensemble'],
        'mae': [mae_rf, mae_gb, mae_ensemble],
        'r2': [r2_rf, r2_gb, r2_ensemble],
        'predictions': {
            'rf': rf_pred,
            'gb': gb_pred,
            'ensemble': ensemble_pred
        },
        'y_test': y_test
    }
    
    return rf_model, gb_model, X.columns.tolist(), metrics

def visualize_model_accuracy(metrics, backend_dir):
    """Create and save accuracy visualization in presentation style"""
    print("\n" + "="*60)
    print("GENERATING ACCURACY CHART")
    print("="*60)
    
    # Create output directory
    charts_folder = backend_dir / "models"
    charts_folder.mkdir(exist_ok=True)
    
    # Create figure
    fig, ax = plt.subplots(figsize=(12, 8))
    fig.patch.set_facecolor('#f8f9fa')
    ax.set_facecolor('#ffffff')
    
    # Convert R² scores to percentages
    accuracy_percentages = [r2 * 100 for r2 in metrics['r2']]
    
    # Colors for bars
    colors = ['#3498db', '#2ecc71', '#e74c3c']
    
    # Create horizontal bar chart
    bars = ax.barh(metrics['models'], accuracy_percentages, color=colors, alpha=0.85, height=0.6)
    
    # Add percentage labels on bars
    for i, (bar, accuracy) in enumerate(zip(bars, accuracy_percentages)):
        width = bar.get_width()
        ax.text(width + 2, bar.get_y() + bar.get_height()/2, 
                f'{accuracy:.1f}%',
                ha='left', va='center', fontsize=22, fontweight='bold', color=colors[i])
    
    # Styling
    ax.set_xlabel('Accuracy (%)', fontsize=16, fontweight='bold', color='#2c3e50')
    ax.set_title('Fish Price Prediction Model Accuracy', 
                 fontsize=20, fontweight='bold', pad=20, color='#2c3e50')
    ax.set_xlim([0, 105])
    ax.grid(axis='x', alpha=0.3, linestyle='--', linewidth=1)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    # Adjust tick labels
    ax.tick_params(axis='y', labelsize=14, colors='#2c3e50')
    ax.tick_params(axis='x', labelsize=12, colors='#2c3e50')
    
    plt.tight_layout()
    
    # Save the chart
    chart_path = charts_folder / "model_accuracy_chart.png"
    plt.savefig(chart_path, dpi=300, bbox_inches='tight', facecolor='#f8f9fa')
    print(f"\n✅ Accuracy chart saved: {chart_path}")
    
    # Display the chart
    plt.show()
    print("📊 Chart displayed successfully!")

def save_model(rf_model, gb_model, feature_names, le_sinhala):
    """Save trained models"""
    script_dir = Path(__file__).parent
    models_folder = script_dir / "models"
    models_folder.mkdir(exist_ok=True)
    
    print("\n" + "="*60)
    print("SAVING MODELS")
    print("="*60)
    
    with open(models_folder / "rf_model.pkl", "wb") as f:
        pickle.dump(rf_model, f)
    print("✅ Saved: Random Forest model")
    
    with open(models_folder / "gb_model.pkl", "wb") as f:
        pickle.dump(gb_model, f)
    print("✅ Saved: Gradient Boosting model")
    
    with open(models_folder / "feature_names.pkl", "wb") as f:
        pickle.dump(feature_names, f)
    print("✅ Saved: Feature names")
    
    # Save fish encoder
    if le_sinhala is not None:
        with open(models_folder / "le_sinhala.pkl", "wb") as f:
            pickle.dump(le_sinhala, f)
        print("✅ Saved: Fish name encoder")
    
    print(f"\n📁 All models saved in '{models_folder}' folder")

def main():
    print("="*60)
    print("FISH PRICE PREDICTION MODEL TRAINING")
    print("="*60)
    
    script_dir = Path(__file__).parent
    backend_dir = script_dir
    
    # Load features dataset
    df = load_features_dataset(backend_dir)
    
    if df is None or len(df) == 0:
        print("\n❌ Failed to load features dataset")
        return
    
    # Prepare training data
    X, y, feature_cols, df_processed, le_sinhala = prepare_training_data(df)
    
    if X is None or len(X) == 0:
        print("\n❌ Failed to prepare training data")
        return
    
    # Train models
    rf_model, gb_model, feature_names, metrics = train_model(X, y)
    
    # Visualize model accuracy
    visualize_model_accuracy(metrics, backend_dir)
    
    # Save models
    save_model(rf_model, gb_model, feature_names, le_sinhala)
    
    print("\n" + "="*60)
    print("✅ MODEL TRAINING COMPLETED SUCCESSFULLY!")
    print("="*60)

if __name__ == "__main__":
    main()
