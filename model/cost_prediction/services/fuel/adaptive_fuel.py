import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from .boat_coefficients import BoatCoefficientsManager
from .fuel_baselines import get_boat_fuel_baseline, get_boat_type_name


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
        boat_type = payload.get("boatType")  # ✅ Get boat type for baseline
        
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
        
        # ✅ Apply boat-type-specific fuel baseline adjustment
        # This adjusts the ML prediction based on the boat's inherent efficiency
        if boat_type:
            fuel_baseline = get_boat_fuel_baseline(boat_type)
            distance_km = float(payload["distanceKm"])
            
            # Calculate baseline fuel from distance using boat-type rate
            baseline_distance_fuel = distance_km * fuel_baseline
            
            # Use baseline for distance portion, keep ML prediction for other factors
            # This ensures boat-type efficiency is properly reflected
            fishing_component = float(payload["engineHP"]) * float(payload["fishingHours"]) * 0.10
            baseline_total = baseline_distance_fuel + fishing_component
            
            # Blend ML prediction with boat-type baseline (70% baseline, 30% ML)
            # This allows ML to adjust while respecting boat-type efficiency
            predicted = baseline_total * 0.7 + base_predicted * 0.3
        else:
            # No boat type provided, use pure ML prediction
            predicted = base_predicted

        # Apply boat-specific adaptive coefficients
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

        # Prepare response with boat-type info
        response = {
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
        
        # ✅ Add boat-type baseline info if available
        if boat_type:
            response["boatTypeInfo"] = {
                "boatType": boat_type,
                "boatTypeName": get_boat_type_name(boat_type),
                "baselineFuelPerKm": get_boat_fuel_baseline(boat_type),
                "baselineApplied": True
            }
        
        return response