import os
import joblib
import numpy as np
import pandas as pd
import json
import re
from datetime import datetime
from .boat_coefficients import BoatCoefficientsManager
from .fuel_baselines import (
    get_boat_fuel_baseline,
    get_boat_hp_hour_rate,
    get_boat_type_name,
)


class AdaptiveFuelEngine:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.model_path = os.path.join(model_dir, "fuel_model.pkl")
        self.best_models_root = os.path.join(model_dir, "fishtripcost")
        self.model_cache = {}
        self.metadata_cache = {}
        
        # Initialize boat coefficients manager
        self.coefficients_manager = BoatCoefficientsManager(model_dir)

        # Load default/fallback trained model if present.
        # During clean retraining flows the file may not exist yet.
        self.model = None
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            print("Fuel model loaded from:", self.model_path)
            print("Fuel model n_features_in_:", getattr(self.model, "n_features_in_", "unknown"))
        else:
            print("WARNING: No legacy fallback model found at startup:", self.model_path)
            print("WARNING: AdaptiveFuelEngine will use baseline-only predictions until models are trained.")
        print("Boat coefficients manager initialized")

    def _safe_boat_type_slug(self, boat_type: str) -> str:
        return re.sub(r"[^a-z0-9]+", "_", str(boat_type).strip().lower()).strip("_")

    def _resolve_model_path(self, boat_type: str = None):
        # Priority 1: boat-type best model from Colab output
        if boat_type:
            slug = self._safe_boat_type_slug(boat_type)
            if slug:
                boat_path = os.path.join(
                    self.best_models_root,
                    "boat_type",
                    slug,
                    "best_model",
                    "fuel_model.pkl",
                )
                if os.path.exists(boat_path):
                    return boat_path, "BOAT_TYPE"

        # Priority 2: common global best model from Colab output
        global_path = os.path.join(
            self.best_models_root,
            "global",
            "best_model",
            "fuel_model.pkl",
        )
        if os.path.exists(global_path):
            return global_path, "GLOBAL"

        # Priority 3: legacy default model
        if os.path.exists(self.model_path):
            return self.model_path, "LEGACY"

        # Priority 4: no trained model exists yet
        return None, "BASELINE_ONLY"

    def _load_model_cached(self, path: str):
        if not path:
            raise FileNotFoundError("No model path available")
        mtime = os.path.getmtime(path)
        cached = self.model_cache.get(path)

        if cached and cached.get("mtime") == mtime:
            return cached["model"]

        model = joblib.load(path)
        self.model_cache[path] = {"mtime": mtime, "model": model}
        return model

    def _load_metadata_cached(self, model_path: str):
        metadata_path = os.path.join(os.path.dirname(model_path), "metadata.json")
        if not os.path.exists(metadata_path):
            return None

        mtime = os.path.getmtime(metadata_path)
        cached = self.metadata_cache.get(metadata_path)
        if cached and cached.get("mtime") == mtime:
            return cached["metadata"]

        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            self.metadata_cache[metadata_path] = {"mtime": mtime, "metadata": metadata}
            return metadata
        except Exception:
            return None

    def predict(self, payload: dict):
        boat_id = payload["boatId"]
        boat_type = payload.get("boatType")  # Get boat type for baseline
        
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

        selected_model_path, model_scope = self._resolve_model_path(boat_type)
        try:
            if selected_model_path:
                selected_model = self._load_model_cached(selected_model_path)
                model_loaded_from = selected_model_path
            else:
                selected_model = None
                model_loaded_from = None
        except Exception:
            selected_model = self.model
            model_loaded_from = self.model_path if self.model is not None else None
            model_scope = "LEGACY" if self.model is not None else "BASELINE_ONLY"

        # Get base prediction from selected ML model when available.
        # If no model exists (fresh retrain state), use deterministic baseline.
        if selected_model is not None:
            base_predicted = float(selected_model.predict(X)[0])
        else:
            fallback_rate = get_boat_fuel_baseline(boat_type) if boat_type else get_boat_fuel_baseline("general")
            distance_component = float(payload["distanceKm"]) * fallback_rate
            hp_hour_rate = get_boat_hp_hour_rate(boat_type)
            engine_load_factor = 0.35
            fishing_component = (
                float(payload["engineHP"])
                * float(payload["fishingHours"])
                * hp_hour_rate
                * engine_load_factor
            )
            base_predicted = distance_component + fishing_component
        
        # Apply boat-type-specific fuel baseline adjustment
        # This adjusts the ML prediction based on the boat's inherent efficiency
        if boat_type:
            fuel_baseline = get_boat_fuel_baseline(boat_type)
            distance_km = float(payload["distanceKm"])
            
            # Calculate baseline fuel from distance using boat-type rate
            baseline_distance_fuel = distance_km * fuel_baseline
            
            # Use baseline for distance portion, keep ML prediction for other factors
            # This ensures boat-type efficiency is properly reflected
            hp_hour_rate = get_boat_hp_hour_rate(boat_type)
            engine_load_factor = 0.35
            fishing_component = (
                float(payload["engineHP"])
                * float(payload["fishingHours"])
                * hp_hour_rate
                * engine_load_factor
            )
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
        
        # Add boat-type baseline info if available
        if boat_type:
            response["boatTypeInfo"] = {
                "boatType": boat_type,
                "boatTypeName": get_boat_type_name(boat_type),
                "baselineFuelPerKm": get_boat_fuel_baseline(boat_type),
                "baselineFuelPerHpHour": get_boat_hp_hour_rate(boat_type),
                "baselineApplied": True
            }

        model_meta = self._load_metadata_cached(model_loaded_from) if model_loaded_from else {}
        model_meta = model_meta or {}
        response["modelSelection"] = {
            "scope": model_scope,
            "modelPath": model_loaded_from,
            "boatTypeRequested": boat_type,
            "selectedAlgorithm": model_meta.get("selected_model"),
            "trainingScope": model_meta.get("scope"),
            "trainingBoatType": model_meta.get("boat_type"),
        }
        
        return response
