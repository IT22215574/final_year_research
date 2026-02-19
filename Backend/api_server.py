from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

import numpy as np
import pandas as pd
import pickle
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Fish Price Predictor API", version="1.0.0")

BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "dataset" / "processed"

# Load artifacts at startup
try:
    with open(MODELS_DIR / "rf_model.pkl", "rb") as f:
        rf_model = pickle.load(f)
    with open(MODELS_DIR / "gb_model.pkl", "rb") as f:
        gb_model = pickle.load(f)
    with open(MODELS_DIR / "feature_names.pkl", "rb") as f:
        feature_names: List[str] = pickle.load(f)
    with open(MODELS_DIR / "le_sinhala.pkl", "rb") as f:
        le_sinhala = pickle.load(f)
    fish_df = pd.read_csv(DATA_DIR / "fish_names.csv")
except Exception as exc:  # pragma: no cover - startup failure
    raise RuntimeError(f"Failed to load models or data: {exc}")


class PredictRequest(BaseModel):
    fish_id: Optional[int] = None
    sinhala_name: Optional[str] = None
    date: str  # YYYY-MM-DD


def _encode_fish(sinhala_name: str) -> int:
    try:
        return int(le_sinhala.transform([sinhala_name])[0])
    except Exception:
        return 0


def _find_fish(req: PredictRequest) -> pd.Series:
    if req.fish_id is not None:
        matches = fish_df[fish_df["fish_id"] == req.fish_id]
    elif req.sinhala_name:
        matches = fish_df[fish_df["sinhala_name"] == req.sinhala_name]
    else:
        matches = pd.DataFrame()
    if matches.empty:
        raise HTTPException(status_code=404, detail="Fish not found")
    return matches.iloc[0]


def _build_feature_row(target_date: datetime, fish_encoded: int) -> dict:
    year = target_date.year
    month = target_date.month
    day_of_week = target_date.weekday()
    week_of_year = target_date.isocalendar()[1]
    season = 1 if month in [12, 1, 2] else 2 if month in [3, 4, 5] else 3 if month in [6, 7, 8] else 4
    is_weekend = 1 if day_of_week >= 5 else 0
    features_dict = {
        "fish_encoded": fish_encoded,
        "day_of_week": day_of_week,
        "month": month,
        "year": year,
        "week_of_year": week_of_year,
        "month_sin": np.sin(2 * np.pi * month / 12),
        "month_cos": np.cos(2 * np.pi * month / 12),
        "season": season,
        "is_weekend": is_weekend,
        "is_festival_day": 0,
        "before_festival_window": 0,
        "days_to_festival": 999,
        "weather_effect": 0,
        "poya_effect": 0,
        "festival_effect": 0,
    }
    return {name: features_dict.get(name, 0) for name in feature_names}


def _predict_series(center_date: datetime, fish_encoded: int):
    dates: List[str] = []
    prices: List[float] = []
    for offset in range(-15, 16):
        d = center_date + timedelta(days=offset)
        feature_row = _build_feature_row(d, fish_encoded)
        features_df = pd.DataFrame([feature_row])
        rf_pred = float(rf_model.predict(features_df)[0])
        gb_pred = float(gb_model.predict(features_df)[0])
        ensemble_pred = (rf_pred + gb_pred) / 2
        dates.append(d.date().isoformat())
        prices.append(ensemble_pred)
    return dates, prices


@app.get("/")
def root():
    return {
        "message": "Fish Price Predictor API",
        "version": "1.0.0",
        "endpoints": {
            "GET /fish": "List all fish species",
            "POST /predict": "Predict price for fish_id and date"
        }
    }


@app.get("/fish")
def list_fish():
    return fish_df.to_dict(orient="records")


@app.post("/predict")
def predict(req: PredictRequest):
    try:
        fish_row = _find_fish(req)
        target_date = datetime.fromisoformat(req.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    fish_encoded = _encode_fish(fish_row["sinhala_name"])
    dates, prices = _predict_series(target_date, fish_encoded)
    current_price = prices[15]

    return {
        "fish": fish_row.to_dict(),
        "predicted": current_price,
        "series": [{"date": d, "price": p} for d, p in zip(dates, prices)],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
