# 🚀 Quick Start Guide - Smart Fisher ML Integration

## Prerequisites
- Python 3.8+ installed
- Node.js 16+ installed
- pnpm installed

## 🔥 Fast Setup (5 Minutes)

### 1️⃣ Install Python Dependencies (1 min)
```bash
cd model_files
pip install -r requirements.txt
```

### 2️⃣ Generate Dataset (1 min)
```bash
# Option A: Use the notebook
jupyter notebook datasetgeneration.ipynb
# Run all cells

# Option B: Quick Python script (copy and paste this entire block)
python -c "
import pandas as pd
import numpy as np
import random

print('🔄 Generating dataset...')

# Boat configurations
boat_configs = {
    'IMUL': {'hp': 75, 'ice': 200, 'water': 100, 'speed': 12},
    'MDBT': {'hp': 120, 'ice': 800, 'water': 500, 'speed': 15},
    'OBFR': {'hp': 40, 'ice': 150, 'water': 50, 'speed': 10},
    'TKBO': {'hp': 85, 'ice': 300, 'water': 150, 'speed': 13},
    'NMTR': {'hp': 0, 'ice': 100, 'water': 30, 'speed': 8}
}

# Generate 10,000 records
records = []
for i in range(10000):
    boat_type = random.choice(list(boat_configs.keys()))
    config = boat_configs[boat_type]
    
    trip_days = random.randint(1, 7)
    distance_km = random.uniform(20, 500)
    
    # Calculate costs
    fuel_per_liter = 350  # LKR
    fuel_consumption = (config['hp'] * 0.25 * distance_km / config['speed']) if config['hp'] > 0 else 0
    fuel_cost = fuel_consumption * fuel_per_liter
    
    ice_cost = config['ice'] * trip_days * 12.0
    water_cost = config['water'] * trip_days * 5.0
    total_cost = fuel_cost + ice_cost + water_cost
    
    record = {
        'boat_type': boat_type,
        'engine_hp': config['hp'],
        'fuel_type': 'Diesel' if config['hp'] > 0 else 'None',
        'crew_size': random.randint(2, 6),
        'ice_capacity_kg': config['ice'],
        'water_capacity_L': config['water'],
        'avg_speed_kmh': config['speed'],
        'trip_days': trip_days,
        'trip_month': random.randint(1, 12),
        'distance_km': distance_km,
        'wind_kph': random.uniform(5, 40),
        'wave_height_m': random.uniform(0.5, 3.0),
        'weather_factor': random.uniform(0.8, 1.5),
        'region': random.choice(['North', 'East', 'South', 'West']),
        'is_multi_day': trip_days > 1,
        'has_engine': config['hp'] > 0,
        'is_deep_sea': distance_km > 100,
        'fuel_cost_lkr': fuel_cost,
        'ice_cost_lkr': ice_cost,
        'water_cost_lkr': water_cost,
        'total_base_cost_lkr': total_cost
    }
    records.append(record)

df = pd.DataFrame(records)
df.to_csv('smart_fisher_full_dataset.csv', index=False)

print(f'✅ Generated {len(df)} records')
print(f'✅ Saved: smart_fisher_full_dataset.csv')
print(f'📊 Average trip cost: LKR {df[\"total_base_cost_lkr\"].mean():,.0f}')
"
```

### 3️⃣ Train Model (2 min)
```bash
python complete_ml_training_pipeline.py
```

Expected output:
```
🏆 BEST MODEL: Random Forest
   Test R²: 0.8750 (87.50%)
   Test SMAPE: 8.45%
✅ READY FOR DEPLOYMENT!
```

### 4️⃣ Start ML Service (30 sec)
```bash
# Terminal 1: Start Flask ML service
python ml_service.py
```

### 5️⃣ Start NestJS Backend (30 sec)
```bash
# Terminal 2: Start NestJS backend
cd ../Backend
pnpm install  # Only needed first time
pnpm run start:dev
```

## ✅ Verify Installation

### Test 1: ML Service Health
```bash
curl http://localhost:5000/health
```

Expected: `{"status":"healthy","service":"ml-prediction-service"}`

### Test 2: Make Prediction
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "boat_type": "IMUL",
    "engine_hp": 75,
    "trip_days": 1,
    "distance_km": 50,
    "crew_size": 3,
    "ice_capacity_kg": 200,
    "water_capacity_L": 100,
    "avg_speed_kmh": 12.0,
    "trip_month": 3,
    "wind_kph": 15,
    "wave_height_m": 1.0,
    "weather_factor": 1.0,
    "region": "West",
    "is_multi_day": false,
    "has_engine": true,
    "is_deep_sea": false
  }'
```

Expected: Prediction with costs in LKR

### Test 3: NestJS Integration
```bash
curl http://localhost:3000/api/ml-prediction/health
```

Expected: `{"status":"success","data":{...}}`

## 🎉 Done!

Your ML integration is ready! You can now:
- Make predictions from your backend
- Integrate with mobile app
- Deploy to production

## 📚 Next Steps

1. **Read Full Guide**: See `ML_INTEGRATION_GUIDE.md`
2. **Customize Model**: Adjust hyperparameters in `complete_ml_training_pipeline.py`
3. **Add Real Data**: Replace synthetic data with actual trip records
4. **Deploy**: Use Docker for production deployment

## 🆘 Need Help?

**Common Issues**:

1. **Port 5000 already in use**:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:5000 | xargs kill -9
   ```

2. **Module not found**:
   ```bash
   pip install -r requirements.txt --upgrade
   ```

3. **Dataset not found**:
   ```bash
   # Run the quick dataset generation script above
   # Or open datasetgeneration.ipynb in Jupyter
   ```

4. **Model file missing**:
   ```bash
   python complete_ml_training_pipeline.py
   ```

## 📊 Expected Performance

- **Training Time**: ~2 minutes (10,000 records)
- **Model R²**: 85-92%
- **Prediction Time**: <100ms per trip
- **Memory Usage**: ~500MB (model loaded)

## 🔄 Update Model

When you have new data:

```bash
# 1. Update dataset
# Add new records to smart_fisher_full_dataset.csv

# 2. Retrain model
python complete_ml_training_pipeline.py

# 3. Restart ML service
# Ctrl+C to stop, then:
python ml_service.py
```

## 🚢 Production Checklist

- [ ] Dataset has real trip data (not just synthetic)
- [ ] Model R² > 0.85 on test set
- [ ] ML service responds within 1 second
- [ ] NestJS integration tested
- [ ] Error handling in place
- [ ] Logging configured
- [ ] Environment variables set
- [ ] Backup of model files
- [ ] Monitoring set up
- [ ] API documentation shared with team

---

**Quick Start Time**: ~5 minutes  
**First Prediction**: Within 10 minutes  
**Production Ready**: 1 hour (with testing)
