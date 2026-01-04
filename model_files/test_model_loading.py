"""
Test script to verify the trained model can be loaded and used for predictions.
This demonstrates how to integrate the model into your application.
"""

import joblib
import json
import pandas as pd
import numpy as np
from pathlib import Path

# Get the model directory
MODEL_DIR = Path(__file__).parent

def load_model():
    """Load the trained model and preprocessing objects."""
    print("Loading model files...")
    
    # Load model
    model = joblib.load(MODEL_DIR / 'fishing_cost_model_latest.joblib')
    
    # Load scaler
    scaler = joblib.load(MODEL_DIR / 'scaler.joblib')
    
    # Load label encoders
    label_encoders = joblib.load(MODEL_DIR / 'label_encoders.joblib')
    
    # Load metadata
    with open(MODEL_DIR / 'model_metadata.json', 'r') as f:
        metadata = json.load(f)
    
    print("✅ All model files loaded successfully!")
    print(f"   Model: {metadata['model_name']}")
    print(f"   Test R²: {metadata['test_r2']:.4f}")
    print(f"   Features: {len(metadata['feature_names'])}")
    
    return model, scaler, label_encoders, metadata


def predict_fishing_cost(boat_type, engine_hp, trip_days, distance_km, 
                        wind_kph, wave_m, month, port_name,
                        diesel_price, petrol_price, kerosene_price,
                        model=None, scaler=None, encoders=None, metadata=None):
    """
    Predict fishing trip cost based on input parameters.
    
    Args:
        boat_type: Type of boat (e.g., 'MTRB', 'OFRP', 'NTRB', 'IDAY', 'Vallam', 'Beach Seine')
        engine_hp: Engine horsepower
        trip_days: Duration of trip in days
        distance_km: Distance traveled in kilometers
        wind_kph: Wind speed in km/h
        wave_m: Wave height in meters
        month: Month of the trip (1-12)
        port_name: Name of the port (e.g., 'Colombo', 'Galle', 'Trincomalee', etc.)
        diesel_price: Diesel price per liter in LKR
        petrol_price: Petrol price per liter in LKR
        kerosene_price: Kerosene price per liter in LKR
        model: Pre-loaded model (optional, will load if not provided)
        scaler: Pre-loaded scaler (optional, will load if not provided)
        encoders: Pre-loaded encoders (optional, will load if not provided)
        metadata: Pre-loaded metadata (optional, will load if not provided)
    
    Returns:
        float: Predicted cost in LKR
    """
    # Load model if not provided
    if model is None or scaler is None or encoders is None:
        model, scaler, encoders, metadata = load_model()
    
    # Create input DataFrame
    input_data = pd.DataFrame([{
        'boat_type': boat_type,
        'engine_hp': engine_hp,
        'trip_days': trip_days,
        'distance_km': distance_km,
        'wind_kph': wind_kph,
        'wave_m': wave_m,
        'month': month,
        'port_name': port_name,
        'diesel_price_LKR': diesel_price,
        'petrol_price_LKR': petrol_price,
        'kerosene_price_LKR': kerosene_price
    }])
    
    # Encode categorical variables
    for col, encoder in encoders.items():
        if col in input_data.columns:
            input_data[col] = encoder.transform(input_data[col].astype(str))
    
    # Ensure correct feature order
    input_data = input_data[metadata['feature_names']]
    
    # Scale features
    input_scaled = scaler.transform(input_data)
    
    # Predict
    prediction = model.predict(input_scaled)[0]
    
    return prediction


def main():
    """Test the model loading and prediction functionality."""
    print("="*60)
    print("FISHING COST MODEL - FUNCTIONALITY TEST")
    print("="*60)
    
    # Load model
    model, scaler, encoders, metadata = load_model()
    
    # Test Case 1: Small boat, short trip
    print("\n" + "="*60)
    print("TEST CASE 1: Small OFRP boat, 1-day trip")
    print("="*60)
    
    cost_1 = predict_fishing_cost(
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
        kerosene_price=180.0,
        model=model,
        scaler=scaler,
        encoders=encoders,
        metadata=metadata
    )
    
    print(f"\n💰 Predicted Cost: LKR {cost_1:,.2f}")
    
    # Test Case 2: Large boat, longer trip
    print("\n" + "="*60)
    print("TEST CASE 2: Large MTRB boat, 5-day trip")
    print("="*60)
    
    cost_2 = predict_fishing_cost(
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
        kerosene_price=185.0,
        model=model,
        scaler=scaler,
        encoders=encoders,
        metadata=metadata
    )
    
    print(f"\n💰 Predicted Cost: LKR {cost_2:,.2f}")
    
    # Test Case 3: Medium boat
    print("\n" + "="*60)
    print("TEST CASE 3: Medium NTRB boat, 3-day trip")
    print("="*60)
    
    cost_3 = predict_fishing_cost(
        boat_type='NTRB',
        engine_hp=45,
        trip_days=3,
        distance_km=185.3,
        wind_kph=18.5,
        wave_m=1.8,
        month=11,
        port_name='Galle',
        diesel_price=205.0,
        petrol_price=192.0,
        kerosene_price=182.0,
        model=model,
        scaler=scaler,
        encoders=encoders,
        metadata=metadata
    )
    
    print(f"\n💰 Predicted Cost: LKR {cost_3:,.2f}")
    
    print("\n" + "="*60)
    print("✅ All tests passed! Model is ready for integration.")
    print("="*60)
    
    # Display integration guide
    print("\n📚 INTEGRATION GUIDE:")
    print("   1. Import this module in your backend")
    print("   2. Call load_model() once at startup")
    print("   3. Use predict_fishing_cost() for predictions")
    print("   4. Pass the loaded objects to avoid reloading")
    print("\n   Example:")
    print("   >>> model, scaler, encoders, metadata = load_model()")
    print("   >>> cost = predict_fishing_cost(boat_type='MTRB', ...)")


if __name__ == "__main__":
    main()
