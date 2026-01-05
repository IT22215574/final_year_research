# ==========================================================
# PRODUCTION TRIP COST PREDICTOR
# For Smart Fisher Lanka Backend Integration
# ==========================================================

import joblib
import pandas as pd
import numpy as np
import json
from typing import Dict, List, Optional
import warnings
warnings.filterwarnings('ignore')


class TripCostPredictor:
    """
    Production-ready predictor for fishing trip base costs.
    Predicts: fuel_cost_lkr, ice_cost_lkr, water_cost_lkr, total_base_cost_lkr
    """
    
    def __init__(self, model_path: str = "production_model/trip_cost_predictor.pkl",
                 metadata_path: str = "production_model/model_metadata.json",
                 silent: bool = False):
        """
        Initialize the predictor by loading the trained model and metadata.
        
        Args:
            model_path: Path to the trained model pickle file
            metadata_path: Path to the model metadata JSON file
            silent: If True, suppress all print statements
        """
        self.silent = silent
        
        if not self.silent:
            print("Loading Trip Cost Predictor...")
        
        # Load the trained model
        try:
            self.model = joblib.load(model_path)
            if not self.silent:
                print(f"Model loaded from: {model_path}")
        except Exception as e:
            raise Exception(f"Failed to load model: {e}")
        
        # Load metadata
        try:
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)
            if not self.silent:
                print(f"Metadata loaded from: {metadata_path}")
        except Exception as e:
            raise Exception(f"Failed to load metadata: {e}")
        
        # Extract feature information
        self.feature_names = self.metadata['data_info']['feature_names']
        self.target_names = self.metadata['data_info']['target_names']
        self.categorical_features = self.metadata['data_info']['categorical_features']
        self.numerical_features = self.metadata['data_info']['numerical_features']
        
        # Get model performance metrics for confidence intervals
        perf = self.metadata['model_info']['performance']
        self.avg_smape = perf['avg_test_smape']
        self.avg_mae = perf['avg_test_mae']
        
        if not self.silent:
            print(f"Predictor ready!")
            print(f"   Features: {len(self.feature_names)}")
            print(f"   Targets: {len(self.target_names)}")
            print(f"   Model: {self.metadata['model_info']['model_name']}")
            print(f"   Test R²: {perf['avg_test_r2']:.4f}")
            print(f"   Test SMAPE: {self.avg_smape:.2f}%")
    
    def prepare_input(self, trip_data: Dict) -> pd.DataFrame:
        """
        Prepare input data for prediction.
        Handles missing values with sensible defaults.
        
        Args:
            trip_data: Dictionary with trip information
            
        Returns:
            DataFrame ready for prediction
        """
        # Default values based on typical trips
        defaults = {
            'boat_type': 'IMUL',
            'engine_hp': 75,
            'fuel_type': 'Diesel',
            'crew_size': 3,
            'ice_capacity_kg': 200,
            'water_capacity_L': 100,
            'avg_speed_kmh': 12.0,
            'trip_days': 1,
            'trip_month': 1,
            'distance_km': 50,
            'wind_kph': 15,
            'wave_height_m': 1.0,
            'weather_factor': 1.0,
            'region': 'West',
            'is_multi_day': False,
            'has_engine': True,
            'is_deep_sea': False
        }
        
        # Create input dictionary with defaults
        input_dict = {}
        for feature in self.feature_names:
            input_dict[feature] = trip_data.get(feature, defaults.get(feature))
        
        # Convert to DataFrame
        df = pd.DataFrame([input_dict])
        
        # Validate required features
        missing_features = set(self.feature_names) - set(df.columns)
        if missing_features:
            raise ValueError(f"Missing required features: {missing_features}")
        
        return df[self.feature_names]
    
    def predict(self, trip_data: Dict, include_confidence: bool = True) -> Dict:
        """
        Predict trip costs for a single trip.
        
        Args:
            trip_data: Dictionary with trip information
            include_confidence: Whether to include confidence intervals
            
        Returns:
            Dictionary with predictions and confidence intervals
        """
        # Prepare input
        X = self.prepare_input(trip_data)
        
        # Make prediction
        predictions = self.model.predict(X)[0]
        
        # Create result dictionary
        result = {
            'predictions': {},
            'input_summary': {}
        }
        
        # Add predictions
        for i, target in enumerate(self.target_names):
            result['predictions'][target] = float(predictions[i])
        
        # Add confidence intervals based on SMAPE performance
        if include_confidence:
            result['confidence_intervals'] = {}
            for i, target in enumerate(self.target_names):
                pred_value = predictions[i]
                # Use SMAPE as uncertainty estimate (converted to absolute value)
                uncertainty = pred_value * (self.avg_smape / 100)
                
                result['confidence_intervals'][target] = {
                    'lower': float(max(0, pred_value - uncertainty)),
                    'upper': float(pred_value + uncertainty),
                    'confidence_level': 0.68  # ~1 SMAPE (~1 std dev)
                }
        
        # Add input summary
        result['input_summary'] = {
            'boat_type': trip_data.get('boat_type', 'IMUL'),
            'trip_days': trip_data.get('trip_days', 1),
            'distance_km': trip_data.get('distance_km', 50),
            'engine_hp': trip_data.get('engine_hp', 75)
        }
        
        # Add model metadata
        result['model_info'] = {
            'model_name': self.metadata['model_info']['model_name'],
            'model_r2': self.metadata['model_info']['performance']['avg_test_r2'],
            'model_smape': self.avg_smape,
            'version': self.metadata['model_info']['version']
        }
        
        return result
    
    def predict_batch(self, trips_data: List[Dict], include_confidence: bool = False) -> List[Dict]:
        """
        Predict costs for multiple trips efficiently.
        
        Args:
            trips_data: List of trip dictionaries
            include_confidence: Whether to include confidence intervals
            
        Returns:
            List of prediction dictionaries
        """
        results = []
        
        for trip_data in trips_data:
            try:
                result = self.predict(trip_data, include_confidence)
                result['status'] = 'success'
            except Exception as e:
                result = {
                    'status': 'error',
                    'error': str(e),
                    'input_summary': trip_data
                }
            
            results.append(result)
        
        return results
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model."""
        return {
            'model_name': self.metadata['model_info']['model_name'],
            'training_date': self.metadata['model_info']['training_date'],
            'training_samples': self.metadata['model_info']['training_samples'],
            'performance': self.metadata['model_info']['performance'],
            'features': {
                'total': len(self.feature_names),
                'numerical': len(self.numerical_features),
                'categorical': len(self.categorical_features),
                'names': self.feature_names
            },
            'targets': self.target_names,
            'version': self.metadata['model_info']['version']
        }


# ==========================================================
# USAGE EXAMPLES
# ==========================================================

if __name__ == "__main__":
    print("\n" + "="*70)
    print("TRIP COST PREDICTOR - USAGE EXAMPLES")
    print("="*70)
    
    # Initialize predictor
    predictor = TripCostPredictor(
        model_path="production_model/trip_cost_predictor.pkl",
        metadata_path="production_model/model_metadata.json"
    )
    
    # Example 1: Basic prediction
    print("\n" + "="*70)
    print("EXAMPLE 1: Basic Single-Day Trip (IMUL Boat)")
    print("="*70)
    
    trip1 = {
        'boat_type': 'IMUL',
        'engine_hp': 75,
        'fuel_type': 'Diesel',
        'crew_size': 3,
        'ice_capacity_kg': 200,
        'water_capacity_L': 100,
        'avg_speed_kmh': 12.0,
        'trip_days': 1,
        'trip_month': 3,
        'distance_km': 50,
        'wind_kph': 15,
        'wave_height_m': 1.0,
        'weather_factor': 1.0,
        'region': 'West',
        'is_multi_day': False,
        'has_engine': True,
        'is_deep_sea': False
    }
    
    result1 = predictor.predict(trip1, include_confidence=True)
    
    print("\n📊 Predictions:")
    for target, value in result1['predictions'].items():
        print(f"   {target}: LKR {value:,.2f}")
        if 'confidence_intervals' in result1:
            ci = result1['confidence_intervals'][target]
            print(f"      95% CI: [LKR {ci['lower']:,.2f} - LKR {ci['upper']:,.2f}]")
    
    # Example 2: Multi-day trip
    print("\n" + "="*70)
    print("EXAMPLE 2: Multi-Day Deep Sea Trip (MDBT Boat)")
    print("="*70)
    
    trip2 = {
        'boat_type': 'MDBT',
        'engine_hp': 120,
        'fuel_type': 'Diesel',
        'crew_size': 5,
        'ice_capacity_kg': 800,
        'water_capacity_L': 500,
        'avg_speed_kmh': 15.0,
        'trip_days': 5,
        'trip_month': 6,
        'distance_km': 300,
        'wind_kph': 25,
        'wave_height_m': 2.0,
        'weather_factor': 1.3,
        'region': 'South',
        'is_multi_day': True,
        'has_engine': True,
        'is_deep_sea': True
    }
    
    result2 = predictor.predict(trip2, include_confidence=True)
    
    print("\n📊 Predictions:")
    for target, value in result2['predictions'].items():
        print(f"   {target}: LKR {value:,.2f}")
    
    # Example 3: Batch prediction
    print("\n" + "="*70)
    print("EXAMPLE 3: Batch Prediction (3 trips)")
    print("="*70)
    
    trips_batch = [trip1, trip2, {
        'boat_type': 'OBFR',
        'engine_hp': 40,
        'trip_days': 1,
        'distance_km': 30,
        'crew_size': 2
    }]
    
    results_batch = predictor.predict_batch(trips_batch, include_confidence=False)
    
    for i, result in enumerate(results_batch, 1):
        if result['status'] == 'success':
            total_cost = result['predictions']['total_base_cost_lkr']
            print(f"\n   Trip {i}: LKR {total_cost:,.2f}")
        else:
            print(f"\n   Trip {i}: ERROR - {result['error']}")
    
    # Example 4: Model information
    print("\n" + "="*70)
    print("EXAMPLE 4: Model Information")
    print("="*70)
    
    info = predictor.get_model_info()
    print(f"\n📊 Model Details:")
    print(f"   Name: {info['model_name']}")
    print(f"   Version: {info['version']}")
    print(f"   Training Date: {info['training_date']}")
    print(f"   Test R²: {info['performance']['avg_test_r2']:.4f}")
    print(f"   Test SMAPE: {info['performance']['avg_test_smape']:.2f}%")
    print(f"   Features: {info['features']['total']}")
    print(f"   Targets: {len(info['targets'])}")
    
    print("\n" + "="*70)
    print("✅ ALL EXAMPLES COMPLETED!")
    print("="*70)
