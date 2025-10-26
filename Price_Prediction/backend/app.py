from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle, os, numpy as np, pandas as pd
from datetime import datetime
import threading
import subprocess

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(__file__)
MODEL_FILE = os.path.join(BASE_DIR, "model", "model.pkl")
DATA_FILE = os.path.join(BASE_DIR, "dataset", "fish_prices.csv")
TRAIN_SCRIPT = os.path.join(BASE_DIR, "model_train.py")

# ------------------------------
# Load model on startup
# ------------------------------
def load_model():
    if not os.path.exists(MODEL_FILE):
        return None, {}
    data = pickle.load(open(MODEL_FILE, "rb"))
    if isinstance(data, dict) and "model" in data:
        return data["model"], data.get("mappings", {})
    return data, {}

model, mappings = load_model()

# ------------------------------
# Helper - background retrain
# ------------------------------
def background_retrain():
    print("🔁 Starting background retrain...")
    subprocess.run(["python", TRAIN_SCRIPT])
    global model, mappings
    model, mappings = load_model()
    print("✅ Retrain complete and model reloaded!")

# ------------------------------
# Routes
# ------------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "✅ Fish Price Prediction API is running",
        "routes": ["/predict (POST)", "/update_data (POST)", "/retrain (GET)"]
    })

# ------------------------------
# Predict price
# ------------------------------
@app.route("/predict", methods=["POST"])
def predict():
    global model
    if model is None:
        return jsonify({"error": "❌ Model not found. Please train first."}), 500
    
    data = request.get_json(force=True)
    try:
        fish_type = float(data.get("fish_type", 0))
        market = float(data.get("market", 0))
        temp = float(data.get("temp", 29))
        rainfall = float(data.get("rainfall", 5))
        fuel = float(data.get("fuel_price", 480))
        demand = float(data.get("demand_index", 0.8))
        season = float(data.get("season", 0))
        prev_price = float(data.get("prev_price", 1000))

        X = np.array([[fish_type, market, temp, rainfall, fuel, demand, season, prev_price]])
        pred = model.predict(X)[0]
        return jsonify({"predicted_price": round(float(pred), 2)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ------------------------------
# Update data with new weekly prices
# ------------------------------
@app.route("/update_data", methods=["POST"])
def update_data():
    if "file" not in request.files:
        return jsonify({"error": "Please upload a CSV file"}), 400

    csv_file = request.files["file"]
    new_df = pd.read_csv(csv_file, parse_dates=["Date"], dayfirst=True)

    if not os.path.exists(DATA_FILE):
        new_df.to_csv(DATA_FILE, index=False)
        message = "✅ Dataset created."
    else:
        old_df = pd.read_csv(DATA_FILE, parse_dates=["Date"], dayfirst=True)
        combined = pd.concat([old_df, new_df], ignore_index=True).drop_duplicates(subset=["Date", "FishType", "Market"])
        combined.to_csv(DATA_FILE, index=False)
        message = "✅ Dataset updated with new records."

    # retrain in background
    threading.Thread(target=background_retrain).start()

    return jsonify({"status": message, "records_added": len(new_df)})

# ------------------------------
# Manual retrain endpoint
# ------------------------------
@app.route("/retrain", methods=["GET"])
def retrain():
    threading.Thread(target=background_retrain).start()
    return jsonify({"status": "🔁 Retraining started in background"})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
