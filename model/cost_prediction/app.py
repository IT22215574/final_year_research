from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import os

from services.fuel.adaptive_fuel import AdaptiveFuelEngine
from services.economics.profitability import ProfitabilityEngine
from services.intelligence.self_learning import SelfLearningEngine
from services.intelligence.risk_assessment import RiskAssessmentEngine
from services.economics.carbon_economics import CarbonOffsetEngine
from services.intelligence.realtime_data import RealTimeDataEngine

app = FastAPI(
    title="DATCIE ML Engine",
    description="Dynamic Adaptive Trip Cost Intelligence Engine - Advanced ML Services",
    version="3.0.0",
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

fuel_engine = AdaptiveFuelEngine(MODEL_DIR)
profitability_engine = ProfitabilityEngine(MODEL_DIR)
learning_engine = SelfLearningEngine(MODEL_DIR)
risk_engine = RiskAssessmentEngine(MODEL_DIR)
carbon_engine = CarbonOffsetEngine(MODEL_DIR)
realtime_engine = RealTimeDataEngine(MODEL_DIR)


# -----------------------------
# Request Models
# -----------------------------

class FuelPredictionRequest(BaseModel):
    boatId: str
    distanceKm: float = Field(..., ge=0)
    speed: float = Field(..., ge=0.1)
    engineHP: float = Field(..., ge=1)
    fishingHours: float = Field(..., ge=0)
    weatherSeverityIndex: float = Field(..., ge=0, le=1)
    engineDegradation: float = Field(1.0, ge=0.5, le=1.5)
    fuelEfficiencyFactor: float = Field(1.0, ge=0.5, le=2.0)


class ProfitabilityRequest(BaseModel):
    expectedCatchKg: float = Field(..., ge=0)
    marketPrice: float = Field(..., ge=0)
    predictedTotalCost: float = Field(..., ge=0)
    weatherSeverityIndex: float = Field(0.5, ge=0, le=1)


class LearningRequest(BaseModel):
    boatId: str
    predictedFuelLiters: float = Field(..., ge=0)
    actualFuelLiters: float = Field(..., ge=0)
    speed: float = Field(10, ge=0)
    weatherSeverityIndex: float = Field(0, ge=0, le=1)
    distanceKm: float = Field(0, ge=0)
    engineHP: float = Field(85, ge=0)
    fishingHours: float = Field(8, ge=0)


class BatchLearningRequest(BaseModel):
    trips: list
    boatId: Optional[str] = None


class RiskAssessmentRequest(BaseModel):
    weatherSeverityIndex: float = Field(0.5, ge=0, le=1)
    windSpeed: float = Field(20.0, ge=0)
    waveHeight: float = Field(2.0, ge=0)
    tripDuration: float = Field(8.0, ge=0)
    tripDate: str = ""

    predictedTotalCost: float = Field(..., ge=0)
    expectedRevenue: float = Field(..., ge=0)
    fuelCost: float = Field(..., ge=0)
    marketPrice: float = Field(..., ge=0)

    totalDistance: float = Field(..., ge=0)
    boatAge: int = Field(5, ge=0)
    crewExperience: str = "intermediate"
    maintenanceScore: float = Field(0.8, ge=0, le=1)
    boatType: str = "medium"

    engineCondition: float = Field(0.8, ge=0, le=1)
    hasGPS: bool = True
    hasRadio: bool = True
    safetyEquipmentScore: float = Field(0.7, ge=0, le=1)

    targetSpecies: str = "general"
    marketDemand: float = Field(0.7, ge=0, le=1)
    priceVolatility: float = Field(0.3, ge=0, le=1)
    maxStorageTime: int = Field(24, ge=0)

    hasValidLicense: bool = True
    fishingZone: str = "coastal"
    quotaUsagePercent: float = Field(0.5, ge=0, le=1)
    nearRestrictedAreas: bool = False


class CarbonAssessmentRequest(BaseModel):
    fuelConsumptionLiters: float = Field(..., ge=0)
    fuelType: str = "diesel"
    engineEfficiency: float = Field(0.35, ge=0)
    totalDistance: float = Field(..., ge=0)
    boatWeight: float = Field(5000.0, ge=0)
    crewSize: int = Field(4, ge=1)
    expectedCatch: float = Field(100.0, ge=0)
    tripDuration: float = Field(8.0, ge=0)
    idlingHours: float = Field(2.0, ge=0)
    expectedRevenue: float = Field(120000.0, ge=0)
    predictedCost: float = Field(100000.0, ge=0)
    fishingZone: str = "coastal"
    usesBiodiesel: bool = False
    hasEnergyEfficientEquipment: bool = False
    participatesInSustainabilityPrograms: bool = False
    usesSustainableFishingMethods: bool = False
    engineAge: int = Field(5, ge=0)


class RealTimeDataRequest(BaseModel):
    location: dict = {"lat": 7.8731, "lon": 80.7718}
    species: str = "general"


# -----------------------------
# Basic Endpoints
# -----------------------------

@app.get("/")
def read_root():
    return {
        "message": "DATCIE ML Engine API",
        "version": "3.0.0",
        "engines": [
            "adaptive_fuel",
            "profitability",
            "self_learning",
            "risk_assessment",
            "carbon_economics",
            "realtime_data",
        ],
    }


@app.get("/system/health")
def system_health_check():
    try:
        return {
            "status": "healthy",
            "engines": {
                "adaptive_fuel": "online",
                "profitability": "online",
                "self_learning": "online",
                "risk_assessment": "online",
                "carbon_economics": "online",
                "realtime_data": "online",
            },
            "model_dir": MODEL_DIR,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


# -----------------------------
# Prediction Endpoints
# -----------------------------

@app.post("/predict/fuel")
def predict_fuel(request: FuelPredictionRequest):
    try:
        return fuel_engine.predict(request.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/profitability")
def predict_profitability(request: ProfitabilityRequest):
    try:
        return profitability_engine.predict(request.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# Learning Endpoints
# -----------------------------

@app.post("/learning/update")
def update_learning(request: LearningRequest):
    try:
        return learning_engine.update(request.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/learning/batch-update")
def batch_learning_update(request: BatchLearningRequest):
    """
    Batch learning update for multiple trips.
    Efficiently processes selected trips for model training.
    """
    try:
        if not request.trips:
            raise HTTPException(status_code=400, detail="No trips provided for training")
        
        results = []
        boats_updated = {}
        total_error = 0
        
        # Process each trip
        for trip_data in request.trips:
            try:
                # Update learning for this trip
                result = learning_engine.update(trip_data)
                results.append(result)
                total_error += abs(result.get("predictionError", 0))
                
                # Track boat updates
                boat_id = trip_data.get("boatId")
                if boat_id:
                    if boat_id not in boats_updated:
                        boats_updated[boat_id] = {
                            "tripsProcessed": 0,
                            "updatedCoefficients": result.get("updatedCoefficients"),
                            "errors": [],
                        }
                    boats_updated[boat_id]["tripsProcessed"] += 1
                    boats_updated[boat_id]["errors"].append(result.get("predictionError", 0))
                    # Update with latest coefficients
                    if result.get("updatedCoefficients"):
                        boats_updated[boat_id]["updatedCoefficients"] = result.get("updatedCoefficients")
            except Exception as trip_error:
                # Log but continue with other trips
                print(f"Error processing trip: {trip_error}")
                continue
        
        # Calculate average prediction error for each boat
        for boat_id, boat_data in boats_updated.items():
            if boat_data["errors"]:
                boat_data["averagePredictionError"] = sum(abs(e) for e in boat_data["errors"]) / len(boat_data["errors"])
        
        return {
            "success": True,
            "tripsProcessed": len(results),
            "boatsUpdated": len(boats_updated),
            "boatIds": list(boats_updated.keys()),
            "averageError": total_error / len(results) if results else 0,
            "boatUpdates": boats_updated,
            "results": results,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch training failed: {str(e)}")


@app.get("/learning/summary")
def get_learning_summary():
    try:
        return learning_engine.get_learning_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/boats/{boat_id}/coefficients")
def get_boat_coefficients(boat_id: str):
    try:
        return fuel_engine.coefficients_manager.get_boat_coefficients(boat_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/boat-insights/{boat_id}")
def get_boat_insights(boat_id: str):
    """Get learning insights for a specific boat"""
    try:
        coefficients = fuel_engine.coefficients_manager.get_boat_coefficients(boat_id)
        insights = learning_engine.get_boat_insights(boat_id)
        summary = learning_engine.get_learning_summary()
        
        # Filter summary for this specific boat if available
        boat_data = summary.get("boat_specific_data", {}).get(boat_id, {})
        
        # Calculate accuracy trend if we have history
        history = learning_engine.get_boat_history(boat_id, 30)
        accuracy_trend = []
        if history:
            for entry in history[-10:]:  # Last 10 predictions
                predicted = entry.get("predictedFuel", 0)
                actual = entry.get("actualFuel", 0)
                if actual > 0:
                    accuracy = 1 - abs(predicted - actual) / actual
                    accuracy_trend.append({
                        "timestamp": entry.get("timestamp"),
                        "accuracy": max(0, min(1, accuracy))  # Clamp to 0-1
                    })
        
        return {
            "boatId": boat_id,
            "coefficients": coefficients,
            "learningInsights": insights,
            "learningStats": boat_data,
            "totalLearningUpdates": summary.get("total_learning_updates", 0),
            "lastUpdated": summary.get("last_updated", None),
            "accuracyTrend": accuracy_trend,
            "hasData": len(history) > 0 if history else False,
        }
    except Exception as e:
        # Return empty data structure instead of error for boats with no learning data
        return {
            "boatId": boat_id,
            "coefficients": {
                "fuelEfficiencyFactor": 1.0,
                "engineDegradationFactor": 1.0,
                "averageFuelPredictionError": 0,
                "confidence": 0,
                "dataPoints": 0
            },
            "learningInsights": {},
            "learningStats": {
                "updateCount": 0,
                "averageAccuracy": 0
            },
            "totalLearningUpdates": 0,
            "lastUpdated": None,
            "accuracyTrend": [],
            "hasData": False,
            "error": str(e)
        }


@app.get("/boat-history/{boat_id}")
def get_boat_prediction_history(boat_id: str, days: int = 30):
    """Get prediction history for a specific boat"""
    try:
        # Get boat coefficients and learning data
        coefficients = fuel_engine.coefficients_manager.get_boat_coefficients(boat_id)
        history = learning_engine.get_boat_history(boat_id, days)
        insights = learning_engine.get_boat_insights(boat_id)
        summary = learning_engine.get_learning_summary()
        
        boat_data = summary.get("boat_specific_data", {}).get(boat_id, {})
        
        # Calculate improvement metrics
        improvement_over_time = []
        if history and len(history) > 1:
            # Split history into chunks to show improvement trend
            chunk_size = max(1, len(history) // 5)  # 5 chunks
            for i in range(0, len(history), chunk_size):
                chunk = history[i:i+chunk_size]
                if chunk:
                    chunk_errors = [abs(e.get("predictionError", 0)) for e in chunk]
                    avg_error = sum(chunk_errors) / len(chunk_errors)
                    improvement_over_time.append({
                        "period": f"Period {i//chunk_size + 1}",
                        "averageError": avg_error,
                        "tripCount": len(chunk)
                    })
        
        return {
            "boatId": boat_id,
            "days": days,
            "predictionCount": boat_data.get("updateCount", 0),
            "averageAccuracy": boat_data.get("averageAccuracy", 0),
            "fuelEfficiencyFactor": coefficients.get("fuelEfficiencyFactor", 1.0),
            "engineDegradationFactor": coefficients.get("engineDegradationFactor", 1.0),
            "averagePredictionError": coefficients.get("averageFuelPredictionError", 0),
            "coefficientHistory": history,
            "learningInsights": insights,
            "lastPrediction": boat_data.get("lastPrediction", None),
            "improvementOverTime": improvement_over_time,
            "hasData": len(history) > 0 if history else False,
        }
    except Exception as e:
        # Return empty data structure instead of error
        return {
            "boatId": boat_id,
            "days": days,
            "predictionCount": 0,
            "averageAccuracy": 0,
            "fuelEfficiencyFactor": 1.0,
            "engineDegradationFactor": 1.0,
            "averagePredictionError": 0,
            "coefficientHistory": [],
            "learningInsights": {},
            "lastPrediction": None,
            "improvementOverTime": [],
            "hasData": False,
            "error": str(e)
        }


# -----------------------------
# Model Management Endpoints
# (Supports research experiments and production model lifecycle)
# -----------------------------

@app.post("/boats/{boat_id}/reset")
def reset_boat_model(boat_id: str):
    """
    Reset boat's learned coefficients to defaults
    
    Research use cases:
    - Demonstrate cold-start learning vs mature model
    - Reset after boat engine replacement
    - Clear corrupted learning data
    
    WARNING: This erases all learning for this boat!
    Automatic backup is created before reset.
    """
    try:
        result = fuel_engine.coefficients_manager.reset_boat_coefficients(boat_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


@app.post("/boats/reset-all")
def reset_all_boat_models():
    """
    Reset ALL boat models to defaults
    
    Research use cases:
    - System-wide experiment reset
    - Algorithm update requiring fresh learning
    
    DANGER: This erases ALL learning data!
    Full backup is created automatically.
    """
    try:
        result = fuel_engine.coefficients_manager.reset_all_coefficients()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"System reset failed: {str(e)}")


@app.post("/boats/{boat_id}/retrain")
def retrain_boat_model(boat_id: str, error_threshold: Optional[float] = None, max_days: Optional[int] = None):
    """
    Retrain boat model from historical trip data
    
    Research value: Demonstrates adaptive learning algorithm can rebuild from data
    
    Args:
        boat_id: Boat to retrain
        error_threshold: Filter trips with |error| > threshold (optional)
        max_days: Only use trips from last N days (optional)
    
    This reprocesses all historical trips to rebuild the learning model.
    Useful after algorithm improvements or to remove outlier data.
    """
    try:
        result = fuel_engine.coefficients_manager.retrain_from_history(
            boat_id=boat_id,
            error_threshold=error_threshold,
            max_days=max_days
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrain failed: {str(e)}")


@app.post("/learning/retrain-from-trips")
def retrain_from_trip_list(request: BatchLearningRequest):
    """
    Selective retrain using specific trips provided
    
    Research value: Train only with high-quality data (exclude outliers)
    
    Use case: User manually selects "good" trips for retraining
    """
    try:
        boat_id = request.boatId
        if not boat_id:
            raise HTTPException(status_code=400, detail="boatId required for selective retrain")
        
        if not request.trips:
            raise HTTPException(status_code=400, detail="No trips provided for training")
        
        # Backup and reset boat first
        old_coeffs = fuel_engine.coefficients_manager.get_boat_coefficients(boat_id)
        fuel_engine.coefficients_manager._backup_coefficients(boat_id, old_coeffs, reason="selective_retrain")
        fuel_engine.coefficients_manager.reset_boat_coefficients(boat_id)
        
        # Train with provided trips
        results = []
        for trip in request.trips:
            try:
                result = learning_engine.update(trip)
                results.append(result)
            except Exception as e:
                print(f"Error training with trip: {e}")
                continue
        
        new_coeffs = fuel_engine.coefficients_manager.get_boat_coefficients(boat_id)
        
        return {
            "success": True,
            "message": f"Retrained with {len(results)} selected trips",
            "tripsProcessed": len(results),
            "newCoefficients": new_coeffs,
            "confidence": new_coeffs.get("confidence", 0),
            "avgPredictionError": new_coeffs.get("avgPredictionError", 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Selective retrain failed: {str(e)}")


@app.get("/boats/{boat_id}/backups")
def get_boat_backups(boat_id: str):
    """
    List all available coefficient backups for a boat
    
    Supports research reproducibility - can view backup history
    """
    try:
        backups = fuel_engine.coefficients_manager.get_backups_list(boat_id)
        return {
            "boatId": boat_id,
            "backups": backups,
            "totalBackups": len(backups)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# Risk / Carbon / Data Endpoints
# -----------------------------

@app.post("/assess/risk")
def assess_risk(request: RiskAssessmentRequest):
    try:
        return risk_engine.comprehensive_risk_assessment(request.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/assess/carbon")
def assess_carbon_impact(request: CarbonAssessmentRequest):
    try:
        return carbon_engine.calculate_comprehensive_carbon_impact(
            request.model_dump()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/data/realtime")
async def get_realtime_data(request: RealTimeDataRequest):
    try:
        return await realtime_engine.get_comprehensive_realtime_data(
            request.location,
            request.species,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/data/trends")
async def get_historical_trends(days: int = 7):
    try:
        return await realtime_engine.get_historical_trends(days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("shutdown")
async def shutdown_event():
    try:
        await realtime_engine.close()
    except Exception as e:
        print(f"Error during shutdown: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)