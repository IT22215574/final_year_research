# ==========================================================
# SMART FISHER LANKA - NESTJS API INTEGRATION
# ML Model Integration for Trip Cost Prediction
# ==========================================================

import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List
import json
import os
from math import radians, sin, cos, sqrt, atan2

class TripCostMLService:
    """ML Service for trip cost prediction (to be integrated with NestJS)"""
    
    def __init__(self, model_path: str = None):
        """
        Initialize the ML service
        
        Args:
            model_path: Path to the model directory. If None, uses default location.
        """
        if model_path is None:
            model_path = os.path.join(os.path.dirname(__file__), 'production_model')
        
        # Load the trained model pipeline
        pipeline_path = os.path.join(model_path, 'trip_cost_predictor.pkl')
        self.pipeline = joblib.load(pipeline_path)
        
        # Load metadata
        metadata_path = os.path.join(model_path, 'model_metadata.json')
        with open(metadata_path, 'r') as f:
            self.metadata = json.load(f)
        
        # Extract feature names and targets
        self.feature_names = self.metadata['feature_names']
        self.target_names = self.metadata['target_names']
        
        # Price configuration (can be updated via API)
        self.price_config = self.metadata['price_config']
        
        # Boat configurations
        self.boat_configs = self.metadata['boat_configs']
        
        print(f"✅ ML Service initialized")
        print(f"   Model: {self.metadata['model_name']}")
        print(f"   Avg R² Score: {self.metadata['performance']['avg_test_r2']:.4f}")
        print(f"   Features: {len(self.feature_names)}")
        print(f"   Targets: {len(self.target_names)}")
    
    def predict_base_cost(self, trip_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict base costs for a fishing trip
        
        Expected input format (matches your API endpoint):
        {
            "boat_type": "OBFR",
            "fuel_type": "petrol",
            "trip_days": 2,
            "current_location": {"lat": 7.2090, "lon": 79.8350},
            "target_location": {"lat": 7.5090, "lon": 80.1350},
            "weather_conditions": {"wind_kph": 15, "wave_height_m": 1.2},
            "month": 6,
            "engine_hp": 60,
            "crew_size": 4,
            "ice_capacity_kg": 500,
            "water_capacity_L": 200
        }
        
        Returns:
        {
            "success": True,
            "distance_km": 50.23,
            "predictions": {
                "fuel_cost_lkr": 15000,
                "ice_cost_lkr": 6000,
                "water_cost_lkr": 1000,
                "total_base_cost_lkr": 22000
            },
            "confidence": {...},
            "metadata": {...}
        }
        """
        try:
            # Calculate distance from coordinates (if provided)
            if 'current_location' in trip_data and 'target_location' in trip_data:
                distance_km = self._calculate_distance(
                    trip_data['current_location'],
                    trip_data['target_location']
                )
            else:
                distance_km = trip_data.get('distance_km', 50)
            
            # Prepare feature vector
            features = self._prepare_features(trip_data, distance_km)
            
            # Make prediction using the pipeline
            predictions = self.pipeline.predict(features)[0]
            
            # Format response
            response = {
                "success": True,
                "distance_km": round(distance_km, 2),
                "predictions": {},
                "breakdown": {},
                "confidence": {},
                "metadata": {}
            }
            
            # Map predictions to target names
            for i, target in enumerate(self.target_names):
                response["predictions"][target] = round(float(predictions[i]), 2)
            
            # Extract total cost
            if 'total_base_cost_lkr' in response["predictions"]:
                total_cost = response["predictions"]['total_base_cost_lkr']
            elif 'base_cost_LKR' in response["predictions"]:
                total_cost = response["predictions"]['base_cost_LKR']
            else:
                # Sum individual costs
                total_cost = sum(response["predictions"].values())
            
            # Add cost breakdown
            response["breakdown"] = {
                "fuel": {
                    "cost": response["predictions"].get('fuel_cost_lkr', 
                                                       response["predictions"].get('fuel_cost_LKR', 0)),
                    "type": trip_data.get('fuel_type', 'diesel'),
                    "price_per_liter": self.price_config['fuel_prices'].get(
                        trip_data.get('fuel_type', 'diesel'), 0
                    )
                },
                "ice": {
                    "cost": response["predictions"].get('ice_cost_lkr',
                                                       response["predictions"].get('ice_cost_LKR', 0)),
                    "price_per_kg": self.price_config['ice_price_per_kg']
                },
                "water": {
                    "cost": response["predictions"].get('water_cost_lkr',
                                                       response["predictions"].get('water_cost_LKR', 0)),
                    "price_per_liter": self.price_config['water_price_per_liter']
                }
            }
            
            # Confidence intervals (±15%)
            response["confidence"] = {
                "total_cost": round(total_cost, 2),
                "lower_bound": round(total_cost * 0.85, 2),
                "upper_bound": round(total_cost * 1.15, 2),
                "margin_percent": 15.0,
                "range": f"LKR {round(total_cost * 0.85):,} - LKR {round(total_cost * 1.15):,}"
            }
            
            # Metadata
            boat_type = trip_data.get('boat_type', 'Unknown')
            response["metadata"] = {
                "model": self.metadata['model_name'],
                "model_version": self.metadata['timestamp'],
                "boat_type": boat_type,
                "boat_name": self.boat_configs.get(boat_type, {}).get('name', 'Unknown'),
                "fuel_type": trip_data.get('fuel_type', 'diesel'),
                "trip_duration_days": trip_data.get('trip_days', 1),
                "distance_km": distance_km,
                "engine_hp": trip_data.get('engine_hp', 0)
            }
            
            return response
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "predictions": None
            }
    
    def predict_batch(self, trips_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Predict costs for multiple trips"""
        results = []
        for trip in trips_data:
            results.append(self.predict_base_cost(trip))
        return results
    
    def _calculate_distance(self, loc1: Dict[str, float], loc2: Dict[str, float]) -> float:
        """
        Calculate distance between two coordinates using Haversine formula
        
        Args:
            loc1: {"lat": 7.2090, "lon": 79.8350}
            loc2: {"lat": 7.5090, "lon": 80.1350}
        
        Returns:
            Distance in kilometers
        """
        R = 6371.0  # Earth radius in km
        
        lat1 = radians(loc1['lat'])
        lon1 = radians(loc1['lon'])
        lat2 = radians(loc2['lat'])
        lon2 = radians(loc2['lon'])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def _prepare_features(self, trip_data: Dict[str, Any], distance_km: float) -> pd.DataFrame:
        """
        Prepare features in the format expected by the model
        
        Args:
            trip_data: Dictionary with trip parameters
            distance_km: Calculated distance
        
        Returns:
            DataFrame with features matching training format
        """
        # Default values for missing features
        defaults = {
            'avg_speed_kmh': 37.04,  # 20 knots
            'wind_kph': 10.0,
            'wave_height_m': 0.5,
            'weather_factor': 1.0,
            'region': 'Western',
            'fuel_per_km': 0.5,
            'is_multi_day': 0,
            'has_engine': 1,
            'is_deep_sea': 0
        }
        
        # Calculate derived features
        trip_days = trip_data.get('trip_days', 1)
        total_hours = trip_days * 24 * 0.5  # Assuming 50% of time spent fishing
        
        # Determine boolean features
        is_multi_day = 1 if trip_days > 1 else 0
        has_engine = 1 if trip_data.get('fuel_type', 'none') != 'none' else 0
        is_deep_sea = 1 if distance_km > 100 else 0
        
        # Create feature dictionary matching training features
        features = {}
        for feature in self.feature_names:
            if feature == 'boat_type':
                features[feature] = trip_data.get('boat_type', 'OBFR')
            elif feature == 'engine_hp':
                features[feature] = trip_data.get('engine_hp', 60)
            elif feature == 'fuel_type':
                features[feature] = trip_data.get('fuel_type', 'diesel')
            elif feature == 'crew_size':
                features[feature] = trip_data.get('crew_size', 4)
            elif feature == 'ice_capacity_kg':
                features[feature] = trip_data.get('ice_capacity_kg', 500)
            elif feature == 'water_capacity_L':
                features[feature] = trip_data.get('water_capacity_L', 200)
            elif feature == 'avg_speed_kmh':
                features[feature] = trip_data.get('avg_speed_kmh', defaults['avg_speed_kmh'])
            elif feature == 'trip_days':
                features[feature] = trip_days
            elif feature == 'trip_month':
                features[feature] = trip_data.get('month', trip_data.get('trip_month', 6))
            elif feature == 'distance_km':
                features[feature] = distance_km
            elif feature == 'wind_kph':
                features[feature] = trip_data.get('weather_conditions', {}).get('wind_kph', defaults['wind_kph'])
            elif feature == 'wave_height_m':
                features[feature] = trip_data.get('weather_conditions', {}).get('wave_height_m', defaults['wave_height_m'])
            elif feature == 'weather_factor':
                features[feature] = trip_data.get('weather_factor', defaults['weather_factor'])
            elif feature == 'region':
                features[feature] = trip_data.get('region', defaults['region'])
            elif feature == 'is_multi_day':
                features[feature] = is_multi_day
            elif feature == 'has_engine':
                features[feature] = has_engine
            elif feature == 'is_deep_sea':
                features[feature] = is_deep_sea
            elif feature == 'total_hours':
                features[feature] = total_hours
            elif feature == 'fuel_per_km':
                features[feature] = trip_data.get('fuel_per_km', defaults['fuel_per_km'])
            else:
                # Default value for unknown features
                features[feature] = 0
        
        return pd.DataFrame([features])
    
    def update_prices(self, new_prices: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update price configuration
        
        Args:
            new_prices: {
                "fuel_prices": {"diesel": 320, "petrol": 330},
                "ice_price_per_kg": 15,
                "water_price_per_liter": 6
            }
        """
        if 'fuel_prices' in new_prices:
            self.price_config['fuel_prices'].update(new_prices['fuel_prices'])
        
        if 'ice_price_per_kg' in new_prices:
            self.price_config['ice_price_per_kg'] = new_prices['ice_price_per_kg']
        
        if 'water_price_per_liter' in new_prices:
            self.price_config['water_price_per_liter'] = new_prices['water_price_per_liter']
        
        return {
            "success": True,
            "updated_prices": self.price_config
        }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information and performance metrics"""
        return {
            "model_name": self.metadata['model_name'],
            "model_type": self.metadata['model_type'],
            "training_date": self.metadata['training_date'],
            "performance": self.metadata['performance'],
            "features_count": len(self.feature_names),
            "targets": self.target_names,
            "price_config": self.price_config,
            "boat_types": list(self.boat_configs.keys())
        }


# ==========================================================
# EXAMPLE USAGE
# ==========================================================

if __name__ == '__main__':
    # Initialize service
    service = TripCostMLService()
    
    # Test prediction
    test_data = {
        "boat_type": "OBFR",
        "fuel_type": "petrol",
        "trip_days": 2,
        "current_location": {"lat": 7.2090, "lon": 79.8350},
        "target_location": {"lat": 7.5090, "lon": 80.1350},
        "weather_conditions": {"wind_kph": 15, "wave_height_m": 1.2},
        "month": 6,
        "engine_hp": 60,
        "crew_size": 4,
        "ice_capacity_kg": 500,
        "water_capacity_L": 200
    }
    
    result = service.predict_base_cost(test_data)
    print("\n" + "="*60)
    print("PREDICTION RESULT")
    print("="*60)
    print(json.dumps(result, indent=2))
