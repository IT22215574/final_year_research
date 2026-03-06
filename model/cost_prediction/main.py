from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import os

from services.adaptive_fuel import AdaptiveFuelEngine
from services.profitability import ProfitabilityEngine
from services.self_learning import SelfLearningEngine

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

app = FastAPI(title="DATCIE ML Service", version="1.0.0")

fuel_engine = AdaptiveFuelEngine(model_dir=MODEL_DIR)
profit_engine = ProfitabilityEngine(model_dir=MODEL_DIR)
learning_engine = SelfLearningEngine(model_dir=MODEL_DIR)


@app.get("/")
def health():
    return {"status": "ok", "service": "DATCIE ML", "port": 5001}


class FuelAdaptiveRequest(BaseModel):
    boatId: str
    distanceKm: float = Field(..., ge=0)
    speed: float = Field(..., ge=0.1)
    engineHP: float = Field(..., ge=1)
    fishingHours: float = Field(..., ge=0)
    weatherSeverityIndex: float = Field(..., ge=0, le=1)
    engineDegradation: float = Field(1.0, ge=0.5, le=1.5)
    fuelEfficiencyFactor: float = Field(1.0, ge=0.5, le=2.0)


@app.post("/predict-fuel-adaptive")
def predict_fuel_adaptive(payload: FuelAdaptiveRequest):
    try:
        result = fuel_engine.predict(payload.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ProfitabilityRequest(BaseModel):
    expectedCatchKg: float = Field(..., ge=0)
    marketPrice: float = Field(..., ge=0)
    predictedTotalCost: float = Field(..., ge=0)


@app.post("/predict-profitability")
def predict_profitability(payload: ProfitabilityRequest):
    try:
        return profit_engine.predict(payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UpdateCoefficientsRequest(BaseModel):
    boatId: str
    predictedFuelLiters: float = Field(..., ge=0)
    actualFuelLiters: float = Field(..., ge=0)
    speed: Optional[float] = Field(10, ge=0.1)
    weatherSeverityIndex: Optional[float] = Field(0, ge=0, le=1)
    distanceKm: Optional[float] = Field(0, ge=0)
    engineHP: Optional[float] = Field(85, ge=1)
    fishingHours: Optional[float] = Field(8, ge=0)


@app.post("/update-coefficients")
def update_coefficients(payload: UpdateCoefficientsRequest):
    try:
        return learning_engine.update(payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/boat-insights/{boat_id}")
def get_boat_insights(boat_id: str):
    """Get comprehensive learning insights for a specific boat"""
    try:
        return learning_engine.get_boat_insights(boat_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/boat-history/{boat_id}")
def get_boat_history(boat_id: str, days: int = 30):
    """Get prediction history for a boat in the last N days"""
    try:
        return learning_engine.get_boat_history(boat_id, days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))