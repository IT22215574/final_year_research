import os
import pickle
import pandas as pd

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "model", "model.pkl")

def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Train it first.")
    with open(MODEL_PATH, "rb") as f:
        payload = pickle.load(f)
    return payload

def predict_price(fish_type, market, temp=0.0, rainfall=0.0, fuel=0.0, demand=0.0, season=0.0, prev_price=0.0):
    payload = load_model()
    model = payload["model"]
    mappings = payload["mappings"]
    feature_cols = payload["feature_cols"]

    # Encode fish type
    if fish_type in mappings.get("fishtypes", []):
        fish_id = mappings["fishtypes"].index(fish_type)
    else:
        fish_id = 0

    # Encode market
    if market in mappings.get("markets", []):
        market_id = mappings["markets"].index(market)
    else:
        market_id = 0

    # Build feature row
    row = {
        "FishType_id": fish_id,
        "Market_id": market_id,
        "Temp_C": temp,
        "Rainfall_mm": rainfall,
        "FuelPrice_LKR": fuel,
        "DemandIndex": demand,
        "Season": season,
        "PrevPrice": prev_price
    }

    X = pd.DataFrame([row])[feature_cols]
    prediction = model.predict(X)[0]
    return prediction

if __name__ == "__main__":
    price = predict_price("tuna", "All_Days", temp=28, rainfall=5, fuel=400, demand=1.2, season=1, prev_price=1420)
    print(f"Predicted price: {price:.2f} LKR/kg")