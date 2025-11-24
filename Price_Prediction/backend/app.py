# app.py
import os
import pickle
import threading
import subprocess
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(__file__)
MODEL_FILE = os.path.join(BASE_DIR, "model", "model.pkl")
DATA_FILE = os.path.join(BASE_DIR, "dataset", "fish_prices.csv")
TRAIN_SCRIPT = os.path.join(BASE_DIR, "model_train.py")

app = Flask(__name__)
CORS(app)

def load_model():
    if not os.path.exists(MODEL_FILE):
        return None, {}, [], None
    data = pickle.load(open(MODEL_FILE, "rb"))
    if isinstance(data, dict) and "model" in data:
        return (
            data["model"],
            data.get("mappings", {}),
            data.get("feature_cols", []),
            data.get("price_col", None),
        )
    return data, {}, [], None


model, mappings, feature_cols, price_col = load_model()

def background_retrain():
    print("🔁 Background retrain started...")
    try:
        subprocess.run([sys.executable, TRAIN_SCRIPT], check=True)
        global model, mappings, feature_cols, price_col
        model, mappings, feature_cols, price_col = load_model()
        print("✅ Background retrain finished and model reloaded.")
    except subprocess.CalledProcessError as e:
        print("❌ Retrain failed:", e)

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "✅ Fish Price Prediction API running",
        "routes": ["/predict (POST)", "/update_data (POST file)", "/retrain (GET)"]
    })

def map_category(value, categories):
    """Map a name or numeric to the category code. Accepts numeric string too."""
    if value is None:
        return 0
    # if already numeric
    try:
        v = int(value)
        if 0 <= v < len(categories):
            return v
    except Exception:
        pass
    # try match by string
    val_str = str(value).strip()
    if val_str in categories:
        return categories.index(val_str)
    # not found -> append? we will fallback to 0
    return 0

@app.route("/predict", methods=["POST"])
def predict():
    global model, mappings, feature_cols
    if model is None:
        return jsonify({"error": "Model not found. Train first."}), 500

    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    # map inputs
    fish_in = data.get("fish_type") or data.get("fish") or data.get("FishType") or 0
    market_in = data.get("market") or data.get("Market") or 0
    temp = float(data.get("temp", 29))
    rainfall = float(data.get("rainfall", 0))
    fuel = float(data.get("fuel_price", 0))
    demand = float(data.get("demand_index", 0))
    season = float(data.get("season", 0))
    prev_price = float(data.get("prev_price", 0))

    # use saved mappings
    fishtypes = mappings.get("fishtypes", [])
    markets = mappings.get("markets", [])
    fish_code = map_category(fish_in, fishtypes)
    market_code = map_category(market_in, markets)

    # Build feature vector in same order as feature_cols
    feature_map = {
        "FishType_id": fish_code,
        "Market_id": market_code,
        "Temp_C": temp,
        "Rainfall_mm": rainfall,
        "FuelPrice_LKR": fuel,
        "DemandIndex": demand,
        "Season": season,
        "PrevPrice": prev_price
    }
    X = []
    for col in feature_cols:
        X.append(float(feature_map.get(col, 0.0)))
    X = np.array(X).reshape(1, -1)

    try:
        pred = model.predict(X)
        value = float(pred[0])
        return jsonify({"predicted_price": round(value, 2)})
    except Exception as e:
        return jsonify({"error": "Prediction failed", "detail": str(e)}), 500

@app.route("/update_data", methods=["POST"])
def update_data():
    if "file" not in request.files:
        return jsonify({"error": "Please upload CSV file under `file`"}), 400
    csv_file = request.files["file"]
    try:
        new_df = pd.read_csv(csv_file, parse_dates=["Date"], dayfirst=True)
    except Exception:
        # fallback: read without parse and normalize later
        csv_file.seek(0)
        new_df = pd.read_csv(csv_file)

    # normalize headers
    new_df.columns = new_df.columns.str.strip().str.replace("\n", " ").str.replace("\r", "")
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    if os.path.exists(DATA_FILE):
        old_df = pd.read_csv(DATA_FILE)
        combined = pd.concat([old_df, new_df], ignore_index=True, sort=False)
        combined = combined.drop_duplicates(subset=["Date", "FishType", "Market"], keep="last")
    else:
        combined = new_df
    combined.to_csv(DATA_FILE, index=False)

    # start background retrain
    threading.Thread(target=background_retrain, daemon=True).start()
    return jsonify({"status": "Dataset updated; retraining started", "records_added": len(new_df)})

@app.route("/retrain", methods=["GET"])
def retrain():
    threading.Thread(target=background_retrain, daemon=True).start()
    return jsonify({"status": "Retraining started in background"})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
