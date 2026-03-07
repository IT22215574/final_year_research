import os
import json
from datetime import datetime
from ..fuel.boat_coefficients import BoatCoefficientsManager


class SelfLearningEngine:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
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

    def get_learning_summary(self):
        """
        Returns overall learning statistics across all boats.
        Reads from boat_coefficients.json via BoatCoefficientsManager.
        """
        try:
            # Reload latest coefficients from file
            self.coefficients_manager._load_coefficients()
            coefficients = self.coefficients_manager.coefficients

            if not coefficients:
                return {
                    "totalBoats": 0,
                    "totalTripsLearned": 0,
                    "averageConfidence": 0,
                    "averagePredictionError": 0,
                    "improvementStatus": "No learning data yet",
                    "topPerformingBoats": [],
                    "needsAttentionBoats": [],
                    "lastUpdated": None,
                }

            boat_ids = list(coefficients.keys())
            insights_list = []

            for boat_id in boat_ids:
                try:
                    insight = self.coefficients_manager.get_learning_insights(boat_id)
                    if insight and "message" not in insight:
                        insights_list.append(insight)
                except Exception:
                    continue

            if not insights_list:
                return {
                    "totalBoats": len(boat_ids),
                    "totalTripsLearned": 0,
                    "averageConfidence": 0,
                    "averagePredictionError": 0,
                    "improvementStatus": "Learning records exist but no usable history yet",
                    "topPerformingBoats": [],
                    "needsAttentionBoats": [],
                    "lastUpdated": None,
                }

            total_boats = len(insights_list)
            total_trips = sum(item.get("totalTrips", 0) for item in insights_list)

            avg_confidence = sum(
                item.get("confidence", 0) for item in insights_list
            ) / total_boats

            avg_prediction_error = sum(
                abs(item.get("avgPredictionError", 0)) for item in insights_list
            ) / total_boats

            top_performing = sorted(
                insights_list,
                key=lambda x: (
                    abs(x.get("avgPredictionError", 999999)),
                    -x.get("confidence", 0),
                ),
            )[:5]

            needs_attention = sorted(
                insights_list,
                key=lambda x: abs(x.get("avgPredictionError", 0)),
                reverse=True,
            )[:5]

            valid_dates = [
                item.get("lastUpdated")
                for item in insights_list
                if item.get("lastUpdated")
            ]
            latest_update = max(valid_dates) if valid_dates else None

            improving_count = sum(
                1
                for item in insights_list
                if str(item.get("improvementTrend", "")).lower() == "improving"
            )

            if improving_count >= max(1, int(total_boats * 0.6)):
                improvement_status = "System learning is improving overall"
            elif improving_count == 0:
                improvement_status = "Learning active but no clear improvement trend yet"
            else:
                improvement_status = "Learning mixed across boats"

            return {
                "totalBoats": total_boats,
                "totalTripsLearned": total_trips,
                "averageConfidence": round(avg_confidence, 4),
                "averagePredictionError": round(avg_prediction_error, 4),
                "improvementStatus": improvement_status,
                "topPerformingBoats": [
                    {
                        "boatId": item.get("boatId"),
                        "totalTrips": item.get("totalTrips"),
                        "confidence": item.get("confidence"),
                        "avgPredictionError": item.get("avgPredictionError"),
                        "improvementTrend": item.get("improvementTrend"),
                        "maturityLevel": item.get("maturityLevel"),
                    }
                    for item in top_performing
                ],
                "needsAttentionBoats": [
                    {
                        "boatId": item.get("boatId"),
                        "totalTrips": item.get("totalTrips"),
                        "confidence": item.get("confidence"),
                        "avgPredictionError": item.get("avgPredictionError"),
                        "improvementTrend": item.get("improvementTrend"),
                        "maturityLevel": item.get("maturityLevel"),
                    }
                    for item in needs_attention
                ],
                "lastUpdated": latest_update,
            }

        except Exception as e:
            return {
                "totalBoats": 0,
                "totalTripsLearned": 0,
                "averageConfidence": 0,
                "averagePredictionError": 0,
                "improvementStatus": f"Summary error: {str(e)}",
                "topPerformingBoats": [],
                "needsAttentionBoats": [],
                "lastUpdated": None,
            }