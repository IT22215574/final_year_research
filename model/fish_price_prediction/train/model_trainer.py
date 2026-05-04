"""
Training module for Fish Price Prediction models

This module handles training and evaluation of machine learning models for fish price prediction.
"""

import os
import pandas as pd
import numpy as np
from pathlib import Path
import pickle
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, mean_absolute_percentage_error
from sklearn.model_selection import cross_val_score
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# Set matplotlib style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

from ..config import (
    TRAIN_DIR, DATA_DIR, MODELS_DIR,
    FEATURES_DATASET_PATH, FISH_NAMES_PATH,
    RF_MODEL_PATH, GB_MODEL_PATH,
    FEATURE_NAMES_PATH, LE_SINHALA_PATH,
    TRAIN_TEST_SPLIT, RANDOM_STATE,
    RF_PARAMS, XGB_PARAMS, CV_FOLDS, METRICS
)


class FishPriceModelTrainer:
    """Train and evaluate fish price prediction models"""
    
    def __init__(self):
        """Initialize the trainer"""
        self.rf_model = None
        self.xgb_model = None
        self.feature_names = None
        self.le_sinhala = None
        self.df = None
        
    def load_features_dataset(self, backend_dir=None):
        """Load the processed features dataset"""
        if backend_dir is None:
            # Look for dataset in parent directories
            backend_dir = Path(__file__).parent.parent.parent.parent / "Backend"
        
        features_path = Path(backend_dir) / "dataset" / "processed" / "features_dataset.csv"
        
        if not features_path.exists():
            print(f"❌ Features dataset not found: {features_path}")
            print("Please run the pipeline: python Backend/run_excel_pipeline.py")
            return None
        
        try:
            df = pd.read_csv(features_path)
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            print(f"✅ Loaded features dataset: {len(df)} records")
            print(f"📋 Columns: {list(df.columns)}")
            self.df = df
            return df
        except Exception as e:
            print(f"❌ Error loading features dataset: {e}")
            return None

    def create_ml_features(self, df):
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
        
        # Seasonal classification
        df['season'] = df['month'].apply(lambda x:
            1 if x in [12, 1, 2] else  # DJF
            2 if x in [3, 4, 5] else   # MAM
            3 if x in [6, 7, 8] else   # JJA
            4                           # SON
        )

        # Sri Lankan fishing seasons
        df['is_waragam_west'] = df['month'].apply(lambda x: 1 if x in [5, 6, 7, 8, 9] else 0)
        df['is_waragam_east'] = df['month'].apply(lambda x: 1 if x in [10, 11, 12, 1] else 0)
        df['is_awaragam'] = df['month'].apply(lambda x: 1 if x in [2, 3, 4] else 0)

        # Consolidated fishing season
        def _fishing_season(m):
            if m in [5, 6, 7, 8, 9]:    return 1
            if m in [10, 11, 12, 1]:    return 2
            return 0
        df['fishing_season'] = df['month'].apply(_fishing_season)

        # Rough sea indicator
        df['is_rough_sea_season'] = ((df['is_waragam_west'] == 1) | (df['is_waragam_east'] == 1)).astype(int)
        
        # Weekend indicator
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        return df

    def prepare_training_data(self, df):
        """Prepare data for training"""
        print("\n" + "="*60)
        print("PREPARING TRAINING DATA")
        print("="*60)
        
        # Create features
        df_processed = self.create_ml_features(df)
        
        # Encode fish names
        self.le_sinhala = LabelEncoder()
        
        if 'sinhala_name' in df_processed.columns:
            df_processed['fish_encoded'] = self.le_sinhala.fit_transform(df_processed['sinhala_name'])
            print(f"✅ Encoded {len(self.le_sinhala.classes_)} unique fish species")
            print(f"   Species: {', '.join(self.le_sinhala.classes_[:10])}")
        else:
            df_processed['fish_encoded'] = 0
            self.le_sinhala = None

        # Prepare features (all numeric columns except target)
        exclude_cols = ['date', 'sinhala_name', 'common_name', 'wholesale_price']
        feature_cols = [col for col in df_processed.columns if col not in exclude_cols and pd.api.types.is_numeric_dtype(df_processed[col])]
        
        X = df_processed[feature_cols]
        y = df_processed['wholesale_price'] if 'wholesale_price' in df_processed.columns else df_processed.get('price', df_processed.iloc[:, -1])
        
        # Handle missing values
        X = X.fillna(X.mean())
        y = y.fillna(y.mean())
        
        self.feature_names = X.columns.tolist()
        
        print(f"✅ Features prepared: {len(self.feature_names)} features")
        print(f"   Features: {self.feature_names[:10]}...")
        print(f"✅ Target: {len(y)} samples, Mean price: Rs. {y.mean():.2f}")
        
        return X, y

    def train_models(self, X, y):
        """Train the ensemble models"""
        print("\n" + "="*60)
        print("TRAINING MODELS")
        print("="*60)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=TRAIN_TEST_SPLIT, random_state=RANDOM_STATE
        )
        
        print(f"\n✅ Data split:")
        print(f"   Training: {len(X_train)} samples")
        print(f"   Testing: {len(X_test)} samples")
        
        # Train Random Forest
        print("\n🔄 Training Random Forest...")
        self.rf_model = RandomForestRegressor(**RF_PARAMS)
        self.rf_model.fit(X_train, y_train)
        rf_pred = self.rf_model.predict(X_test)
        rf_mae = mean_absolute_error(y_test, rf_pred)
        rf_r2 = r2_score(y_test, rf_pred)
        print(f"   ✅ RF - MAE: {rf_mae:.2f}, R²: {rf_r2:.4f}")
        
        # Train XGBoost
        print("\n🔄 Training XGBoost...")
        self.xgb_model = XGBRegressor(**XGB_PARAMS)
        self.xgb_model.fit(X_train, y_train)
        xgb_pred = self.xgb_model.predict(X_test)
        xgb_mae = mean_absolute_error(y_test, xgb_pred)
        xgb_r2 = r2_score(y_test, xgb_pred)
        print(f"   ✅ XGB - MAE: {xgb_mae:.2f}, R²: {xgb_r2:.4f}")
        
        # Cross-validation
        print(f"\n🔄 Cross-validation ({CV_FOLDS} folds)...")
        rf_cv = cross_val_score(self.rf_model, X, y, cv=CV_FOLDS, scoring='r2')
        xgb_cv = cross_val_score(self.xgb_model, X, y, cv=CV_FOLDS, scoring='r2')
        print(f"   RF CV R² Score: {rf_cv.mean():.4f} (+/- {rf_cv.std():.4f})")
        print(f"   XGB CV R² Score: {xgb_cv.mean():.4f} (+/- {xgb_cv.std():.4f})")
        
        return X_test, y_test

    def save_models(self):
        """Save trained models and encoders"""
        print("\n" + "="*60)
        print("SAVING MODELS")
        print("="*60)
        
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save models
        with open(RF_MODEL_PATH, "wb") as f:
            pickle.dump(self.rf_model, f)
        print(f"✅ Saved Random Forest model: {RF_MODEL_PATH}")
        
        with open(GB_MODEL_PATH, "wb") as f:
            pickle.dump(self.xgb_model, f)
        print(f"✅ Saved XGBoost model: {GB_MODEL_PATH}")
        
        # Save feature names
        with open(FEATURE_NAMES_PATH, "wb") as f:
            pickle.dump(self.feature_names, f)
        print(f"✅ Saved feature names: {FEATURE_NAMES_PATH}")
        
        # Save encoders
        if self.le_sinhala:
            with open(LE_SINHALA_PATH, "wb") as f:
                pickle.dump(self.le_sinhala, f)
            print(f"✅ Saved Sinhala name encoder: {LE_SINHALA_PATH}")

    def run_training_pipeline(self, backend_dir=None):
        """Run the complete training pipeline"""
        print("\n" + "🎯"*30)
        print("FISH PRICE PREDICTION MODEL TRAINING")
        print("🎯"*30)
        
        # Load data
        df = self.load_features_dataset(backend_dir)
        if df is None:
            return False
        
        # Prepare data
        X, y = self.prepare_training_data(df)
        
        # Train models
        X_test, y_test = self.train_models(X, y)
        
        # Save models
        self.save_models()
        
        print("\n" + "✅"*30)
        print("TRAINING COMPLETE!")
        print("✅"*30)
        return True


def main():
    """Main entry point for training"""
    trainer = FishPriceModelTrainer()
    trainer.run_training_pipeline()


if __name__ == "__main__":
    main()
