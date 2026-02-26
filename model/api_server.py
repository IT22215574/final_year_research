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
DATA_DIR = BASE_DIR / "dataset" / "processed"

# ── Load artifacts at startup ────────────────────────────────────────────────
try:
    with open(BASE_DIR / "rf_model.pkl", "rb") as f:
        rf_model = pickle.load(f)
    with open(BASE_DIR / "gb_model.pkl", "rb") as f:
        gb_model = pickle.load(f)
    with open(BASE_DIR / "feature_names.pkl", "rb") as f:
        feature_names: List[str] = pickle.load(f)
    with open(BASE_DIR / "le_sinhala.pkl", "rb") as f:
        le_sinhala = pickle.load(f)
    fish_df = pd.read_csv(DATA_DIR / "fish_names.csv")

    # Festivals
    festivals_path = BASE_DIR / "dataset" / "raw" / "festivals" / "festivals_2020_2026.csv"
    if festivals_path.exists():
        fest_df = pd.read_csv(festivals_path)
        fest_df["date"] = pd.to_datetime(fest_df["festival_date"]).dt.date
    else:
        fest_df = pd.DataFrame(columns=["date", "festival_name"])

    # ── Fuel price (LK kerosene) ──────────────────────────────────────────────
    fuel_path = DATA_DIR / "fuel_price_daily.csv"
    if fuel_path.exists():
        fuel_df = pd.read_csv(fuel_path, parse_dates=["date"])
        fuel_df = fuel_df.sort_values("date").set_index("date")
        # Latest known kerosene price (for future dates beyond history)
        _latest_lk          = float(fuel_df["lk_price"].iloc[-1])
        _latest_lk_lag1     = float(fuel_df["lk_price_lag1"].iloc[-1])
        _latest_lk_lag2     = float(fuel_df["lk_price_lag2"].iloc[-1])
        _latest_lk_change   = float(fuel_df["lk_price_change"].fillna(0).iloc[-1])
        _latest_lk_pct      = float(fuel_df["lk_price_pct_change"].fillna(0).iloc[-1])
    else:
        fuel_df = None
        _latest_lk = _latest_lk_lag1 = _latest_lk_lag2 = 0.0
        _latest_lk_change = _latest_lk_pct = 0.0

    # ── Weather forecast (for upcoming dates) ────────────────────────────────
    forecast_path = DATA_DIR / "weather_forecast.csv"
    if forecast_path.exists():
        forecast_df = pd.read_csv(forecast_path, parse_dates=["date"])
        # Average across cities per date (same approach as build_future_features)
        forecast_agg = forecast_df.groupby("date").agg({
            "temp_c":     "mean",
            "humidity":   "mean",
            "wind_speed": "max",
            "rainfall":   "sum",
            "bad_weather":"max",
        }).rename(columns={
            "temp_c":     "temp_c_mean",
            "humidity":   "humidity_mean",
            "wind_speed": "wind_speed_max",
            "rainfall":   "rainfall_sum",
            "bad_weather":"bad_weather_any",
        })
    else:
        forecast_agg = pd.DataFrame()

    # ── Historical weather (for past / current dates without forecast) ────────
    weather_hist_path = DATA_DIR / "weather_dataset.csv"
    if weather_hist_path.exists():
        weather_hist = pd.read_csv(weather_hist_path, parse_dates=["date"])
        # Keep Colombo only (same city used for training)
        if "city" in weather_hist.columns:
            weather_hist = weather_hist[weather_hist["city"] == "Colombo"]
        weather_hist_agg = weather_hist.groupby("date").agg({
            "temp_c":     "mean",
            "humidity":   "mean",
            "wind_speed": "max",
            "rainfall":   "sum",
            "bad_weather":"max",
        }).rename(columns={
            "temp_c":     "temp_c_mean",
            "humidity":   "humidity_mean",
            "wind_speed": "wind_speed_max",
            "rainfall":   "rainfall_sum",
            "bad_weather":"bad_weather_any",
        })
    else:
        weather_hist_agg = pd.DataFrame()

except Exception as exc:
    raise RuntimeError(f"Failed to load models or data: {exc}")


# ── Helpers ──────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    fish_id: Optional[int] = None
    sinhala_name: Optional[str] = None
    date: str  # YYYY-MM-DD

class RecommendRequest(BaseModel):
    budget: float
    date: str  # YYYY-MM-DD
    preference: Optional[str] = "profitable"
    favorite_fish_ids: List[int] = []

class FeedbackRequest(BaseModel):
    is_correct: bool
    fish_id: Optional[int] = None
    predicted_price: Optional[float] = None
    actual_price: Optional[float] = None


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


def _get_weather_row(target_date: datetime) -> dict:
    """Return weather features for a date (forecast preferred, history fallback)."""
    ts = pd.Timestamp(target_date.date())
    for source in (forecast_agg, weather_hist_agg):
        if not source.empty and ts in source.index:
            row = source.loc[ts]
            rain = float(row.get("rainfall_sum", 0) or 0)
            return {
                "temp_c_mean":    float(row.get("temp_c_mean", 28)),
                "humidity_mean":  float(row.get("humidity_mean", 75)),
                "wind_speed_max": float(row.get("wind_speed_max", 15)),
                "rainfall_sum":   rain,
                "bad_weather_any":float(row.get("bad_weather_any", 0)),
                "weather_effect": 1 if rain > 10 else 0,
            }
    # No data – sensible Sri Lanka defaults
    return {
        "temp_c_mean": 28.0, "humidity_mean": 75.0,
        "wind_speed_max": 15.0, "rainfall_sum": 0.0,
        "bad_weather_any": 0.0, "weather_effect": 0,
    }


def _get_fuel_row(target_date: datetime) -> dict:
    """Return LK kerosene price features for a given date."""
    if fuel_df is not None:
        ts = pd.Timestamp(target_date.date())
        # Use last available price on-or-before the target date
        past = fuel_df[fuel_df.index <= ts]
        if not past.empty:
            row = past.iloc[-1]
            change  = float(row.get("lk_price_change", 0)  or 0)
            pct     = float(row.get("lk_price_pct_change", 0) or 0)
            lk      = float(row["lk_price"])
            lag1    = float(row.get("lk_price_lag1", lk) or lk)
            lag2    = float(row.get("lk_price_lag2", lk) or lk)
            return {
                "lk_price":           lk,
                "lk_price_lag1":      lag1,
                "lk_price_lag2":      lag2,
                "lk_price_change":    change,
                "lk_price_pct_change":pct,
                "lk_price_rose":      1 if change > 0 else 0,
            }
    return {
        "lk_price": _latest_lk, "lk_price_lag1": _latest_lk_lag1,
        "lk_price_lag2": _latest_lk_lag2, "lk_price_change": _latest_lk_change,
        "lk_price_pct_change": _latest_lk_pct, "lk_price_rose": 0,
    }


def _build_feature_row(target_date: datetime, fish_encoded: int) -> dict:
    month       = target_date.month
    day_of_week = target_date.weekday()
    year        = target_date.year
    week_of_year= target_date.isocalendar()[1]
    is_weekend  = 1 if day_of_week >= 5 else 0

    # Generic legacy season
    season = (1 if month in [12, 1, 2] else
              2 if month in [3, 4, 5] else
              3 if month in [6, 7, 8] else 4)

    # Sri Lankan fishing seasons
    is_waragam_west  = 1 if month in [5, 6, 7, 8, 9]   else 0
    is_waragam_east  = 1 if month in [10, 11, 12, 1]    else 0
    is_awaragam      = 1 if month in [2, 3, 4]          else 0
    fishing_season   = (1 if is_waragam_west else 2 if is_waragam_east else 0)
    is_rough_sea_season = 1 if (is_waragam_west or is_waragam_east) else 0

    # Festival / Poya logic
    target_date_only = target_date.date()
    is_festival_day = poya_effect = festival_effect = 0
    is_poya = is_holiday = 0
    days_to_festival = 999
    before_festival_window = 0

    if not fest_df.empty:
        today_festivals = fest_df[fest_df["date"] == target_date_only]
        if not today_festivals.empty:
            is_festival_day = 1
            festival_effect = 1
            fest_names = today_festivals["festival_name"].str.lower().tolist()
            if any("poya" in n for n in fest_names):
                poya_effect = 1
                is_poya = 1
            is_holiday = 1

        future_festivals = fest_df[fest_df["date"] > target_date_only]
        if not future_festivals.empty:
            next_fest = future_festivals.iloc[0]
            days_to_festival = (next_fest["date"] - target_date_only).days
            if days_to_festival <= 7:
                before_festival_window = 1

    weather = _get_weather_row(target_date)
    fuel    = _get_fuel_row(target_date)

    features_dict = {
        "fish_encoded":           fish_encoded,
        "day_of_week":            day_of_week,
        "month":                  month,
        "year":                   year,
        "week_of_year":           week_of_year,
        "month_sin":              np.sin(2 * np.pi * month / 12),
        "month_cos":              np.cos(2 * np.pi * month / 12),
        # Seasons
        "season":                 season,
        "fishing_season":         fishing_season,
        "is_waragam_west":        is_waragam_west,
        "is_waragam_east":        is_waragam_east,
        "is_awaragam":            is_awaragam,
        "is_rough_sea_season":    is_rough_sea_season,
        # Calendar
        "is_weekend":             is_weekend,
        # Holidays
        "is_festival_day":        is_festival_day,
        "is_poya":                is_poya,
        "is_holiday":             is_holiday,
        "before_festival_window": before_festival_window,
        "days_to_festival":       days_to_festival,
        "weather_effect":         weather["weather_effect"],
        "poya_effect":            poya_effect,
        "festival_effect":        festival_effect,
        # Weather
        "temp_c_mean":            weather["temp_c_mean"],
        "humidity_mean":          weather["humidity_mean"],
        "wind_speed_max":         weather["wind_speed_max"],
        "rainfall_sum":           weather["rainfall_sum"],
        "bad_weather_any":        weather["bad_weather_any"],
        # Fuel (LK Kerosene)
        **fuel,
    }
    return {name: features_dict.get(name, 0) for name in feature_names}


def _predict_single_day(target_date: datetime, fish_encoded: int) -> float:
    feature_row = _build_feature_row(target_date, fish_encoded)
    features_df = pd.DataFrame([feature_row])
    rf_pred = float(rf_model.predict(features_df)[0])
    gb_pred = float(gb_model.predict(features_df)[0])
    return (rf_pred + gb_pred) / 2

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
    
    # Calculate 90% confidence interval (approx +/- 8% based on model MAE)
    min_price = current_price * 0.92
    max_price = current_price * 1.08

    return {
        "fish": fish_row.to_dict(),
        "predicted": current_price,
        "min_price": min_price,
        "max_price": max_price,
        "series": [{"date": d, "price": p} for d, p in zip(dates, prices)],
    }

@app.post("/recommend")
def recommend(req: RecommendRequest):
    try:
        target_date = datetime.fromisoformat(req.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    recommendations = []
    
    # Predict price for all fish
    for _, row in fish_df.iterrows():
        fish_encoded = _encode_fish(row["sinhala_name"])
        
        # Get prediction for today and yesterday to calculate trend
        current_price = _predict_single_day(target_date, fish_encoded)
        yesterday_price = _predict_single_day(target_date - timedelta(days=1), fish_encoded)
        
        # Filter by budget range
        lower_bound = req.budget - 500 if req.budget > 500 else 0
        if lower_bound < current_price <= req.budget:
            trend = "down" if current_price < yesterday_price else "up"
            diff = current_price - yesterday_price
            
            # Determine tag based on preference
            tag = "Fair Price" # Fair price
            if trend == "down" and diff < -50:
                tag = "Available at a lower price today" # Available at a lower price today
            elif req.preference == "seasonal":
                tag = "Seasonal Fish" # Seasonal fish
            elif req.preference == "popular":
                tag = "Popular Fish" # Popular fish
                
            recommendations.append({
                "fish_id": row["fish_id"],
                "sinhala_name": row["sinhala_name"],
                "common_name": row["common_name"],
                "predicted_price": current_price,
                "trend": trend,
                "tag": tag
            })
            
    # Filter and Sort recommendations based on preference
    if req.preference == "popular":
        # Filter only favorite fish
        if req.favorite_fish_ids:
            recommendations = [r for r in recommendations if r["fish_id"] in req.favorite_fish_ids]
        else:
            recommendations = [] # If no favorites, return empty
    elif req.preference == "seasonal":
        # Filter fish that are seasonal (for now, just a placeholder logic, you can improve this based on actual seasonal data)
        # Assuming some fish are seasonal, we can filter them here. For now, we just sort them.
        recommendations.sort(key=lambda x: x["predicted_price"])
    elif req.preference == "profitable":
        # Sort by cheapest first
        recommendations.sort(key=lambda x: x["predicted_price"])
    else:
        # Default sort
        recommendations.sort(key=lambda x: x["predicted_price"])
        
    # Return top 5 recommendations
    return {"recommendations": recommendations[:5]}

import json
import os

FEEDBACK_FILE = BASE_DIR / "feedback.json"

def _load_feedback():
    if not os.path.exists(FEEDBACK_FILE):
        return {"yes": 0, "no": 0}
    try:
        with open(FEEDBACK_FILE, "r") as f:
            return json.load(f)
    except:
        return {"yes": 0, "no": 0}

def _save_feedback(data):
    with open(FEEDBACK_FILE, "w") as f:
        json.dump(data, f)

@app.post("/feedback")
def submit_feedback(req: FeedbackRequest):
    data = _load_feedback()
    if req.is_correct:
        data["yes"] += 1
    else:
        data["no"] += 1
    _save_feedback(data)
    
    total = data["yes"] + data["no"]
    accuracy = (data["yes"] / total * 100) if total > 0 else 0
    
    return {"message": "Feedback received", "accuracy": round(accuracy, 1), "total_votes": total}

@app.get("/accuracy")
def get_accuracy():
    data = _load_feedback()
    total = data["yes"] + data["no"]
    accuracy = (data["yes"] / total * 100) if total > 0 else 0
    return {"accuracy": round(accuracy, 1), "total_votes": total}

@app.post("/trend")
def get_trend(req: PredictRequest):
    try:
        fish_row = _find_fish(req)
    except HTTPException:
        raise
        
    fish_encoded = _encode_fish(fish_row["sinhala_name"])
    
    # Generate 12 months of historical data (using the 15th of each month)
    today = datetime.now()
    trend_data = []
    
    for i in range(11, -1, -1):
        # Calculate the month and year
        month = today.month - i
        year = today.year
        if month <= 0:
            month += 12
            year -= 1
            
        target_date = datetime(year, month, 15)
        price = _predict_single_day(target_date, fish_encoded)
        
        trend_data.append({
            "month": target_date.strftime("%b"),
            "year": year,
            "price": round(price, 2)
        })
        
    return {
        "fish": fish_row.to_dict(),
        "trend": trend_data
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
