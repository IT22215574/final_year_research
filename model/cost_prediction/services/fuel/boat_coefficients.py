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
    
    # ========================
    # MODEL MANAGEMENT METHODS
    # ========================
    
    def _backup_coefficients(self, boat_id: str, coeffs: Dict, reason: str = "") -> str:
        """
        Create timestamped backup of boat coefficients
        Essential for research reproducibility and safety
        """
        backup_dir = os.path.join(os.path.dirname(self.coefficients_path), "coefficient_backups")
        os.makedirs(backup_dir, exist_ok=True)
        
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_dir, f"{boat_id}_{timestamp}.json")
        
        backup_data = {
            "boatId": boat_id,
            "timestamp": datetime.utcnow().isoformat(),
            "reason": reason,
            "coefficients": coeffs
        }
        
        with open(backup_file, "w") as f:
            json.dump(backup_data, f, indent=2)
        
        return backup_file
    
    def reset_boat_coefficients(self, boat_id: str) -> Dict:
        """
        Reset boat coefficients to defaults - supports research experiments
        
        Use cases:
        - Boat engine replaced (coefficients no longer valid)
        - Bad data corrupted model (need fresh start)
        - Research comparison (cold-start vs learned model)
        
        Returns:
            Dict with reset confirmation and backup info
        """
        # Get current coefficients for backup
        old_coeffs = self.get_boat_coefficients(boat_id) if boat_id in self.coefficients else {}
        
        # Create backup before reset
        backup_file = ""
        if old_coeffs.get("dataPoints", 0) > 0:
            backup_file = self._backup_coefficients(boat_id, old_coeffs, reason="manual_reset")
        
        # Reset to default coefficients
        default_coeffs = {
            "fuelEfficiencyFactor": 1.0,
            "engineDegradationFactor": 0.0,
            "speedOptimizationFactor": 1.0,
            "weatherAdaptationFactor": 1.0,
            "loadCapacityFactor": 1.0,
            "learningRate": 0.05,
            "confidence": 0.0,  # Zero confidence after reset
            "dataPoints": 0,
            "lastUpdated": datetime.utcnow().isoformat(),
            "avgPredictionError": 0.0,
            "errorTrend": 0.0,
            "seasonalAdjustments": {
                "monsoon": 1.1,
                "dry": 0.95,
                "inter_monsoon": 1.0
            }
        }
        
        # Update and save
        self.coefficients[boat_id] = default_coeffs
        self._save_coefficients()
        
        return {
            "success": True,
            "message": f"Boat {boat_id} coefficients reset to defaults",
            "resetCoefficients": default_coeffs,
            "previousDataPoints": old_coeffs.get("dataPoints", 0),
            "previousConfidence": old_coeffs.get("confidence", 0),
            "backupCreated": backup_file != "",
            "backupFile": backup_file
        }
    
    def reset_all_coefficients(self) -> Dict:
        """
        Reset ALL boat coefficients - use for system-wide experiments
        WARNING: Dangerous operation - creates full backup first
        """
        # Create system-wide backup
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_path = self.coefficients_path + f".backup_{timestamp}"
        
        with open(backup_path, "w") as f:
            json.dump(self.coefficients, f, indent=2)
        
        boats_reset = list(self.coefficients.keys())
        total_data_points = sum(c.get("dataPoints", 0) for c in self.coefficients.values())
        
        # Clear all coefficients
        self.coefficients = {}
        self._save_coefficients()
        
        return {
            "success": True,
            "message": "All boat coefficients reset to defaults",
            "boatsReset": len(boats_reset),
            "boatIds": boats_reset,
            "totalDataPointsLost": total_data_points,
            "backupFile": backup_path
        }
    
    def retrain_from_history(self, boat_id: str, 
                            error_threshold: Optional[float] = None,
                            max_days: Optional[int] = None) -> Dict:
        """
        Retrain boat model from historical trip data
        
        Research value: Demonstrates adaptive learning can rebuild from data
        
        Args:
            boat_id: Boat to retrain
            error_threshold: Only use trips with |error| < threshold (filter outliers)
            max_days: Only use trips from last N days
        
        Returns:
            Retrain results with before/after comparison
        """
        # Get historical trips
        history = self.get_boat_prediction_history(boat_id, days=max_days or 365)
        
        if not history:
            return {
                "success": False,
                "message": f"No historical data available for boat {boat_id}",
                "tripsUsed": 0
            }
        
        # Backup current state
        old_coeffs = self.get_boat_coefficients(boat_id)
        self._backup_coefficients(boat_id, old_coeffs, reason="pre_retrain")
        
        # Reset to defaults
        self.reset_boat_coefficients(boat_id)
        
        # Filter trips if error threshold specified
        filtered_history = history
        if error_threshold is not None:
            filtered_history = [
                entry for entry in history 
                if abs(entry.get("relativePredictionError", 0)) < error_threshold
            ]
        
        # Retrain by replaying trips in chronological order
        retrain_count = 0
        for entry in sorted(filtered_history, key=lambda x: x.get("timestamp", "")):
            try:
                # Update coefficients with historical trip
                self.update_coefficients(
                    boat_id=boat_id,
                    predicted_fuel=entry["predictedFuel"],
                    actual_fuel=entry["actualFuel"],
                    context=entry.get("context", {})
                )
                retrain_count += 1
            except Exception as e:
                print(f"Error retraining trip: {e}")
                continue
        
        # Get new coefficients after retraining
        new_coeffs = self.get_boat_coefficients(boat_id)
        
        return {
            "success": True,
            "message": f"Successfully retrained boat {boat_id}",
            "tripsUsed": retrain_count,
            "tripsFiltered": len(history) - len(filtered_history),
            "tripsAvailable": len(history),
            "oldCoefficients": {
                "confidence": old_coeffs.get("confidence", 0),
                "dataPoints": old_coeffs.get("dataPoints", 0),
                "avgPredictionError": old_coeffs.get("avgPredictionError", 0)
            },
            "newCoefficients": {
                "confidence": new_coeffs.get("confidence", 0),
                "dataPoints": new_coeffs.get("dataPoints", 0),
                "avgPredictionError": new_coeffs.get("avgPredictionError", 0),
                "fuelEfficiencyFactor": new_coeffs.get("fuelEfficiencyFactor", 1.0),
                "engineDegradationFactor": new_coeffs.get("engineDegradationFactor", 0.0)
            },
            "improvement": {
                "errorReduction": old_coeffs.get("avgPredictionError", 0) - new_coeffs.get("avgPredictionError", 0),
                "confidenceChange": new_coeffs.get("confidence", 0) - old_coeffs.get("confidence", 0),
                "dataPointsChange": new_coeffs.get("dataPoints", 0) - old_coeffs.get("dataPoints", 0)
            }
        }
    
    def get_backups_list(self, boat_id: str) -> List[Dict]:
        """Get list of available backups for a boat"""
        backup_dir = os.path.join(os.path.dirname(self.coefficients_path), "coefficient_backups")
        
        if not os.path.exists(backup_dir):
            return []
        
        backups = []
        for filename in os.listdir(backup_dir):
            if filename.startswith(boat_id) and filename.endswith(".json"):
                filepath = os.path.join(backup_dir, filename)
                try:
                    with open(filepath, "r") as f:
                        backup_data = json.load(f)
                        backups.append({
                            "filename": filename,
                            "timestamp": backup_data.get("timestamp"),
                            "reason": backup_data.get("reason"),
                            "dataPoints": backup_data.get("coefficients", {}).get("dataPoints", 0),
                            "confidence": backup_data.get("coefficients", {}).get("confidence", 0)
                        })
                except:
                    continue
        
        return sorted(backups, key=lambda x: x.get("timestamp", ""), reverse=True)