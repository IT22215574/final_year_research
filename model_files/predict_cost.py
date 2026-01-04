#!/usr/bin/env python3
"""
Fish Trip Cost Prediction API Script
This script loads the ML model and makes predictions for the NestJS backend.
"""

import sys
import json
import joblib
import pandas as pd
import os
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.absolute()

# Model file paths
MODEL_PATH = SCRIPT_DIR / 'fishing_cost_model_latest.joblib'
SCALER_PATH = SCRIPT_DIR / 'scaler.joblib'
ENCODERS_PATH = SCRIPT_DIR / 'label_encoders.joblib'

def load_model():
    """Load the trained model and preprocessing objects."""
    try:
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        encoders = joblib.load(ENCODERS_PATH)
        return model, scaler, encoders
    except Exception as e:
        print(json.dumps({'error': f'Failed to load model: {str(e)}'}), file=sys.stderr)
        sys.exit(1)

def predict_cost(input_data, model, scaler, encoders):
    """Make a cost prediction for the given trip parameters."""
    try:
        # Create DataFrame from input
        df = pd.DataFrame([input_data])
        
        # Expected feature order
        feature_order = [
            'boat_type', 'engine_hp', 'trip_days', 'distance_km',
            'wind_kph', 'wave_m', 'month', 'port_name',
            'diesel_price_LKR', 'petrol_price_LKR', 'kerosene_price_LKR'
        ]
        
        # Ensure all features are present
        for feature in feature_order:
            if feature not in df.columns:
                raise ValueError(f'Missing required feature: {feature}')
        
        # Encode categorical features
        categorical_features = ['boat_type', 'port_name']
        for col in categorical_features:
            if col in encoders:
                df[col] = encoders[col].transform(df[col].astype(str))
        
        # Reorder columns to match training
        df = df[feature_order]
        
        # Scale features
        df_scaled = scaler.transform(df)
        
        # Make prediction
        prediction = model.predict(df_scaled)[0]
        
        return float(prediction)
    
    except Exception as e:
        print(json.dumps({'error': f'Prediction failed: {str(e)}'}), file=sys.stderr)
        sys.exit(1)

def main():
    """Main entry point for the script."""
    try:
        # Check if input data was provided
        if len(sys.argv) < 2:
            print(json.dumps({'error': 'No input data provided'}), file=sys.stderr)
            sys.exit(1)
        
        # Parse input JSON
        input_json = sys.argv[1]
        input_data = json.loads(input_json)
        
        # Load model
        model, scaler, encoders = load_model()
        
        # Make prediction
        predicted_cost = predict_cost(input_data, model, scaler, encoders)
        
        # Return result as JSON
        result = {
            'predicted_cost': predicted_cost,
            'currency': 'LKR',
            'input_data': input_data
        }
        
        print(json.dumps(result))
        sys.exit(0)
    
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Unexpected error: {str(e)}'}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
