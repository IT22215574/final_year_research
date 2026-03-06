import os
import json
from datetime import datetime
from .boat_coefficients import BoatCoefficientsManager

class SelfLearningEngine:
    def __init__(self, model_dir: str):
        self.coefficients_manager = BoatCoefficientsManager(model_dir)
        print("✅ Self-learning engine initialized with boat coefficients manager")

    def update(self, data: dict):
        """
        Enhanced learning update using boat-specific coefficient management
        """
        boat_id = data["boatId"]
        predicted = data["predictedFuelLiters"]
        actual = data["actualFuelLiters"]
        
        # Build context for learning
        context = {
            "speed": data.get("speed", 10),
            "weatherSeverityIndex": data.get("weatherSeverityIndex", 0),
            "distanceKm": data.get("distanceKm", 0),
            "engineHP": data.get("engineHP", 85),
            "fishingHours": data.get("fishingHours", 8),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Use the advanced boat coefficients manager for learning
        update_result = self.coefficients_manager.update_coefficients(
            boat_id, predicted, actual, context
        )
        
        # Get learning insights
        insights = self.coefficients_manager.get_learning_insights(boat_id)
        
        return {
            "predictionError": update_result["predictionError"],
            "relativePredictionError": update_result["relativePredictionError"],
            "boatLearningInsights": insights,
            "updatedCoefficients": {
                "fuelEfficiencyFactor": update_result["updatedCoefficients"]["fuelEfficiencyFactor"],
                "engineDegradationFactor": update_result["updatedCoefficients"]["engineDegradationFactor"],
                "speedOptimizationFactor": update_result["updatedCoefficients"]["speedOptimizationFactor"],
                "weatherAdaptationFactor": update_result["updatedCoefficients"]["weatherAdaptationFactor"],
                "confidence": update_result["updatedCoefficients"]["confidence"],
                "dataPoints": update_result["updatedCoefficients"]["dataPoints"],
            },
            "learningMetrics": update_result["learningMetrics"]
        }
    
    def get_boat_insights(self, boat_id: str):
        """Get comprehensive learning insights for a boat"""
        return self.coefficients_manager.get_learning_insights(boat_id)
    
    def get_boat_history(self, boat_id: str, days: int = 30):
        """Get prediction history for a boat"""
        return self.coefficients_manager.get_boat_prediction_history(boat_id, days)