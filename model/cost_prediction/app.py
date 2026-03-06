from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from services.adaptive_fuel import AdaptiveFuelEngine
from services.profitability import ProfitabilityEngine
from services.self_learning import SelfLearningEngine
from services.risk_assessment import RiskAssessmentEngine
from services.carbon_economics import CarbonOffsetEngine
from services.realtime_data import RealTimeDataEngine

app = FastAPI(title="DATCIE ML Engine", description="Dynamic Adaptive Trip Cost Intelligence Engine - Advanced ML Services")

# Initialize engines
model_dir = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(model_dir, exist_ok=True)

fuel_engine = AdaptiveFuelEngine(model_dir)
profitability_engine = ProfitabilityEngine(model_dir)
learning_engine = SelfLearningEngine(model_dir)
risk_engine = RiskAssessmentEngine(model_dir)
carbon_engine = CarbonOffsetEngine(model_dir)
realtime_engine = RealTimeDataEngine(model_dir)

# Pydantic models for request/response
class FuelPredictionRequest(BaseModel):
    boatId: str
    distance: float
    enginePowerKW: float
    boatLengthM: float
    boatWeightKg: float
    weatherSeverityIndex: float
    currentSpeed: float = 10.0
    fuelEconomyStressIndex: float = 0.5
    currentMonth: int = 1

class ProfitabilityRequest(BaseModel):
    expectedCatchKg: float
    marketPrice: float
    predictedTotalCost: float
    weatherSeverityIndex: float = 0.5

class LearningRequest(BaseModel):
    boatId: str
    actualFuelUsed: float
    predictedFuelUsed: float
    tripConditions: dict
    tripOutcome: dict

class RiskAssessmentRequest(BaseModel):
    # Weather data
    weatherSeverityIndex: float = 0.5
    windSpeed: float = 20.0
    waveHeight: float = 2.0
    tripDuration: float = 8.0
    tripDate: str = ""
    
    # Economic data  
    predictedTotalCost: float
    expectedRevenue: float
    fuelCost: float
    marketPrice: float
    
    # Operational data
    totalDistance: float
    boatAge: int = 5
    crewExperience: str = "intermediate"  # novice, intermediate, experienced, expert
    maintenanceScore: float = 0.8
    boatType: str = "medium"
    
    # Equipment data
    engineCondition: float = 0.8
    hasGPS: bool = True
    hasRadio: bool = True 
    safetyEquipmentScore: float = 0.7
    
    # Market data
    targetSpecies: str = "general"
    marketDemand: float = 0.7
    priceVolatility: float = 0.3
    maxStorageTime: int = 24
    
    # Regulatory data
    hasValidLicense: bool = True
    fishingZone: str = "coastal"
    quotaUsagePercent: float = 0.5
    nearRestrictedAreas: bool = False

class CarbonAssessmentRequest(BaseModel):
    fuelConsumptionLiters: float
    fuelType: str = "diesel"
    engineEfficiency: float = 0.35
    totalDistance: float
    boatWeight: float = 5000.0
    crewSize: int = 4
    expectedCatch: float = 100.0
    tripDuration: float = 8.0
    idlingHours: float = 2.0
    expectedRevenue: float = 120000.0
    predictedCost: float = 100000.0
    fishingZone: str = "coastal"
    usesBiodiesel: bool = False
    hasEnergyEfficientEquipment: bool = False
    participatesInSustainabilityPrograms: bool = False
    usesSustainableFishingMethods: bool = False
    engineAge: int = 5

class RealTimeDataRequest(BaseModel):
    location: dict = {"lat": 7.8731, "lon": 80.7718}  # Default to Colombo
    species: str = "general"

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
            "realtime_data"
        ],
        "description": "Dynamic Adaptive Trip Cost Intelligence Engine - Complete Advanced ML Services Suite",
        "features": [
            "Island vs International mode logic",
            "Per-boat adaptive learning coefficients", 
            "Enhanced risk assessment & profitability modeling",
            "Carbon offset economics integration",
            "Real-time data integration"
        ]
    }

@app.post("/predict/fuel")
def predict_fuel(request: FuelPredictionRequest):
    try:
        prediction = fuel_engine.predict(request.dict())
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/profitability")  
def predict_profitability(request: ProfitabilityRequest):
    try:
        prediction = profitability_engine.predict(request.dict())
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/learning/update")
def update_learning(request: LearningRequest):
    try:
        result = learning_engine.learn_from_trip(request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/assess/risk")
def assess_risk(request: RiskAssessmentRequest):
    """Comprehensive risk assessment for fishing trips"""
    try:
        assessment = risk_engine.comprehensive_risk_assessment(request.dict())
        return assessment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/assess/carbon")
def assess_carbon_impact(request: CarbonAssessmentRequest):
    """Comprehensive carbon footprint and offset economics analysis"""
    try:
        assessment = carbon_engine.calculate_comprehensive_carbon_impact(request.dict())
        return assessment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/data/realtime")
async def get_realtime_data(request: RealTimeDataRequest):
    """Get comprehensive real-time data for trip planning"""
    try:
        data = await realtime_engine.get_comprehensive_realtime_data(
            request.location, 
            request.species
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/data/trends")
async def get_historical_trends(days: int = 7):
    """Get historical trends for market analysis"""
    try:
        trends = await realtime_engine.get_historical_trends(days)
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/boats/{boat_id}/coefficients")
def get_boat_coefficients(boat_id: str):
    """Get learning coefficients for a specific boat"""
    try:
        coefficients = fuel_engine.get_boat_coefficients(boat_id)
        return coefficients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/learning/summary")
def get_learning_summary():
    """Get overall learning summary and statistics"""
    try:
        summary = learning_engine.get_learning_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/health")
def system_health_check():
    """Check system health and engine status"""
    try:
        return {
            "status": "healthy",
            "engines": {
                "adaptive_fuel": "online",
                "profitability": "online", 
                "self_learning": "online",
                "risk_assessment": "online",
                "carbon_economics": "online",
                "realtime_data": "online"
            },
            "model_dir": model_dir,
            "timestamp": "2024-01-15T12:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    try:
        await realtime_engine.close()
    except Exception as e:
        print(f"Error during shutdown: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

# ---------------------------------
# Run server
# ---------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)