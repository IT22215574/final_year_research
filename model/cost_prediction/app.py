from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# ---------------------------------
# Absolute path to models folder
# ---------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

# ---------------------------------
# Load models
# ---------------------------------
fuel_model = None
cost_model = None

try:
    fuel_model = joblib.load(os.path.join(MODEL_DIR, "fuel_model.pkl"))
    print("✅ Fuel model loaded")
except Exception as e:
    print("⚠ Fuel model not found. Using fallback.", e)

try:
    cost_model = joblib.load(os.path.join(MODEL_DIR, "cost_model.pkl"))
    print("✅ Cost model loaded")
except Exception as e:
    print("⚠ Cost model not found. Using fallback.", e)

# ---------------------------------
# Home endpoint
# ---------------------------------
@app.route("/")
def home():
    return {"message": "Cost Prediction API running"}

# ---------------------------------
# Fuel prediction endpoint
# ---------------------------------
@app.route("/predict-fuel", methods=["POST"])
def predict_fuel():
    if fuel_model is None:
        return jsonify({
            "statusCode": 503,
            "message": "ML prediction service unavailable"
        }), 503

    data = request.json
    try:
        features = np.array([[
            data["distanceKm"],
            data["engineHorsePower"],
            data["windSpeed"],
            data["waveHeight"],
            data["tripDurationHours"]
        ]])

        prediction = fuel_model.predict(features)[0]
        return jsonify({"predictedFuelLiters": round(float(prediction), 2)})

    except KeyError as e:
        return jsonify({
            "statusCode": 400,
            "message": f"Missing required field: {e}"
        }), 400

# ---------------------------------
# Cost prediction endpoint
# ---------------------------------
@app.route("/predict-cost", methods=["POST"])
def predict_cost():
    if cost_model is None:
        return jsonify({
            "statusCode": 503,
            "message": "ML prediction service unavailable"
        }), 503

    data = request.json
    try:
        features = np.array([[
            data["distanceKm"],
            data["engineHorsePower"],
            data["windSpeed"],
            data["waveHeight"],
            data["tripDurationHours"],
            data["fuelPricePerLiter"]
        ]])

        prediction = cost_model.predict(features)[0]
        return jsonify({"predictedCost": round(float(prediction), 2)})

    except KeyError as e:
        return jsonify({
            "statusCode": 400,
            "message": f"Missing required field: {e}"
        }), 400

# ---------------------------------
# Run server
# ---------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)