import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from .boat_coefficients import BoatCoefficientsManager


class AdaptiveFuelEngine:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.model_path = os.path.join(model_dir, "fuel_model.pkl")
        
        # Initialize boat coefficients manager
        self.coefficients_manager = BoatCoefficientsManager(model_dir)

        # Load trained model
        self.model = joblib.load(self.model_path)

        print("✅ Fuel model loaded from:", self.model_path)
        print("✅ Fuel model n_features_in_:", getattr(self.model, "n_features_in_", "unknown"))
        print("✅ Boat coefficients manager initialized")

    def predict(self, payload: dict):
        boat_id = payload["boatId"]
        
        # Get boat-specific adaptive coefficients
        boat_coeffs = self.coefficients_manager.get_boat_coefficients(boat_id)
        
        # Build input row with correct feature names
        row = {
            "distanceKm": float(payload["distanceKm"]),
            "speed": float(payload["speed"]),
            "engineHP": float(payload["engineHP"]),
            "fishingHours": float(payload["fishingHours"]),
            "weatherSeverityIndex": float(payload["weatherSeverityIndex"]),
        }

        # Convert to DataFrame to preserve feature names
        X = pd.DataFrame(
            [row],
            columns=[
                "distanceKm",
                "speed",
                "engineHP",
                "fishingHours",
                "weatherSeverityIndex",
            ],
        )

        # Get base prediction from ML model
        base_predicted = float(self.model.predict(X)[0])

        # Apply boat-specific adaptive coefficients
        predicted = base_predicted
        
        # 1. Apply main fuel efficiency factor (learned from historical errors)
        predicted *= boat_coeffs["fuelEfficiencyFactor"]
        
        # 2. Apply engine degradation (increases fuel consumption over time)
        predicted *= (1.0 + boat_coeffs["engineDegradationFactor"])
        
        # 3. Apply speed optimization factor (boat-specific speed efficiency)
        speed = float(payload["speed"])
        if speed != 10:  # 10 is baseline speed
            speed_deviation = abs(speed - 10) / 10
            speed_impact = 1.0 + speed_deviation * (boat_coeffs["speedOptimizationFactor"] - 1.0)
            predicted *= speed_impact
        
        # 4. Apply weather adaptation factor
        wsi = float(payload["weatherSeverityIndex"])
        if wsi > 0.1:  # Apply only for notable weather
            weather_impact = 1.0 + wsi * (boat_coeffs["weatherAdaptationFactor"] - 1.0)
            predicted *= weather_impact
        
        # 5. Apply seasonal adjustments
        current_month = datetime.utcnow().month
        if current_month in [5, 6, 7, 8, 9, 10]:  # Monsoon
            seasonal_factor = boat_coeffs["seasonalAdjustments"]["monsoon"]
        elif current_month in [12, 1, 2, 3]:  # Dry season
            seasonal_factor = boat_coeffs["seasonalAdjustments"]["dry"]
        else:
            seasonal_factor = boat_coeffs["seasonalAdjustments"]["inter_monsoon"]
        
        predicted *= seasonal_factor
        
        # 6. Apply legacy multipliers (for backward compatibility)
        predicted *= float(payload.get("engineDegradation", 1.0))
        predicted *= float(payload.get("fuelEfficiencyFactor", 1.0))

        return {
            "predictedFuelLiters": round(predicted, 2),
            "basePrediction": round(base_predicted, 2),
            "boatSpecificAdjustments": {
                "fuelEfficiencyFactor": boat_coeffs["fuelEfficiencyFactor"],
                "engineDegradationFactor": boat_coeffs["engineDegradationFactor"],
                "speedOptimizationFactor": boat_coeffs["speedOptimizationFactor"],
                "weatherAdaptationFactor": boat_coeffs["weatherAdaptationFactor"],
                "seasonalFactor": seasonal_factor,
                "confidence": boat_coeffs["confidence"],
                "dataPoints": boat_coeffs["dataPoints"]
            }
        }