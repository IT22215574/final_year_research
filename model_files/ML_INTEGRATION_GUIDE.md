# Smart Fisher Lanka - ML Model Integration Guide

## 🎯 Overview

This guide explains the complete ML integration for trip cost prediction in the Smart Fisher Lanka system.

## 📦 Components

### 1. Dataset Generation

- **File**: `datasetgeneration.ipynb`
- **Purpose**: Generate synthetic training data with realistic Sri Lankan fisheries parameters
- **Output**:
  - `smart_fisher_full_dataset.csv` (complete dataset)
  - `smart_fisher_train.csv` (training subset)
  - `smart_fisher_test.csv` (test subset)

### 2. ML Training Pipeline

- **File**: `complete_ml_training_pipeline.py`
- **Purpose**: Train multiple ML models and select the best performer
- **Models Tested**:
  - Random Forest (MultiOutput)
  - XGBoost (MultiOutput)
  - Gradient Boosting (MultiOutput)
  - Ridge Regression
  - Lasso Regression
- **Output**:
  - `production_model/trip_cost_predictor.pkl` (trained model)
  - `production_model/model_metadata.json` (model info)
  - `production_model/all_model_results.json` (comparison results)

### 3. Production Predictor

- **File**: `production_predictor.py`
- **Purpose**: Python class for making predictions in production
- **Features**:
  - Single trip prediction
  - Batch prediction
  - Confidence intervals
  - Input validation with defaults

### 4. ML Service (Flask API)

- **File**: `ml_service.py`
- **Purpose**: REST API wrapper for the ML model
- **Port**: 5000
- **Endpoints**:
  - `GET /health` - Health check
  - `GET /model/info` - Model information
  - `POST /predict` - Single prediction
  - `POST /predict/batch` - Batch prediction

### 5. NestJS Integration

- **Files**:
  - `Backend/src/ml-prediction/ml-prediction.service.ts`
  - `Backend/src/ml-prediction/ml-prediction.controller.ts`
  - `Backend/src/ml-prediction/ml-prediction.module.ts`
- **Purpose**: Integrate ML service with NestJS backend
- **Endpoints**:
  - `GET /api/ml-prediction/health`
  - `GET /api/ml-prediction/model-info`
  - `POST /api/ml-prediction/predict`
  - `POST /api/ml-prediction/predict/batch`
  - `POST /api/ml-prediction/predict-simple`

## 🚀 Setup Instructions

### Step 1: Generate Dataset

```bash
cd model_files
jupyter notebook datasetgeneration.ipynb
# Run all cells to generate dataset
```

**Required Output**:

- `smart_fisher_full_dataset.csv`
- `smart_fisher_train.csv`
- `smart_fisher_test.csv`

### Step 2: Train ML Model

```bash
# Install Python dependencies
pip install pandas numpy scikit-learn xgboost matplotlib seaborn joblib

# Run training pipeline
python complete_ml_training_pipeline.py
```

**Expected Output**:

```
✅ ALL MODELS TRAINED SUCCESSFULLY
🏆 BEST MODEL: Random Forest (or XGBoost)
   Test R²: 0.8750 (87.50%)
   Test SMAPE: 8.45%
   Test RMSE: LKR 2,345
```

**Generated Files**:

- `production_model/trip_cost_predictor.pkl`
- `production_model/model_metadata.json`
- `production_model/all_model_results.json`

### Step 3: Test Production Predictor

```bash
# Test the predictor class
python production_predictor.py
```

**Expected Output**:

```
✅ Predictor ready!
📊 Predictions:
   fuel_cost_lkr: LKR 15,234.56
   ice_cost_lkr: LKR 2,400.00
   water_cost_lkr: LKR 500.00
   total_base_cost_lkr: LKR 18,134.56
```

### Step 4: Start ML Service (Flask)

```bash
# Install Flask dependencies
pip install flask flask-cors

# Start ML service
python ml_service.py
```

**Expected Output**:

```
🚀 STARTING ML PREDICTION SERVICE
📊 Available Endpoints:
   GET  /health          - Health check
   GET  /model/info      - Model information
   POST /predict         - Single trip prediction
   POST /predict/batch   - Batch trip prediction

 * Running on http://0.0.0.0:5000/
```

**Test ML Service**:

```bash
# Health check
curl http://localhost:5000/health

# Get model info
curl http://localhost:5000/model/info

# Make prediction
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "boat_type": "IMUL",
    "engine_hp": 75,
    "trip_days": 1,
    "distance_km": 50,
    "crew_size": 3
  }'
```

### Step 5: Integrate with NestJS Backend

#### 5.1 Update app.module.ts

```typescript
// Backend/src/app.module.ts
import { Module } from "@nestjs/common";
import { MlPredictionModule } from "./ml-prediction/ml-prediction.module";

@Module({
  imports: [
    // ... other modules
    MlPredictionModule, // Add this line
  ],
})
export class AppModule {}
```

#### 5.2 Set Environment Variable

```bash
# Backend/.env
ML_SERVICE_URL=http://localhost:5000
```

#### 5.3 Install Axios (if not installed)

```bash
cd Backend
pnpm install axios
```

#### 5.4 Start NestJS Backend

```bash
cd Backend
pnpm run start:dev
```

### Step 6: Test Full Integration

#### Test from NestJS Backend:

```bash
# Health check
curl http://localhost:3000/api/ml-prediction/health

# Model info
curl http://localhost:3000/api/ml-prediction/model-info

# Simple prediction
curl -X POST http://localhost:3000/api/ml-prediction/predict-simple \
  -H "Content-Type: application/json" \
  -d '{
    "boatType": "IMUL",
    "tripDays": 1,
    "distanceKm": 50,
    "engineHp": 75,
    "crewSize": 3
  }'

# Full prediction
curl -X POST http://localhost:3000/api/ml-prediction/predict \
  -H "Content-Type: application/json" \
  -d '{
    "boat_type": "IMUL",
    "engine_hp": 75,
    "fuel_type": "Diesel",
    "crew_size": 3,
    "ice_capacity_kg": 200,
    "water_capacity_L": 100,
    "avg_speed_kmh": 12.0,
    "trip_days": 1,
    "trip_month": 3,
    "distance_km": 50,
    "wind_kph": 15,
    "wave_height_m": 1.0,
    "weather_factor": 1.0,
    "region": "West",
    "is_multi_day": false,
    "has_engine": true,
    "is_deep_sea": false
  }'
```

## 📊 Features

### Feature List (17 features, NO DATA LEAKAGE)

1. **Boat Specifications**:

   - `boat_type`: IMUL, MDBT, OBFR, TKBO, NMTR
   - `engine_hp`: 40-150 HP
   - `fuel_type`: Diesel, Petrol, Kerosene
   - `crew_size`: 2-6 members
   - `ice_capacity_kg`: 100-1500 kg
   - `water_capacity_L`: 50-800 L
   - `avg_speed_kmh`: 10-18 km/h

2. **Trip Parameters**:

   - `trip_days`: 1-7 days
   - `trip_month`: 1-12 (monsoon patterns)
   - `distance_km`: 20-500 km

3. **Environmental Factors**:

   - `wind_kph`: 5-40 km/h
   - `wave_height_m`: 0.5-3.0 m
   - `weather_factor`: 0.8-1.5 (fuel efficiency)

4. **Location & Derived**:
   - `region`: North, East, South, West
   - `is_multi_day`: Boolean
   - `has_engine`: Boolean
   - `is_deep_sea`: Boolean

### Target Predictions (4 targets)

1. `fuel_cost_lkr`: Diesel/Petrol/Kerosene cost (LKR)
2. `ice_cost_lkr`: Ice for fish preservation (LKR)
3. `water_cost_lkr`: Drinking water cost (LKR)
4. `total_base_cost_lkr`: Sum of above costs (LKR)

### Model Performance Metrics

- **R² Score**: 0.85-0.92 (85-92% variance explained)
- **SMAPE**: 8-12% (Symmetric Mean Absolute Percentage Error)
- **RMSE**: LKR 2,000-3,500 (Root Mean Squared Error)
- **MAE**: LKR 1,500-2,500 (Mean Absolute Error)

## 🔧 Troubleshooting

### Issue: Model not loading

**Solution**:

```bash
# Check if model files exist
ls production_model/

# Expected files:
# - trip_cost_predictor.pkl
# - model_metadata.json

# If missing, retrain model:
python complete_ml_training_pipeline.py
```

### Issue: ML Service connection error

**Solution**:

```bash
# Check if ML service is running
curl http://localhost:5000/health

# If not running:
python ml_service.py

# Check port availability:
netstat -an | grep 5000
```

### Issue: Import errors in Python

**Solution**:

```bash
# Install all dependencies
pip install pandas numpy scikit-learn xgboost matplotlib seaborn joblib flask flask-cors

# Or use requirements.txt (if available)
pip install -r requirements.txt
```

### Issue: NestJS can't connect to ML service

**Solution**:

```typescript
// Check ML_SERVICE_URL in .env
ML_SERVICE_URL=http://localhost:5000

// Check if ML service is accessible
// Backend/src/ml-prediction/ml-prediction.service.ts
private readonly mlServiceUrl: string;

constructor() {
  this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
  console.log(`ML Service URL: ${this.mlServiceUrl}`);
}
```

### Issue: Predictions seem unrealistic

**Solution**:

1. Check input data ranges (see Feature List above)
2. Verify model was trained on correct dataset
3. Check model performance metrics in `model_metadata.json`
4. If R² < 0.7, consider retraining with more data

## 📈 Performance Optimization

### For Better Predictions:

1. **Collect Real Data**: Replace synthetic data with actual trip records
2. **Retrain Periodically**: Update model monthly with new data
3. **Feature Engineering**: Add more relevant features (catch type, season)
4. **Hyperparameter Tuning**: Use GridSearchCV for better parameters
5. **Ensemble Methods**: Combine multiple models for better accuracy

### For Faster Predictions:

1. **Batch Processing**: Use `/predict/batch` for multiple trips
2. **Caching**: Cache predictions for common trip configurations
3. **Model Compression**: Use lighter models for mobile deployment
4. **Async Processing**: Use background jobs for bulk predictions

## 🔐 Production Deployment

### Security Considerations:

1. **API Key Authentication**: Add authentication to ML service
2. **Rate Limiting**: Prevent abuse of prediction endpoints
3. **HTTPS**: Use SSL/TLS for production
4. **Input Validation**: Validate all input parameters
5. **Error Handling**: Don't expose internal errors to users

### Scaling:

1. **Multiple Instances**: Run multiple ML service instances
2. **Load Balancer**: Use NGINX or AWS ALB
3. **Container Deployment**: Use Docker for easier deployment
4. **Model Versioning**: Support multiple model versions

## 📝 API Documentation

### POST /api/ml-prediction/predict

**Request**:

```json
{
  "boat_type": "IMUL",
  "engine_hp": 75,
  "fuel_type": "Diesel",
  "crew_size": 3,
  "ice_capacity_kg": 200,
  "water_capacity_L": 100,
  "avg_speed_kmh": 12.0,
  "trip_days": 1,
  "trip_month": 3,
  "distance_km": 50,
  "wind_kph": 15,
  "wave_height_m": 1.0,
  "weather_factor": 1.0,
  "region": "West",
  "is_multi_day": false,
  "has_engine": true,
  "is_deep_sea": false
}
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "predictions": {
      "fuel_cost_lkr": 15234.56,
      "ice_cost_lkr": 2400.0,
      "water_cost_lkr": 500.0,
      "total_base_cost_lkr": 18134.56
    },
    "confidence_intervals": {
      "fuel_cost_lkr": {
        "lower": 13500.0,
        "upper": 17000.0,
        "confidence_level": 0.68
      },
      "total_base_cost_lkr": {
        "lower": 16000.0,
        "upper": 20000.0,
        "confidence_level": 0.68
      }
    },
    "input_summary": {
      "boat_type": "IMUL",
      "trip_days": 1,
      "distance_km": 50,
      "engine_hp": 75
    },
    "model_info": {
      "model_name": "Random Forest",
      "model_r2": 0.875,
      "model_smape": 8.45,
      "version": "1.0.0"
    }
  }
}
```

## 📚 Additional Resources

- **Dataset Generation**: See `datasetgeneration.ipynb` for data details
- **Model Training**: See `complete_ml_training_pipeline.py` for training process
- **Production Predictor**: See `production_predictor.py` for usage examples
- **ML Service**: See `ml_service.py` for Flask API implementation
- **NestJS Integration**: See `Backend/src/ml-prediction/` for integration code

## 🎓 Understanding the System

### Data Flow:

```
1. User Input (Mobile/Web)
   ↓
2. NestJS Backend (/api/ml-prediction/predict)
   ↓
3. ML Service (Flask, http://localhost:5000/predict)
   ↓
4. Production Predictor (TripCostPredictor class)
   ↓
5. Trained Model (trip_cost_predictor.pkl)
   ↓
6. Predictions + Confidence Intervals
   ↓
7. Response to User
```

### Why This Architecture?

1. **Separation of Concerns**: ML logic separate from backend logic
2. **Language Flexibility**: Use Python for ML, TypeScript for backend
3. **Scalability**: ML service can be scaled independently
4. **Maintainability**: Update ML model without touching backend code
5. **Testability**: Test ML predictions independently

## ✅ Verification Checklist

- [ ] Dataset generated successfully (3 CSV files)
- [ ] ML model trained with R² > 0.85
- [ ] Model files saved in `production_model/`
- [ ] Production predictor works (test examples run)
- [ ] ML service starts and responds to `/health`
- [ ] NestJS module imported in `app.module.ts`
- [ ] Axios installed in Backend
- [ ] Environment variable set (`ML_SERVICE_URL`)
- [ ] Full integration test passes
- [ ] Predictions are realistic (LKR 5,000 - 100,000 range)

## 🎉 Success Criteria

Your integration is successful if:

1. ✅ Dataset generation produces 10,000+ records
2. ✅ Model training completes with R² > 0.85
3. ✅ ML service responds to health check
4. ✅ NestJS backend can call ML service
5. ✅ Predictions are within realistic ranges
6. ✅ Response time < 1 second for single prediction
7. ✅ All test examples work correctly

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Authors**: Smart Fisher Lanka Team  
**Contact**: support@smartfisherlanka.lk
