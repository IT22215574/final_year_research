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

def _find_category_index(value, categories):
    if value is None:
        return 0
    s = str(value).strip().lower()
    for i, cat in enumerate(categories):
        if str(cat).strip().lower() == s:
            return i
    # try numeric
    try:
        v = int(value)
        if 0 <= v < len(categories):
            return v
    except Exception:
        pass
    return 0

def predict_price(fish_type, market, temp=0.0, rainfall=0.0, fuel=0.0, demand=0.0, season=0.0, prev_price=0.0):
    payload = load_model()
    model = payload["model"]
    mappings = payload.get("mappings", {})
    feature_cols = payload.get("feature_cols", [])

    fishtypes = mappings.get("fishtypes", [])
    markets = mappings.get("markets", [])

    fish_id = _find_category_index(fish_type, fishtypes)
    market_id = _find_category_index(market, markets)

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