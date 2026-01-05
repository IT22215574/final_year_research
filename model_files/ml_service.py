"""
ML Service for NestJS Backend Integration
Smart Fisher Lanka - Trip Cost Prediction

This Flask service wraps the ML model and provides REST API endpoints
for the NestJS backend to consume.

Endpoints:
- POST /predict - Predict costs for a single trip
- POST /predict/batch - Predict costs for multiple trips
- GET /model/info - Get model information
- GET /health - Health check
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from production_predictor import TripCostPredictor

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for NestJS backend

# Initialize predictor (load model once at startup)
print("🚀 Initializing ML Service...")
try:
    predictor = TripCostPredictor(
        model_path="production_model/trip_cost_predictor.pkl",
        metadata_path="production_model/model_metadata.json"
    )
    print("✅ ML Service ready!")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    predictor = None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if predictor is not None else 'unhealthy',
        'service': 'ml-prediction-service',
        'version': '1.0.0'
    })


@app.route('/model/info', methods=['GET'])
def get_model_info():
    """Get model information"""
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        info = predictor.get_model_info()
        return jsonify({
            'status': 'success',
            'data': info
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/predict', methods=['POST'])
def predict_single():
    """
    Predict costs for a single trip
    
    Request body example:
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
    """
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        # Get trip data from request
        trip_data = request.get_json()
        
        if not trip_data:
            return jsonify({
                'status': 'error',
                'error': 'No trip data provided'
            }), 400
        
        # Make prediction
        result = predictor.predict(trip_data, include_confidence=True)
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Predict costs for multiple trips
    
    Request body example:
    {
        "trips": [
            { "boat_type": "IMUL", "trip_days": 1, ... },
            { "boat_type": "MDBT", "trip_days": 3, ... }
        ]
    }
    """
    if predictor is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        # Get trips data from request
        data = request.get_json()
        
        if not data or 'trips' not in data:
            return jsonify({
                'status': 'error',
                'error': 'No trips data provided'
            }), 400
        
        trips_data = data['trips']
        
        if not isinstance(trips_data, list):
            return jsonify({
                'status': 'error',
                'error': 'trips must be an array'
            }), 400
        
        # Make batch prediction
        results = predictor.predict_batch(trips_data, include_confidence=False)
        
        return jsonify({
            'status': 'success',
            'count': len(results),
            'data': results
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


# ==========================================================
# RUN SERVER
# ==========================================================

if __name__ == '__main__':
    print("\n" + "="*70)
    print("🚀 STARTING ML PREDICTION SERVICE")
    print("="*70)
    print("\n📊 Available Endpoints:")
    print("   GET  /health          - Health check")
    print("   GET  /model/info      - Model information")
    print("   POST /predict         - Single trip prediction")
    print("   POST /predict/batch   - Batch trip prediction")
    print("\n" + "="*70)
    
    # Run Flask server
    app.run(
        host='0.0.0.0',  # Accept connections from any IP
        port=5000,       # Port 5000
        debug=False      # Set to False in production
    )
