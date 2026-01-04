#!/usr/bin/env python3
"""Test script for the prediction API"""

import json
import subprocess
import sys

# Test case
test_data = {
    "boat_type": "OFRP",
    "engine_hp": 150,
    "trip_days": 1,
    "distance_km": 50,
    "wind_kph": 15,
    "wave_m": 1.5,
    "month": 1,
    "port_name": "Colombo",
    "diesel_price_LKR": 205,
    "petrol_price_LKR": 195,
    "kerosene_price_LKR": 185
}

print("Testing prediction script...")
print(f"Input: {json.dumps(test_data, indent=2)}")
print("-" * 50)

# Call the prediction script
result = subprocess.run(
    [sys.executable, "predict_cost.py", json.dumps(test_data)],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("✅ Prediction successful!")
    output = json.loads(result.stdout)
    print(f"Predicted Cost: LKR {output['predicted_cost']:,.2f}")
else:
    print("❌ Prediction failed!")
    print("Error:", result.stderr)
    sys.exit(1)
