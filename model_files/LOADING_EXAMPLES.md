# Model Loading Examples - All Formats

## Format 1: JOBLIB (Recommended for scikit-learn)

```python
import joblib
import pandas as pd
from pathlib import Path

MODEL_DIR = Path(__file__).parent

# Load model components
model = joblib.load(MODEL_DIR / 'fishing_cost_model_latest.joblib')
scaler = joblib.load(MODEL_DIR / 'scaler.joblib')
encoders = joblib.load(MODEL_DIR / 'label_encoders.joblib')

print("Model loaded successfully using JOBLIB")
```

## Format 2: PICKLE (.pkl)

```python
import pickle
from pathlib import Path

MODEL_DIR = Path(__file__).parent

# Load model components separately
with open(MODEL_DIR / 'fishing_cost_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open(MODEL_DIR / 'scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

with open(MODEL_DIR / 'label_encoders.pkl', 'rb') as f:
    encoders = pickle.load(f)

print("Model loaded successfully using PICKLE")
```

## Format 3: COMPLETE BUNDLE (All-in-One) - EASIEST!

```python
import pickle
from pathlib import Path

MODEL_DIR = Path(__file__).parent

# Load everything from one file
with open(MODEL_DIR / 'model_bundle_complete.pkl', 'rb') as f:
    bundle = pickle.load(f)

model = bundle['model']
scaler = bundle['scaler']
encoders = bundle['encoders']
timestamp = bundle['timestamp']

print(f"Complete bundle loaded successfully")
print(f"Model saved on: {timestamp}")
```

## Making Predictions (Works with all formats)

```python
import pandas as pd

# Prepare input
input_data = pd.DataFrame([{
    'boat_type': 'MTRB',
    'engine_hp': 150,
    'trip_days': 3,
    'distance_km': 250.0,
    'wind_kph': 20.0,
    'wave_m': 2.0,
    'month': 6,
    'port_name': 'Colombo',
    'diesel_price_LKR': 205.0,
    'petrol_price_LKR': 195.0,
    'kerosene_price_LKR': 185.0
}])

# Encode categorical variables
for col, encoder in encoders.items():
    if col in input_data.columns:
        input_data[col] = encoder.transform(input_data[col].astype(str))

# Scale features
input_scaled = scaler.transform(input_data)

# Predict
predicted_cost = model.predict(input_scaled)[0]
print(f"Predicted Cost: LKR {predicted_cost:,.2f}")
```
