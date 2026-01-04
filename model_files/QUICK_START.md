# Fishing Cost Prediction Model - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites

```bash
pip install pandas numpy scikit-learn xgboost joblib
```

### Option 1: Use the Test Script (Recommended)

```bash
cd model_files
python test_model_loading.py
```

This will:

- Load the trained model
- Run 3 test predictions
- Display results and integration guide

### Option 2: Direct Python Integration

```python
import joblib
import pandas as pd
from pathlib import Path

# 1. Load model files (do this once at startup)
model = joblib.load('model_files/fishing_cost_model_latest.joblib')
scaler = joblib.load('model_files/scaler.joblib')
encoders = joblib.load('model_files/label_encoders.joblib')

# 2. Prepare your input data
input_data = pd.DataFrame([{
    'boat_type': 'MTRB',           # Boat type
    'engine_hp': 150,              # Engine power
    'trip_days': 3,                # Trip duration
    'distance_km': 250.0,          # Distance
    'wind_kph': 20.0,              # Wind speed
    'wave_m': 2.0,                 # Wave height
    'month': 6,                    # Month (1-12)
    'port_name': 'Colombo',        # Port
    'diesel_price_LKR': 205.0,     # Diesel price
    'petrol_price_LKR': 195.0,     # Petrol price
    'kerosene_price_LKR': 185.0    # Kerosene price
}])

# 3. Encode categorical variables
for col, encoder in encoders.items():
    input_data[col] = encoder.transform(input_data[col].astype(str))

# 4. Scale features
input_scaled = scaler.transform(input_data)

# 5. Predict
cost = model.predict(input_scaled)[0]
print(f"Predicted Cost: LKR {cost:,.2f}")
```

## 📊 Valid Input Values

### Boat Types

- `MTRB` - Multiday Trawler Boat (large, deep-sea)
- `OFRP` - One-day Fiber Reinforced Plastic (small day boat)
- `NTRB` - Non-mechanized Traditional Boat (medium)
- `IDAY` - Inboard Day Boat (mechanized day boat)
- `Vallam` - Traditional outrigger boat
- `Beach Seine` - Shore-based fishing

### Ports

- `Colombo`
- `Negombo`
- `Galle`
- `Trincomalee`
- `Jaffna`
- `Batticaloa`
- `Chilaw`
- `Kalpitiya`

### Numerical Ranges

- **engine_hp**: 5-250 HP
- **trip_days**: 1-7 days
- **distance_km**: 10-600 km
- **wind_kph**: 5-30 km/h
- **wave_m**: 0.5-4.0 meters
- **month**: 1-12
- **fuel_prices**: 150-250 LKR/liter (typical range)

## 🎯 Example Predictions

### Small Day Boat Trip

```python
cost = predict_fishing_cost(
    boat_type='OFRP',
    engine_hp=19,
    trip_days=1,
    distance_km=38.7,
    wind_kph=15.2,
    wave_m=1.2,
    month=3,
    port_name='Negombo',
    diesel_price=200.0,
    petrol_price=190.0,
    kerosene_price=180.0
)
# Expected: ~20,000 LKR
```

### Large Multi-day Trip

```python
cost = predict_fishing_cost(
    boat_type='MTRB',
    engine_hp=248,
    trip_days=5,
    distance_km=522.4,
    wind_kph=24.9,
    wave_m=2.8,
    month=7,
    port_name='Trincomalee',
    diesel_price=210.0,
    petrol_price=195.0,
    kerosene_price=185.0
)
# Expected: ~5,000,000 LKR
```

## 🔧 Integration with NestJS Backend

### Step 1: Install Python Dependencies in Backend

```bash
cd Backend
pip install pandas numpy scikit-learn xgboost joblib
```

### Step 2: Create Python Service File

Create `Backend/src/ml/predict_cost.py`:

```python
import sys
import json
import joblib
import pandas as pd
from pathlib import Path

# Load model files
MODEL_DIR = Path(__file__).parent.parent.parent.parent / 'model_files'
model = joblib.load(MODEL_DIR / 'fishing_cost_model_latest.joblib')
scaler = joblib.load(MODEL_DIR / 'scaler.joblib')
encoders = joblib.load(MODEL_DIR / 'label_encoders.joblib')

def predict(data):
    df = pd.DataFrame([data])
    for col, encoder in encoders.items():
        if col in df.columns:
            df[col] = encoder.transform(df[col].astype(str))
    scaled = scaler.transform(df)
    return float(model.predict(scaled)[0])

if __name__ == "__main__":
    input_data = json.loads(sys.argv[1])
    result = predict(input_data)
    print(json.dumps({"predicted_cost": result}))
```

### Step 3: Create NestJS Service

Create `Backend/src/fishing-cost/fishing-cost.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

@Injectable()
export class FishingCostService {
  private readonly pythonScript = path.join(
    __dirname,
    "..",
    "..",
    "src",
    "ml",
    "predict_cost.py"
  );

  async predictCost(params: {
    boat_type: string;
    engine_hp: number;
    trip_days: number;
    distance_km: number;
    wind_kph: number;
    wave_m: number;
    month: number;
    port_name: string;
    diesel_price_LKR: number;
    petrol_price_LKR: number;
    kerosene_price_LKR: number;
  }): Promise<number> {
    const jsonInput = JSON.stringify(params);
    const command = `python "${this.pythonScript}" '${jsonInput}'`;

    try {
      const { stdout } = await execAsync(command);
      const result = JSON.parse(stdout);
      return result.predicted_cost;
    } catch (error) {
      throw new Error(`Model prediction failed: ${error.message}`);
    }
  }
}
```

### Step 4: Create Controller Endpoint

```typescript
@Post('predict-cost')
async predictCost(@Body() dto: PredictCostDto) {
  const predictedCost = await this.fishingCostService.predictCost({
    boat_type: dto.boatType,
    engine_hp: dto.engineHp,
    trip_days: dto.tripDays,
    distance_km: dto.distanceKm,
    wind_kph: dto.windKph,
    wave_m: dto.waveM,
    month: dto.month,
    port_name: dto.portName,
    diesel_price_LKR: dto.fuelPrices.diesel,
    petrol_price_LKR: dto.fuelPrices.petrol,
    kerosene_price_LKR: dto.fuelPrices.kerosene,
  });

  return {
    success: true,
    predicted_cost: predictedCost,
    currency: 'LKR',
    model_version: 'v1.0',
  };
}
```

## 📱 Testing the API

```bash
curl -X POST http://localhost:5000/api/fishing/predict-cost \
  -H "Content-Type: application/json" \
  -d '{
    "boatType": "MTRB",
    "engineHp": 150,
    "tripDays": 3,
    "distanceKm": 250.0,
    "windKph": 20.0,
    "waveM": 2.0,
    "month": 6,
    "portName": "Colombo",
    "fuelPrices": {
      "diesel": 205.0,
      "petrol": 195.0,
      "kerosene": 185.0
    }
  }'
```

## ⚠️ Common Issues

### Issue 1: Module Not Found

```bash
# Solution: Install in correct Python environment
pip install pandas numpy scikit-learn xgboost joblib
```

### Issue 2: Encoder Error (Unknown Category)

```python
# Solution: Validate input before prediction
valid_boat_types = ['MTRB', 'OFRP', 'NTRB', 'IDAY', 'Vallam', 'Beach Seine']
if boat_type not in valid_boat_types:
    raise ValueError(f"Invalid boat type: {boat_type}")
```

### Issue 3: Model File Not Found

```python
# Solution: Use absolute path
from pathlib import Path
MODEL_DIR = Path(__file__).parent
model = joblib.load(MODEL_DIR / 'fishing_cost_model_latest.joblib')
```

## 📚 Additional Resources

- **Full Documentation**: See `MODEL_REPORT.md`
- **Model Performance**: R² = 0.9946 (99.46% accuracy)
- **Average Error**: ±20,350 LKR
- **Test Script**: `test_model_loading.py`

## 💡 Tips

1. **Load Once**: Load model at server startup, not per request
2. **Validate Inputs**: Check all inputs before prediction
3. **Handle Errors**: Wrap predictions in try-catch
4. **Log Predictions**: Track requests for monitoring
5. **Cache Results**: Cache predictions for identical inputs

## 🎉 Success!

If you can run `test_model_loading.py` successfully, your model is ready to use!

---

**Need Help?** Check `MODEL_REPORT.md` for detailed technical information.
