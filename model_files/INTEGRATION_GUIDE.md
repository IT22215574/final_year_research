# ==========================================================
# SMART FISHER LANKA - ML MODEL USAGE GUIDE
# Complete Guide for Model Integration
# ==========================================================

## 🎯 Overview

This ML model predicts **base costs** for fishing trips, including:
- **Fuel Cost** - Based on boat type, engine, distance, and trip duration
- **Ice Cost** - For catch preservation
- **Water Cost** - For crew consumption
- **Total Base Cost** - Sum of all base costs

The model uses **Multi-Output Regression** to predict all cost components simultaneously.

## 📁 Model Files

After training, the following files are created in `model_files/production_model/`:

1. **trip_cost_predictor.pkl** - Main ML pipeline (preprocessing + model)
2. **production_predictor.pkl** - Production-ready predictor class
3. **model_metadata.json** - Model configuration and performance metrics
4. **example_predictions.json** - Example predictions for testing

## 🚀 Quick Start

### 1. Python Usage (Standalone)

```python
import joblib
import pandas as pd

# Load the model
model = joblib.load('production_model/trip_cost_predictor.pkl')

# Prepare input data
trip_data = pd.DataFrame([{
    'boat_type': 'OBFR',
    'engine_hp': 60,
    'fuel_type': 'petrol',
    'crew_size': 4,
    'ice_capacity_kg': 500,
    'water_capacity_L': 200,
    'avg_speed_kmh': 37.04,
    'trip_days': 2,
    'trip_month': 6,
    'distance_km': 50,
    'wind_kph': 15,
    'wave_height_m': 1.2,
    'weather_factor': 1.1,
    'region': 'Western',
    'is_multi_day': 1,
    'has_engine': 1,
    'is_deep_sea': 0,
    'total_hours': 10,
    'fuel_per_km': 0.5
}])

# Make prediction
predictions = model.predict(trip_data)
print(f"Predicted costs: {predictions}")
```

### 2. Using Production Predictor

```python
import joblib

# Load production predictor
predictor = joblib.load('production_model/production_predictor.pkl')

# Predict with simplified input
result = predictor.predict({
    'boat_type': 'OBFR',
    'engine_hp': 60,
    'fuel_type': 'petrol',
    'trip_days': 2,
    'distance_km': 50,
    'crew_size': 4,
    'ice_capacity_kg': 500,
    'water_capacity_L': 200
})

print(result)
# Output:
# {
#     'success': True,
#     'predictions': {
#         'fuel_cost_lkr': 15000,
#         'ice_cost_lkr': 6000,
#         'water_cost_lkr': 1000,
#         'total_base_cost_lkr': 22000
#     },
#     'confidence': {
#         'total_cost': 22000,
#         'lower_bound': 18700,
#         'upper_bound': 25300,
#         'margin_percent': 15.0
#     },
#     'metadata': {...}
# }
```

### 3. NestJS Integration

```typescript
// See nestjs_integration.ts for full implementation

import { TripCostMLService } from './trip-cost-ml.service';

@Injectable()
export class FishingService {
  constructor(private mlService: TripCostMLService) {}

  async predictTripCost(tripData: any) {
    const prediction = await this.mlService.predictBaseCost({
      boat_type: tripData.boat_type,
      fuel_type: tripData.fuel_type,
      trip_days: tripData.trip_days,
      current_location: tripData.current_location,
      target_location: tripData.target_location,
      engine_hp: tripData.engine_hp,
      crew_size: tripData.crew_size,
    });
    
    return prediction;
  }
}
```

## 🔧 Backend Integration Steps

### Step 1: Install Dependencies

```bash
# Python dependencies
pip install scikit-learn==1.3.0
pip install xgboost==2.0.0
pip install pandas numpy joblib

# Or use requirements.txt
pip install -r requirements.txt
```

### Step 2: Copy Model Files

```bash
# Copy production_model folder to your NestJS backend
cp -r model_files/production_model Backend/ml/
```

### Step 3: Create ML Service

```bash
# In your NestJS backend
cd Backend/src
mkdir ml
cp ../../model_files/nestjs_integration.py ml/
cp ../../model_files/nestjs_integration.ts ml/trip-cost-ml.service.ts
```

### Step 4: Create API Endpoint

```typescript
// Backend/src/fishing/fishing.controller.ts

@Post('predict-base-cost')
async predictBaseCost(@Body() dto: PredictBaseCostDto) {
  return this.fishingService.predictBaseCost(dto);
}
```

### Step 5: Test the Endpoint

```bash
# Test with curl
curl -X POST http://localhost:3000/api/trips/predict-base-cost \
  -H "Content-Type: application/json" \
  -d '{
    "boat_type": "OBFR",
    "fuel_type": "petrol",
    "trip_days": 2,
    "current_location": {"lat": 7.2090, "lon": 79.8350},
    "target_location": {"lat": 7.5090, "lon": 80.1350},
    "engine_hp": 60,
    "crew_size": 4,
    "ice_capacity_kg": 500,
    "water_capacity_L": 200
  }'
```

## 📱 Mobile App Integration

### 1. Create API Service

```typescript
// mobile/services/tripCostService.ts

export const predictTripCost = async (tripData: TripData) => {
  const response = await fetch(`${API_URL}/trips/predict-base-cost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(tripData)
  });
  
  return response.json();
};
```

### 2. Use in Trip Planning Screen

```typescript
// mobile/app/(root)/plan-trip.tsx

const handleCalculateCost = async () => {
  setLoading(true);
  
  try {
    const prediction = await predictTripCost({
      boat_type: selectedBoat,
      fuel_type: fuelType,
      trip_days: tripDays,
      current_location: currentLocation,
      target_location: targetLocation,
      engine_hp: boatSpecs.engine_hp,
      crew_size: crewSize,
      ice_capacity_kg: boatSpecs.ice_capacity_kg,
      water_capacity_L: boatSpecs.water_capacity_L
    });
    
    if (prediction.success) {
      setBaseCost(prediction.predictions.total_base_cost_lkr);
      setFuelCost(prediction.predictions.fuel_cost_lkr);
      setIceCost(prediction.predictions.ice_cost_lkr);
      setWaterCost(prediction.predictions.water_cost_lkr);
      setConfidenceRange(prediction.confidence);
      setDistance(prediction.distance_km);
    }
  } catch (error) {
    console.error('Cost prediction failed:', error);
  } finally {
    setLoading(false);
  }
};
```

### 3. Display Results

```typescript
<View>
  <Text>Base Cost Prediction</Text>
  <Text>Fuel: LKR {fuelCost.toLocaleString()}</Text>
  <Text>Ice: LKR {iceCost.toLocaleString()}</Text>
  <Text>Water: LKR {waterCost.toLocaleString()}</Text>
  <Text style={{fontWeight: 'bold'}}>
    Total Base: LKR {baseCost.toLocaleString()}
  </Text>
  
  <Text>Confidence Range (±15%):</Text>
  <Text>
    LKR {confidenceRange.lower_bound.toLocaleString()} - 
    LKR {confidenceRange.upper_bound.toLocaleString()}
  </Text>
  
  <Text>Distance: {distance} km</Text>
  
  {/* Add crew and gear costs */}
  <Text>+ Crew Cost: LKR {crewCost.toLocaleString()}</Text>
  <Text>+ Gear Cost: LKR {gearCost.toLocaleString()}</Text>
  
  <Text style={{fontSize: 18, fontWeight: 'bold'}}>
    Total Trip Cost: LKR {totalCost.toLocaleString()}
  </Text>
</View>
```

## 📊 Model Performance

Current model performance (from training):
- **Average R² Score**: ~0.90 (90% variance explained)
- **Average RMSE**: ~LKR 2,000-5,000
- **Average MAPE**: ~5-10%

Individual target performance:
- **Fuel Cost**: R² = 0.92, RMSE = LKR 3,000
- **Ice Cost**: R² = 0.88, RMSE = LKR 1,500
- **Water Cost**: R² = 0.85, RMSE = LKR 500
- **Total Cost**: R² = 0.91, RMSE = LKR 4,000

## 🔄 Model Updates

### When to Retrain

1. **Collect Real Data**: Gather actual trip cost data from fishermen
2. **Quarterly Retraining**: Update model every 3-6 months
3. **Price Changes**: When fuel, ice, or water prices change significantly
4. **New Boat Types**: When adding new vessel categories

### How to Retrain

```python
# 1. Update dataset with new data
# Add new rows to smart_fisher_full_dataset.csv

# 2. Run the training notebook
# Execute all cells in fishingcostmodeltrain_fixed.ipynb

# 3. Model files will be automatically updated
# production_model/ folder will contain new model

# 4. Deploy updated model
# Replace production_model folder in backend
# No app changes needed!
```

## 🛠️ Troubleshooting

### Common Issues

**Issue**: "Model file not found"
```python
# Solution: Check model path
import os
model_path = os.path.join(os.path.dirname(__file__), 'production_model', 'trip_cost_predictor.pkl')
print(f"Looking for model at: {model_path}")
print(f"Exists: {os.path.exists(model_path)}")
```

**Issue**: "Feature mismatch"
```python
# Solution: Check feature names in metadata
import json
with open('production_model/model_metadata.json') as f:
    metadata = json.load(f)
    print("Required features:", metadata['feature_names'])
```

**Issue**: "Python process failed"
```bash
# Solution: Test Python script directly
python nestjs_integration.py

# Check Python version
python --version  # Should be 3.8+

# Check dependencies
pip list | grep scikit-learn
```

## 📝 API Template

Complete API request template:

```json
{
  "boat_type": "OBFR",
  "fuel_type": "petrol",
  "trip_days": 2,
  "current_location": {
    "lat": 7.2090,
    "lon": 79.8350
  },
  "target_location": {
    "lat": 7.5090,
    "lon": 80.1350
  },
  "weather_conditions": {
    "wind_kph": 15,
    "wave_height_m": 1.2
  },
  "month": 6,
  "engine_hp": 60,
  "crew_size": 4,
  "ice_capacity_kg": 500,
  "water_capacity_L": 200,
  "avg_speed_kmh": 37.04,
  "region": "Western"
}
```

Response format:

```json
{
  "success": true,
  "distance_km": 50.23,
  "predictions": {
    "fuel_cost_lkr": 15000,
    "ice_cost_lkr": 6000,
    "water_cost_lkr": 1000,
    "total_base_cost_lkr": 22000
  },
  "breakdown": {
    "fuel": {
      "cost": 15000,
      "type": "petrol",
      "price_per_liter": 320
    },
    "ice": {
      "cost": 6000,
      "price_per_kg": 12
    },
    "water": {
      "cost": 1000,
      "price_per_liter": 5
    }
  },
  "confidence": {
    "total_cost": 22000,
    "lower_bound": 18700,
    "upper_bound": 25300,
    "margin_percent": 15.0
  },
  "metadata": {
    "model": "Random Forest",
    "boat_type": "OBFR",
    "boat_name": "Outboard Fiberglass",
    "distance_km": 50.23,
    "trip_duration_days": 2
  }
}
```

## 📚 Additional Resources

- **Dataset Generation**: `datasetfiles/datasetgeneration.ipynb`
- **Model Training**: `model_files/fishingcostmodeltrain_fixed.ipynb`
- **Python Integration**: `model_files/nestjs_integration.py`
- **TypeScript Integration**: `model_files/nestjs_integration.ts`
- **Model Documentation**: `model_files/MODEL_REPORT.md`

## ✅ Deployment Checklist

- [ ] Train model with latest data
- [ ] Verify model performance (R² > 0.85)
- [ ] Copy production_model folder to backend
- [ ] Install Python dependencies
- [ ] Create ML service in NestJS
- [ ] Create API endpoint
- [ ] Test endpoint with curl/Postman
- [ ] Update mobile app to use new endpoint
- [ ] Test end-to-end flow
- [ ] Monitor predictions in production
- [ ] Set up model retraining schedule

## 🎉 You're Ready!

Your ML model is now ready for production use. The model will help fishermen:
- Plan trips with accurate cost estimates
- Make informed decisions about fuel and supplies
- Optimize trip profitability
- Reduce financial risks

For questions or issues, refer to the documentation files in `model_files/`.
