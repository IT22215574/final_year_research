import os
import joblib
import numpy as np
import pandas as pd


class AdaptiveFuelEngine:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.model_path = os.path.join(model_dir, "fuel_model.pkl")

        # Load trained model
        self.model = joblib.load(self.model_path)

        print("✅ Fuel model loaded from:", self.model_path)
        print("✅ Fuel model n_features_in_:", getattr(self.model, "n_features_in_", "unknown"))

    def predict(self, payload: dict):

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

        # Predict fuel usage
        predicted = float(self.model.predict(X)[0])

        # Apply adaptive multipliers
        predicted *= float(payload.get("engineDegradation", 1.0))
        predicted *= float(payload.get("fuelEfficiencyFactor", 1.0))

        return {
            "predictedFuelLiters": round(predicted, 2)
        }