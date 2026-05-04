"""
Price Prediction module

This module handles loading trained models and making price predictions.
"""

import pickle
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

from ..config import (
    RF_MODEL_PATH, GB_MODEL_PATH,
    FEATURE_NAMES_PATH, LE_SINHALA_PATH,
    DATA_DIR, ENSEMBLE_METHOD,
    RF_WEIGHT, XGB_WEIGHT
)


class FishPricePredictor:
    """Load and use trained models for price prediction"""
    
    def __init__(self):
        """Initialize the predictor with trained models"""
        self.rf_model = None
        self.xgb_model = None
        self.feature_names = None
        self.le_sinhala = None
        self.fish_names_df = None
        
        self.load_models()
    
    def load_models(self):
        """Load trained models and encoders"""
        try:
            # Load models
            if RF_MODEL_PATH.exists():
                with open(RF_MODEL_PATH, "rb") as f:
                    self.rf_model = pickle.load(f)
                print("✅ Loaded Random Forest model")
            else:
                print(f"⚠ RF model not found: {RF_MODEL_PATH}")
            
            if GB_MODEL_PATH.exists():
                with open(GB_MODEL_PATH, "rb") as f:
                    self.xgb_model = pickle.load(f)
                print("✅ Loaded XGBoost model")
            else:
                print(f"⚠ XGBoost model not found: {GB_MODEL_PATH}")
            
            # Load feature names
            if FEATURE_NAMES_PATH.exists():
                with open(FEATURE_NAMES_PATH, "rb") as f:
                    self.feature_names = pickle.load(f)
                print(f"✅ Loaded feature names ({len(self.feature_names)} features)")
            else:
                print(f"⚠ Feature names not found: {FEATURE_NAMES_PATH}")
            
            # Load fish encoder
            if LE_SINHALA_PATH.exists():
                with open(LE_SINHALA_PATH, "rb") as f:
                    self.le_sinhala = pickle.load(f)
                print("✅ Loaded Sinhala name encoder")
            else:
                print(f"⚠ Sinhala encoder not found: {LE_SINHALA_PATH}")
            
            # Load fish names CSV
            fish_names_path = DATA_DIR / "fish_names.csv"
            if fish_names_path.exists():
                self.fish_names_df = pd.read_csv(fish_names_path)
                print(f"✅ Loaded {len(self.fish_names_df)} fish species")
            
            return True
            
        except Exception as e:
            print(f"❌ Error loading models: {e}")
            return False
    
    def get_fish_list(self):
        """Get list of available fish species"""
        if self.fish_names_df is not None:
            return self.fish_names_df['sinhala_name'].tolist()
        return []
    
    def get_fish_common_name(self, sinhala_name):
        """Get common English name for a fish"""
        if self.fish_names_df is not None:
            try:
                common = self.fish_names_df[
                    self.fish_names_df['sinhala_name'] == sinhala_name
                ]['common_name'].iloc[0]
                return common
            except:
                pass
        return ""
    
    def create_features(self, date, fish_name):
        """Create feature vector for prediction"""
        year = date.year
        month = date.month
        day = date.day
        day_of_week = date.weekday()
        week_of_year = date.isocalendar()[1]
        
        # Season
        if month in [12, 1, 2]:
            season = 1
        elif month in [3, 4, 5]:
            season = 2
        elif month in [6, 7, 8]:
            season = 3
        else:
            season = 4
        
        # Sri Lankan fishing seasons
        is_waragam_west = 1 if month in [5, 6, 7, 8, 9] else 0
        is_waragam_east = 1 if month in [10, 11, 12, 1] else 0
        is_awaragam = 1 if month in [2, 3, 4] else 0
        
        # Fishing season consolidation
        if month in [5, 6, 7, 8, 9]:
            fishing_season = 1
        elif month in [10, 11, 12, 1]:
            fishing_season = 2
        else:
            fishing_season = 0
        
        is_rough_sea_season = 1 if (is_waragam_west or is_waragam_east) else 0
        
        # Weekend indicator
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Fish encoding
        if self.le_sinhala is not None:
            try:
                fish_encoded = self.le_sinhala.transform([fish_name])[0]
            except:
                fish_encoded = 0
        else:
            fish_encoded = 0
        
        # Create feature dictionary
        features_dict = {
            'fish_encoded': fish_encoded,
            'day_of_week': day_of_week,
            'month': month,
            'year': year,
            'week_of_year': week_of_year,
            'month_sin': np.sin(2 * np.pi * month / 12),
            'month_cos': np.cos(2 * np.pi * month / 12),
            'season': season,
            'is_weekend': is_weekend,
            'is_festival_day': 0,
            'before_festival_window': 0,
            'days_to_festival': 999,
            'is_waragam_west': is_waragam_west,
            'is_waragam_east': is_waragam_east,
            'is_awaragam': is_awaragam,
            'fishing_season': fishing_season,
            'is_rough_sea_season': is_rough_sea_season,
            'weather_effect': 0,
            'poya_effect': 0,
            'festival_effect': 0,
        }
        
        # Ensure all trained features exist
        feature_row = {name: features_dict.get(name, 0) for name in self.feature_names}
        features = pd.DataFrame([feature_row])
        
        return features
    
    def predict(self, fish_name, date=None):
        """Predict price for a fish on a specific date"""
        if date is None:
            date = datetime.now()
        elif isinstance(date, str):
            date = datetime.fromisoformat(date)
        
        if self.rf_model is None or self.xgb_model is None:
            print("❌ Models not loaded")
            return None
        
        try:
            features = self.create_features(date, fish_name)
            
            # Make predictions
            rf_pred = self.rf_model.predict(features)[0]
            xgb_pred = self.xgb_model.predict(features)[0]
            
            # Ensemble prediction
            if ENSEMBLE_METHOD == "average":
                ensemble_pred = (rf_pred + xgb_pred) / 2
            else:  # weighted
                ensemble_pred = (RF_WEIGHT * rf_pred) + (XGB_WEIGHT * xgb_pred)
            
            return {
                'price': ensemble_pred,
                'rf_prediction': rf_pred,
                'xgb_prediction': xgb_pred,
                'date': date,
                'fish_name': fish_name,
            }
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return None
    
    def predict_range(self, fish_name, date, days_before=15, days_after=15):
        """Predict prices for a range of dates"""
        predictions = []
        
        for day_offset in range(-days_before, days_after + 1):
            pred_date = date + timedelta(days=day_offset)
            pred = self.predict(fish_name, pred_date)
            if pred:
                predictions.append(pred)
        
        return predictions


def main():
    """Test the predictor"""
    predictor = FishPricePredictor()
    
    # Get available fish
    fish_list = predictor.get_fish_list()
    print(f"\n📌 Available fish species: {len(fish_list)}")
    for fish in fish_list[:5]:
        print(f"   - {fish}")
    
    # Make a test prediction
    if fish_list:
        test_fish = fish_list[0]
        pred = predictor.predict(test_fish)
        if pred:
            print(f"\n🎯 Test prediction for {test_fish}")
            print(f"   Price: Rs. {pred['price']:.2f}")
            print(f"   Date: {pred['date'].strftime('%Y-%m-%d')}")


if __name__ == "__main__":
    main()
