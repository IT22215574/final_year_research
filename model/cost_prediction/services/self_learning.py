import os
import json
from datetime import datetime

class SelfLearningEngine:
    def __init__(self, model_dir: str):
        self.history_path = os.path.join(model_dir, "coefficient_history.json")

        # ensure file exists
        if not os.path.exists(self.history_path):
            with open(self.history_path, "w") as f:
                json.dump([], f)

    def update(self, data: dict):
        predicted = data["predictedFuelLiters"]
        actual = data["actualFuelLiters"]
        current = data["currentFuelEfficiencyFactor"]

        error = actual - predicted
        denom = max(predicted, 10)
        rel_error = error / denom

        learning_rate = 0.02
        new_factor = current * (1 + learning_rate * rel_error)

        # clamp
        new_factor = max(0.7, min(1.3, new_factor))

        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "boatId": data["boatId"],
            "predictedFuelLiters": predicted,
            "actualFuelLiters": actual,
            "error": error,
            "previousFuelEfficiencyFactor": current,
            "updatedFuelEfficiencyFactor": new_factor,
        }

        # append history
        with open(self.history_path, "r") as f:
            history = json.load(f)

        history.append(entry)

        with open(self.history_path, "w") as f:
            json.dump(history, f, indent=2)

        return {
            "predictionError": round(error, 4),
            "previousFuelEfficiencyFactor": current,
            "updatedFuelEfficiencyFactor": round(new_factor, 8)
        }