# model/cost_prediction/services/boat_coefficients.py

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import numpy as np

class BoatCoefficientsManager:
    """
    Manages per-boat adaptive learning coefficients that improve over time
    based on actual vs predicted fuel consumption patterns
    """
    
    def __init__(self, model_dir: str):
        self.coefficients_path = os.path.join(model_dir, "boat_coefficients.json")
        self.history_path = os.path.join(model_dir, "coefficient_history.json")
        self._ensure_files_exist()
        self._load_coefficients()
    
    def _ensure_files_exist(self):
        """Initialize coefficient files if they don't exist"""
        if not os.path.exists(self.coefficients_path):
            with open(self.coefficients_path, "w") as f:
                json.dump({}, f)
        
        if not os.path.exists(self.history_path):
            with open(self.history_path, "w") as f:
                json.dump([], f)
    
    def _load_coefficients(self):
        """Load current boat coefficients from file"""
        with open(self.coefficients_path, "r") as f:
            self.coefficients = json.load(f)
    
    def _save_coefficients(self):
        """Save coefficients to file"""
        with open(self.coefficients_path, "w") as f:
            json.dump(self.coefficients, f, indent=2)
    
    def get_boat_coefficients(self, boat_id: str) -> Dict:
        """Get adaptive coefficients for a specific boat"""
        if boat_id not in self.coefficients:
            # Initialize new boat with default coefficients
            self.coefficients[boat_id] = {
                "fuelEfficiencyFactor": 1.0,
                "engineDegradationFactor": 0.0,
                "speedOptimizationFactor": 1.0,
                "weatherAdaptationFactor": 1.0,
                "loadCapacityFactor": 1.0,
                "learningRate": 0.05,
                "confidence": 0.1,  # Low confidence for new boats
                "dataPoints": 0,
                "lastUpdated": datetime.utcnow().isoformat(),
                "avgPredictionError": 0.0,
                "errorTrend": 0.0,  # Positive = overestimating, Negative = underestimating
                "seasonalAdjustments": {
                    "monsoon": 1.1,
                    "dry": 0.95,
                    "inter_monsoon": 1.0
                }
            }
            self._save_coefficients()
        
        return self.coefficients[boat_id].copy()
    
    def update_coefficients(self, boat_id: str, predicted_fuel: float, 
                          actual_fuel: float, context: Dict) -> Dict:
        """
        Update boat coefficients based on prediction error using multiple learning strategies
        
        Args:
            boat_id: Unique boat identifier
            predicted_fuel: ML model's predicted fuel consumption
            actual_fuel: Real fuel consumption
            context: Additional context (weather, distance, speed, etc.)
        """
        coeffs = self.get_boat_coefficients(boat_id)
        
        # Calculate prediction error
        error = actual_fuel - predicted_fuel
        relative_error = error / max(predicted_fuel, 1.0)
        
        # Update data points and confidence
        coeffs["dataPoints"] += 1
        coeffs["confidence"] = min(1.0, coeffs["dataPoints"] / 20.0)  # Max confidence after 20 trips
        
        # Adaptive learning rate based on confidence and error consistency
        base_lr = coeffs["learningRate"]
        error_consistency = abs(coeffs["errorTrend"] - relative_error)
        adaptive_lr = base_lr * (1.0 / (1.0 + error_consistency * 2.0))  # Reduce LR if errors inconsistent
        
        # Update average prediction error with exponential moving average
        alpha = 0.2
        coeffs["avgPredictionError"] = (alpha * abs(relative_error) + 
                                       (1 - alpha) * coeffs["avgPredictionError"])
        
        # Update error trend
        coeffs["errorTrend"] = (alpha * relative_error + 
                               (1 - alpha) * coeffs["errorTrend"])
        
        # 1. Fuel Efficiency Factor - Main coefficient for overall fuel consumption
        fuel_adjustment = 1.0 + adaptive_lr * relative_error
        coeffs["fuelEfficiencyFactor"] *= fuel_adjustment
        coeffs["fuelEfficiencyFactor"] = np.clip(coeffs["fuelEfficiencyFactor"], 0.7, 1.5)
        
        # 2. Engine Degradation Factor - Learns from consistent overestimation
        if coeffs["dataPoints"] > 5:  # Need some history
            if coeffs["errorTrend"] > 0.1:  # Consistent underestimation suggests degradation
                degradation_update = adaptive_lr * coeffs["errorTrend"] * 0.5
                coeffs["engineDegradationFactor"] += degradation_update
                coeffs["engineDegradationFactor"] = np.clip(coeffs["engineDegradationFactor"], 0.0, 0.3)
        
        # 3. Speed Optimization Factor - Learn from speed vs fuel efficiency patterns
        if "speed" in context:
            speed = context["speed"]
            optimal_speed = 10  # Base optimal speed
            speed_deviation = abs(speed - optimal_speed) / optimal_speed
            
            if abs(relative_error) > 0.15:  # Significant error at this speed
                speed_factor_adjustment = adaptive_lr * relative_error * speed_deviation
                coeffs["speedOptimizationFactor"] *= (1.0 + speed_factor_adjustment)
                coeffs["speedOptimizationFactor"] = np.clip(coeffs["speedOptimizationFactor"], 0.8, 1.3)
        
        # 4. Weather Adaptation Factor - Learn weather response patterns
        if "weatherSeverityIndex" in context:
            wsi = context["weatherSeverityIndex"]
            if wsi > 0.6:  # High weather severity
                weather_error = relative_error * (wsi - 0.5) * 2.0  # Amplify for severe weather
                weather_adjustment = adaptive_lr * weather_error * 0.3
                coeffs["weatherAdaptationFactor"] *= (1.0 + weather_adjustment)
                coeffs["weatherAdaptationFactor"] = np.clip(coeffs["weatherAdaptationFactor"], 0.8, 1.4)
        
        # 5. Seasonal Adjustments
        current_month = datetime.utcnow().month
        if current_month in [5, 6, 7, 8, 9, 10]:  # Monsoon season
            season = "monsoon"
        elif current_month in [12, 1, 2, 3]:  # Dry season
            season = "dry"
        else:
            season = "inter_monsoon"
        
        # Learn seasonal patterns
        seasonal_adjustment = adaptive_lr * relative_error * 0.1
        coeffs["seasonalAdjustments"][season] *= (1.0 + seasonal_adjustment)
        coeffs["seasonalAdjustments"][season] = np.clip(coeffs["seasonalAdjustments"][season], 0.9, 1.2)
        
        # Adaptive learning rate decay as boat model matures
        if coeffs["dataPoints"] > 10:
            coeffs["learningRate"] = max(0.01, base_lr * 0.99)  # Slowly decrease learning rate
        
        # Update timestamp
        coeffs["lastUpdated"] = datetime.utcnow().isoformat()
        
        # Store updated coefficients
        self.coefficients[boat_id] = coeffs
        self._save_coefficients()
        
        # Log the update to history
        self._log_update_history(boat_id, predicted_fuel, actual_fuel, context, coeffs)
        
        return {
            "predictionError": round(error, 3),
            "relativePredictionError": round(relative_error, 4),
            "updatedCoefficients": coeffs,
            "learningMetrics": {
                "confidence": coeffs["confidence"],
                "dataPoints": coeffs["dataPoints"],
                "avgPredictionError": coeffs["avgPredictionError"],
                "errorTrend": coeffs["errorTrend"],
                "adaptiveLearningRate": adaptive_lr
            }
        }
    
    def _log_update_history(self, boat_id: str, predicted: float, actual: float, 
                           context: Dict, updated_coeffs: Dict):
        """Log coefficient update to history for analysis"""
        with open(self.history_path, "r") as f:
            history = json.load(f)
        
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "boatId": boat_id,
            "predictedFuel": predicted,
            "actualFuel": actual,
            "predictionError": actual - predicted,
            "relativePredictionError": (actual - predicted) / max(predicted, 1.0),
            "context": context,
            "updatedCoefficients": {k: v for k, v in updated_coeffs.items() 
                                  if k in ["fuelEfficiencyFactor", "engineDegradationFactor", 
                                          "speedOptimizationFactor", "weatherAdaptationFactor"]},
            "confidence": updated_coeffs["confidence"],
            "dataPoints": updated_coeffs["dataPoints"]
        }
        
        history.append(entry)
        
        # Keep only last 1000 entries to prevent file bloat
        if len(history) > 1000:
            history = history[-1000:]
        
        with open(self.history_path, "w") as f:
            json.dump(history, f, indent=2)
    
    def get_boat_prediction_history(self, boat_id: str, days: int = 30) -> List[Dict]:
        """Get prediction history for a boat in the last N days"""
        with open(self.history_path, "r") as f:
            history = json.load(f)
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        boat_history = [
            entry for entry in history 
            if entry["boatId"] == boat_id 
            and datetime.fromisoformat(entry["timestamp"]) > cutoff_date
        ]
        
        return boat_history
    
    def get_learning_insights(self, boat_id: str) -> Dict:
        """Get learning insights and statistics for a boat"""
        coeffs = self.get_boat_coefficients(boat_id)
        history = self.get_boat_prediction_history(boat_id, days=90)
        
        if not history:
            return {"message": "No learning data available for this boat"}
        
        errors = [entry["relativePredictionError"] for entry in history]
        recent_errors = errors[-10:] if len(errors) >= 10 else errors
        
        insights = {
            "boatId": boat_id,
            "maturityLevel": "Expert" if coeffs["dataPoints"] > 50 else 
                            "Experienced" if coeffs["dataPoints"] > 20 else
                            "Learning" if coeffs["dataPoints"] > 5 else "New",
            "confidence": coeffs["confidence"],
            "totalTrips": coeffs["dataPoints"],
            "avgPredictionError": coeffs["avgPredictionError"],
            "recentAvgError": np.mean(np.abs(recent_errors)) if recent_errors else 0.0,
            "errorTrend": coeffs["errorTrend"],
            "improvementTrend": "Improving" if len(errors) > 5 and 
                               np.mean(np.abs(errors[-5:])) < np.mean(np.abs(errors[:-5])) 
                               else "Stable",
            "coefficients": {
                "fuelEfficiencyFactor": coeffs["fuelEfficiencyFactor"],
                "engineDegradationFactor": coeffs["engineDegradationFactor"],
                "weatherAdaptationFactor": coeffs["weatherAdaptationFactor"]
            },
            "lastUpdated": coeffs["lastUpdated"]
        }
        
        return insights