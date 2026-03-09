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

    # ── Compute dynamic fuel statistics (replaces hardcoded 6/0.351) ─────────
    _fuel_90d_avg      = 180.0   # fallback: historical Sri Lanka kerosene avg
    _fuel_90d_std      = 20.0    # fallback
    _computed_lag_weeks  = 6     # fallback weeks
    _computed_corr       = 0.35  # fallback correlation

    if fuel_df is not None:
        # 90-day rolling stats to classify current price as HIGH/NORMAL/LOW
        recent_prices = fuel_df["lk_price"].dropna().tail(90)
        if len(recent_prices) >= 10:
            _fuel_90d_avg = float(recent_prices.mean())
            _fuel_90d_std = float(recent_prices.std()) if len(recent_prices) > 1 else 20.0

        # Compute optimal lag (in weeks) between fuel % change → fish price % change
        merged_path = DATA_DIR / "final_merged_dataset.csv"
        if merged_path.exists():
            try:
                mg = pd.read_csv(merged_path, parse_dates=["date"]).sort_values("date")
                # Average fish price per date across all species
                if "price" in mg.columns and "lk_price" in mg.columns:
                    daily = mg.groupby("date").agg(
                        fish_price=("price", "mean"),
                        lk_price=("lk_price", "first"),
                    ).dropna()
                    fuel_chg = daily["lk_price"].pct_change().fillna(0)
                    fish_chg = daily["fish_price"].pct_change().fillna(0)
                    best_corr, best_lag_days = 0.0, 42  # default 6 weeks
                    for lag_d in range(7, 57):           # 1–8 week lags
                        shifted = fuel_chg.shift(lag_d)
                        valid = pd.concat([shifted, fish_chg], axis=1).dropna()
                        if len(valid) >= 30:
                            c = float(valid.corr().iloc[0, 1])
                            if abs(c) > abs(best_corr):
                                best_corr = c
                                best_lag_days = lag_d
                    _computed_lag_weeks = max(1, round(best_lag_days / 7))
                    _computed_corr      = round(abs(best_corr), 3)
            except Exception:
                pass  # keep fallbacks

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

    reasons = _build_prediction_reasons(
        target_date, fish_row, current_price,
        prices[14] if len(prices) > 14 else current_price,
        prices[16] if len(prices) > 16 else current_price,
    )

    return {
        "fish": fish_row.to_dict(),
        "predicted": current_price,
        "min_price": min_price,
        "max_price": max_price,
        "series": [{"date": d, "price": p} for d, p in zip(dates, prices)],
        "reasons": reasons,
    }

# ── XAI: build human-readable reasons for a price prediction ─────────────────
def _build_prediction_reasons(
    target_date: datetime,
    fish_row,
    today_price: float,
    yesterday_price: float,
    tomorrow_price: float,
) -> list[dict]:
    """
    Return a list of reason dicts each with:
      { icon, text, impact }   impact: 'up' | 'down' | 'neutral'
    Ordered by relevance (most impactful first).
    """
    reasons: list[dict] = []

    # 1. Price trend vs yesterday
    diff = today_price - yesterday_price
    pct  = (diff / yesterday_price * 100) if yesterday_price else 0
    if abs(pct) >= 1:
        direction = "up" if diff > 0 else "down"
        reasons.append({
            "icon":   "trending-up-outline" if diff > 0 else "trending-down-outline",
            "text":   f"Price {'rose' if diff > 0 else 'dropped'} {abs(pct):.1f}% compared to yesterday",
            "impact": direction,
        })

    # 2. Tomorrow's direction
    t_diff = tomorrow_price - today_price
    if abs(t_diff) >= 5:
        reasons.append({
            "icon":   "arrow-up-circle-outline" if t_diff > 0 else "arrow-down-circle-outline",
            "text":   f"Tomorrow price expected to {'rise' if t_diff > 0 else 'fall'} by {formatLKR_py(abs(t_diff))}",
            "impact": "up" if t_diff > 0 else "down",
        })

    # 3. Fuel price signal
    fuel_row = _get_fuel_row(target_date)
    lk_price = fuel_row.get("lk_price", 0)
    if lk_price > 220:
        reasons.append({
            "icon":   "flame-outline",
            "text":   f"High kerosene price ({formatLKR_py(lk_price)}/L) adds to fishing costs",
            "impact": "up",
        })
    elif lk_price > 0 and lk_price < 170:
        reasons.append({
            "icon":   "flame-outline",
            "text":   f"Low fuel cost ({formatLKR_py(lk_price)}/L) keeps fishing costs down",
            "impact": "down",
        })

    # 4. Weather
    w = _get_weather_row(target_date)
    wind, rain = w["wind_speed_max"], w["rainfall_sum"]
    if wind > 30 or rain > 30:
        reasons.append({
            "icon":   "thunderstorm-outline",
            "text":   "Severe weather expected — reduced fishing activity raises prices",
            "impact": "up",
        })
    elif wind > 20 or rain > 10:
        reasons.append({
            "icon":   "cloudy-outline",
            "text":   f"Above-average wind ({wind:.0f} km/h) / rain ({rain:.0f} mm) may limit supply",
            "impact": "up",
        })
    else:
        reasons.append({
            "icon":   "sunny-outline",
            "text":   "Good weather — fishing conditions are normal",
            "impact": "neutral",
        })

    # 5. Festival / Poya
    boost, event = _high_demand_period(target_date)
    if event:
        reasons.append({
            "icon":   "calendar-outline",
            "text":   f"{event} — high demand period drives prices up",
            "impact": "up",
        })
    elif _is_pre_poya(target_date):
        reasons.append({
            "icon":   "moon-outline",
            "text":   "Day before Poya — buyers stock up early, increasing demand",
            "impact": "up",
        })
    else:
        nearby = _nearby_festival(target_date)
        if nearby:
            reasons.append({
                "icon":   "calendar-outline",
                "text":   f"Upcoming {nearby} — demand likely to rise soon",
                "impact": "up",
            })

    # 6. Season
    season_info = _get_season_info(target_date.month)
    season_impact = season_info.get("season_price_impact", "0%")
    alert = season_info.get("season_alert", "")
    if alert:
        try:
            import re as _re
            _num = float(_re.search(r'[-+]?\d+(?:\.\d+)?', season_impact).group())
        except Exception:
            _num = 0.0
        reasons.append({
            "icon":   "leaf-outline",
            "text":   f"{season_info['current_season']}: {alert}",
            "impact": "up" if "+" in season_impact and _num > 0 else "neutral",
        })

    # 7. Elasticity (demand sensitivity)
    cn = str(fish_row.get("common_name", ""))
    elasticity, e_label = _get_elasticity(cn)
    if abs(elasticity) >= 2.0:
        reasons.append({
            "icon":   "people-outline",
            "text":   f"{cn} has Very High price sensitivity — small price rises cause large demand drops",
            "impact": "neutral",
        })
    elif abs(elasticity) <= 1.0:
        reasons.append({
            "icon":   "people-outline",
            "text":   f"{cn} has Low price sensitivity — demand stays stable even when prices rise",
            "impact": "neutral",
        })

    return reasons[:5]   # cap at 5 most relevant reasons


def formatLKR_py(amount: float) -> str:
    return f"Rs. {round(amount):,}"


@app.post("/recommend")
def recommend(req: RecommendRequest):
    try:
        target_date = datetime.fromisoformat(req.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    month = target_date.month

    # ── Sri Lanka seasonal fish calendar (NARA data) ─────────────────────────
    # Peak months per fish_id based on Sri Lanka fishing seasons:
    #   NE Monsoon (Dec-Feb): Herrings, Sardinella, Anchovies, Needle fish
    #   1st Inter-Monsoon (Mar-May): Tuna species, Sailfish, Barracuda, Trevally
    #   SW Monsoon (May-Sep): Mackerel, Prawns, Crabs, Squid
    #   2nd Inter-Monsoon (Oct-Nov): Tuna returns, Barracuda, Rock fish
    SEASONAL_PEAK_MONTHS: dict[int, list[int]] = {
        2:  [3, 4, 5, 10, 11],        # පරව් (ලොකු) – Trevally (L) – inter-monsoon
        3:  [10, 11, 3, 4],            # ගල්මාළු – Rock fish – inter-monsoon
        4:  [3, 4, 10, 11],            # තලපත් – Sail fish – inter-monsoon
        5:  [3, 4, 5, 9, 10, 11],     # බලයා – Skipjack tuna – inter-monsoon peaks
        6:  [3, 4, 10, 11],            # කෙළවල්ලා – Yellowfin tuna – inter-monsoon
        7:  [11, 12, 1, 2, 3],         # සාලයා – Sardinella – NE monsoon
        8:  [5, 6, 7, 8, 9],           # මෝරා – Sharks – SW monsoon
        9:  [11, 12, 1, 2, 3],         # හුරුල්ලා – Herrings – NE monsoon
        10: [5, 6, 7, 8, 9],           # කුම්බලා – Indian Mackerel – SW monsoon
        11: [12, 1, 2, 3, 4],          # කාරල්ලා – Pony fish – NE/early monsoon
        12: [3, 4, 5, 10, 11],         # කටුවල්ලා – inter-monsoon
        13: [11, 12, 1, 2, 3],         # හාල්මැස්සා – Anchovy – NE monsoon
        14: [4, 5, 6, 7, 8],           # ඉස්සා – Prawns – SW monsoon
        15: [3, 4, 10, 11],            # කොප්පරා – Marlins – inter-monsoon
        16: [3, 4, 9, 10, 11],         # අලගොඩුවා – Frigate tuna – inter-monsoon
        17: [5, 6, 7, 8],              # ඇටවල්ලා – SW monsoon
        18: [10, 11, 12, 1, 2],        # ඇටිස්සා – Red Bream – NE monsoon
        19: [5, 6, 7, 8, 9],           # බෝල්ලා – Big eye scade – SW monsoon
        20: [3, 4, 5, 10, 11],         # ගින්නටි පරව් – inter-monsoon
        21: [12, 1, 2, 11],            # හබරලි – Needle fish – NE monsoon
        22: [11, 12, 1, 2, 3],         # හැඩැල්ලා – Indian Anchovies – NE monsoon
        23: [3, 4, 10, 11],            # ජීලාවා – Barracuda – inter-monsoon
        24: [3, 4, 9, 10, 11],         # ලින්නා – Indian Scad – inter-monsoon
        25: [3, 4, 10, 11],            # ලේන පරව් – Rainbow Runner – inter-monsoon
        26: [5, 6, 7, 8],              # සුද්දා – SW monsoon
        27: [11, 12, 1, 2, 3],         # සූඩයා – White Sardinella – NE monsoon
        28: [4, 5, 6, 7, 8, 9],        # දැල්ලා – Squid/Cuttlefish – SW monsoon
        29: [4, 5, 6, 7, 8],           # කකුළුවා – Sea Crabs – SW monsoon
        30: [1, 2, 3, 10, 11, 12],     # තිලාපියා – year-round, slight peak dry season
        31: [4, 5, 6, 7, 8],           # කකුළුවා(L) – Sea Crabs(L) – SW monsoon
        32: [1, 2, 3, 10, 11, 12],     # තිලාපියා – year-round
    }

    def get_season_name(m: int) -> str:
        """Return a Sinhala season label for the given month number."""
        if m in (12, 1, 2):
            return "ඊශාන් මෝසම"       # NE Monsoon  Dec-Feb
        elif m in (3, 4):
            return "1 වන අන්තර් මෝසම" # 1st Inter-Monsoon  Mar-Apr
        elif m in (5, 6, 7, 8, 9):
            return "නිරිත දිග් මෝසම"  # SW Monsoon  May-Sep
        else:  # 10, 11
            return "2 වන අන්තර් මෝසම" # 2nd Inter-Monsoon  Oct-Nov

    recommendations = []

    for _, row in fish_df.iterrows():
        fish_id  = int(row["fish_id"])
        fish_enc = _encode_fish(row["sinhala_name"])

        current_price   = _predict_single_day(target_date, fish_enc)
        yesterday_price = _predict_single_day(target_date - timedelta(days=1), fish_enc)

        trend = "down" if current_price < yesterday_price else "up"
        diff  = current_price - yesterday_price

        # Budget filter:
        #   budget=99999 → show fish priced > 2000 (Rs.2000+ button from mobile)
        #   otherwise    → lower_bound..budget window as before
        if req.budget >= 99999:
            if current_price <= 2000:
                continue
        else:
            lower_bound = req.budget - 500 if req.budget > 500 else 0
            if not (lower_bound < current_price <= req.budget):
                continue

        is_seasonal_now = month in SEASONAL_PEAK_MONTHS.get(fish_id, [])

        # Assign tag
        if trend == "down" and diff < -50:
            tag = "Available at a lower price today"
        elif is_seasonal_now:
            tag = "Seasonal Fish"
        elif req.preference == "popular":
            tag = "Popular Fish"
        else:
            tag = "Fair Price"

        recommendations.append({
            "fish_id":        fish_id,
            "sinhala_name":   row["sinhala_name"],
            "common_name":    row["common_name"],
            "predicted_price":current_price,
            "trend":          trend,
            "tag":            tag,
            "is_seasonal":    is_seasonal_now,
            "season_name":    get_season_name(month) if is_seasonal_now else None,
        })

    # ── Apply preference filter ───────────────────────────────────────────────
    if req.preference == "seasonal":
        # Only fish that are genuinely in season right now
        recommendations = [r for r in recommendations if r["is_seasonal"]]
        recommendations.sort(key=lambda x: x["predicted_price"])

    elif req.preference == "popular":
        if req.favorite_fish_ids:
            recommendations = [r for r in recommendations if r["fish_id"] in req.favorite_fish_ids]
        else:
            recommendations = []

    elif req.preference == "profitable":
        # Cheapest first (best value in budget)
        recommendations.sort(key=lambda x: x["predicted_price"])

    else:
        recommendations.sort(key=lambda x: x["predicted_price"])

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

# ── /insights endpoint ────────────────────────────────────────────────────────

# ── Demand Sentiment helpers ─────────────────────────────────────────────────

def _high_demand_period(date: datetime) -> tuple[float, str]:
    """Return (demand_boost 0‑0.45, event_name) for known high-demand calendar windows."""
    m, d = date.month, date.day
    # Sinhala New Year  (April 10–20 — single biggest demand spike)
    if m == 4 and 10 <= d <= 20:
        return 0.40, "Sinhala New Year 🎊"
    # Easter / school holiday buffer (April 1–9)
    if m == 4 and 1 <= d <= 9:
        return 0.18, "April Holiday"
    # Christmas week
    if m == 12 and 23 <= d <= 27:
        return 0.28, "Christmas 🎄"
    # New Year countdown
    if (m == 12 and d >= 29) or (m == 1 and d <= 3):
        return 0.22, "New Year 🎆"
    # Vesak (full‑moon May — fishing halts, supply drops → prices up)
    if m == 5 and 13 <= d <= 17:
        return 0.15, "Vesak Full Moon 🪔"
    # Deepavali (October/November)
    if m in (10, 11) and 1 <= d <= 7:
        return 0.14, "Deepavali 🪔"
    return 0.0, ""


def _is_pre_poya(date: datetime) -> bool:
    """True if the next calendar day is a Poya (full‑moon) day per the festivals CSV."""
    if fest_df is not None and not fest_df.empty:
        tomorrow = (date + timedelta(days=1)).date()
        hit = fest_df[fest_df["date"] == tomorrow]
        if not hit.empty and "poya" in str(hit.iloc[0].get("festival_name", "")).lower():
            return True
    return False


def _nearby_festival(date: datetime) -> str:
    """Return festival name if one falls within the next 3 days (per festivals CSV)."""
    if fest_df is None or fest_df.empty:
        return ""
    f_date = date.date()
    window = fest_df[
        (fest_df["date"] >= f_date) &
        (fest_df["date"] <= (date + timedelta(days=3)).date())
    ]
    return str(window.iloc[0].get("festival_name", "")) if not window.empty else ""


def calculate_demand_sentiment(date: datetime, elasticity: float,
                               weather_factor: float = 1.0) -> dict:
    """
    Derive a Demand Sentiment Index (0–1) from proxy variables:
      • Calendar events (festivals / poya)
      • Price elasticity (high sensitivity → more volatile demand)
      • Bad weather  (supply shock pushes apparent demand urgency up)

    Returns a dict with: score, label, color, festival, spike_risk (bool).
    """
    score = 0.50  # neutral base

    # 1. Festival / holiday boost
    boost, event = _high_demand_period(date)
    score += boost

    # 2. Day‑before Poya: buyers stock up early (demand spike)
    if _is_pre_poya(date):
        score += 0.18
        event = event or "Pre‑Poya day"

    # 3. Check festivals CSV for any nearby event not covered above
    if boost == 0:
        nearby = _nearby_festival(date)
        if nearby:
            score += 0.12
            event = nearby

    # 4. Elasticity dampener — high‑sensitivity fish: demand collapses faster at high prices
    #    elasticity is negative; abs value 0.8–3.0
    score -= (max(abs(elasticity) - 0.8, 0)) * 0.04

    # 5. Supply‑side shock: bad weather → reduced supply → urgent buying
    if weather_factor >= 1.08:
        score += 0.12   # severe weather → supply crunch
    elif weather_factor >= 1.03:
        score += 0.06

    score = round(min(max(score, 0.0), 1.0), 3)

    # Label + colour
    if score >= 0.75:
        label, color = "Very High", "#dc2626"
    elif score >= 0.60:
        label, color = "High",      "#f59e0b"
    elif score >= 0.40:
        label, color = "Normal",    "#10b981"
    else:
        label, color = "Low",       "#6b7280"

    # Price‑spike risk: bad weather AND high demand
    spike_risk = weather_factor >= 1.03 and score >= 0.60

    return {
        "score": score,
        "label": label,
        "color": color,
        "festival": event,
        "spike_risk": spike_risk,
    }


# Price-elasticity estimates per fish group (from regression analysis).
# Negative = reduction in demand when price rises.
_ELASTICITY_MAP: dict = {
    "squid": -2.98, "cuttlefish": -2.98, "octopus": -2.98,
    "sardinella": -2.54, "sardine": -2.54, "herrings": -2.10, "herring": -2.10,
    "mackerel": -1.87, "shrimp": -1.75, "prawn": -1.75,
    "trevally": -1.35, "snapper": -1.20, "grouper": -1.15,
    "tuna": -0.95, "yellowfin": -0.92, "seer": -0.88, "swordfish": -0.80,
}

def _get_elasticity(common_name: str) -> tuple[float, str]:
    """Return (elasticity, label) for a fish by common name."""
    cn = (common_name or "").lower()
    for keyword, e in _ELASTICITY_MAP.items():
        if keyword in cn:
            label = "Very High Sensitivity" if e <= -2.5 else "High Sensitivity" if e <= -1.8 else "Medium Sensitivity" if e <= -1.2 else "Low Sensitivity"
            return e, label
    return -1.25, "Medium Sensitivity"

def _get_season_info(month: int) -> dict:
    """Return current Sri Lankan fishing season details."""
    if month in [5, 6, 7, 8, 9]:
        return {
            "current_season": "SW Monsoon (Waragam)",
            "season_en": "SW Monsoon",
            "season_price_impact": "+12%",
            "season_alert": "Rough seas expected — Prices may rise",
        }
    elif month in [10, 11, 12, 1]:
        return {
            "current_season": "NE Monsoon (Waragam)",
            "season_en": "NE Monsoon",
            "season_price_impact": "+8%",
            "season_alert": "Active fishing season — Higher demand",
        }
    elif month in [2, 3, 4]:
        return {
            "current_season": "Inter-Monsoon (Awaragam)",
            "season_en": "Inter-Monsoon",
            "season_price_impact": "+8.5% (Holiday)",
            "season_alert": "Holiday season — Prices may increase",
        }
    return {
        "current_season": "Normal Season",
        "season_en": "Normal",
        "season_price_impact": "0%",
        "season_alert": "",
    }

def _knn_baseline_prices(
    target_dates: list,
    fish_encoded: int,
    k: int = 5,
) -> list:
    """
    For each date in target_dates, find the k most weather-similar historical
    days (by wind_speed_max + rainfall_sum) and return their average
    model-predicted price as the KNN baseline.
    """
    baselines: list = []

    # Build historical lookup: list of (date, wind_speed_max, rainfall_sum)
    hist_rows: list = []
    if weather_hist_agg is not None and not weather_hist_agg.empty:
        for ts, row in weather_hist_agg.iterrows():
            hist_rows.append({
                "date": ts.to_pydatetime(),
                "wind": float(row.get("wind_speed_max", 15) or 15),
                "rain": float(row.get("rainfall_sum", 0) or 0),
            })

    for target_date in target_dates:
        target_weather = _get_weather_row(target_date)
        w_target = target_weather["wind_speed_max"]
        r_target = target_weather["rainfall_sum"]

        if len(hist_rows) >= k:
            # Euclidean distance in (wind, rain) space
            distances = sorted(
                hist_rows,
                key=lambda h: ((h["wind"] - w_target) ** 2 + (h["rain"] - r_target) ** 2) ** 0.5,
            )
            neighbors = distances[:k]
            neighbor_prices = [_predict_single_day(n["date"], fish_encoded) for n in neighbors]
            baselines.append(round(sum(neighbor_prices) / len(neighbor_prices), 2))
        else:
            # Not enough history — fall back to simple model prediction
            baselines.append(round(_predict_single_day(target_date, fish_encoded), 2))

    return baselines


@app.get("/insights")
def get_insights(fish_id: int, date: str = None):
    """
    Returns 7-day ML price predictions, KNN weather-based baseline, and
    market insight metadata for the given fish species.
    """
    matches = fish_df[fish_df["fish_id"] == fish_id]
    if matches.empty:
        raise HTTPException(status_code=404, detail="Fish not found")
    fish_row = matches.iloc[0]

    try:
        center = datetime.fromisoformat(date) if date else datetime.now()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    fish_encoded = _encode_fish(fish_row["sinhala_name"])

    # Next 7 days: today through today+6
    dates_next7 = [center + timedelta(days=i) for i in range(7)]
    labels = [d.strftime("%m/%d") for d in dates_next7]

    prediction_7_days = [round(_predict_single_day(d, fish_encoded), 2) for d in dates_next7]
    knn_baseline = _knn_baseline_prices(dates_next7, fish_encoded)

    # Season & holiday info
    month = center.month
    season_info = _get_season_info(month)

    # Is today/tomorrow a holiday?
    today_only = center.date()
    is_holiday_period = False
    holiday_lift = 8.5  # historical average inter-monsoon holiday lift %
    if not fest_df.empty:
        upcoming = fest_df[
            (fest_df["date"] >= today_only) &
            (fest_df["date"] <= (center + timedelta(days=7)).date())
        ]
        is_holiday_period = not upcoming.empty

    # Fuel lag
    fuel_row = _get_fuel_row(center)
    lk_price = fuel_row.get("lk_price", 0)

    # Elasticity
    elasticity, elasticity_label = _get_elasticity(fish_row.get("common_name", ""))

    # Weather summary for today
    today_weather = _get_weather_row(center)
    wind = today_weather["wind_speed_max"]
    rain = today_weather["rainfall_sum"]
    if wind > 30 or rain > 30:
        weather_label = "Severe weather ⚠️"
        weather_factor = 1.08
    elif wind > 20 or rain > 10:
        weather_label = "Above-average wind / rain"
        weather_factor = 1.03
    else:
        weather_label = "Normal conditions"
        weather_factor = 1.0

    # Demand Sentiment for next 7 days
    demand_7 = []
    has_spike = False
    spike_day = ""
    for i, d in enumerate(dates_next7):
        day_weather = _get_weather_row(d)
        day_wind = day_weather["wind_speed_max"]
        day_rain = day_weather["rainfall_sum"]
        if day_wind > 30 or day_rain > 30:
            day_wf = 1.08
        elif day_wind > 20 or day_rain > 10:
            day_wf = 1.03
        else:
            day_wf = 1.0
        ds = calculate_demand_sentiment(d, elasticity, day_wf)
        demand_7.append({**ds, "date": labels[i]})
        if ds["spike_risk"] and not has_spike:
            has_spike = True
            spike_day = labels[i]

    return {
        "fish": fish_row.to_dict(),
        "labels": labels,
        "prediction_7_days": prediction_7_days,
        "knn_baseline": knn_baseline,
        "demand_sentiment_7_days": demand_7,
        "price_spike_warning": has_spike,
        "price_spike_day": spike_day,
        "data_as_of": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "insights": {
            "fuel_lag_weeks":     _computed_lag_weeks,
            "correlation_score":  _computed_corr,
            "current_lk_price":   round(lk_price, 2),
            "fuel_avg_90d":       round(_fuel_90d_avg, 2),
            "fuel_level":         (
                "HIGH"   if lk_price > _fuel_90d_avg + 0.5 * _fuel_90d_std else
                "LOW"    if lk_price < _fuel_90d_avg - 0.5 * _fuel_90d_std else
                "NORMAL"
            ),
            "current_elasticity": elasticity,
            "elasticity_label":   elasticity_label,
            "holiday_lift":       holiday_lift,
            "is_holiday_period":  is_holiday_period,
            "current_season":     season_info["current_season"],
            "season_price_impact":season_info["season_price_impact"],
            "season_alert":       season_info["season_alert"],
            "weather_factor":     weather_factor,
            "weather_label":      weather_label,
        },
    }


@app.get("/elasticity")
def get_elasticity_chart(fish_id: Optional[int] = None):
    """
    Returns a sorted list of representative fish species with their price-elasticity
    values, used to render the Elasticity Comparison chart in the mobile app.
    An optional fish_id parameter marks the current fish for highlighting.
    """
    # Representative deduplicated categories (sorted most → least sensitive)
    chart_items = [
        {"name": "Squid / Cuttlefish", "elasticity": -2.98},
        {"name": "Sardinella",          "elasticity": -2.54},
        {"name": "Herrings",            "elasticity": -2.10},
        {"name": "Indian Mackerel",     "elasticity": -1.87},
        {"name": "Shrimp / Prawn",      "elasticity": -1.75},
        {"name": "Trevally",            "elasticity": -1.35},
        {"name": "Snapper",             "elasticity": -1.20},
        {"name": "Grouper",             "elasticity": -1.15},
        {"name": "Tuna",                "elasticity": -0.95},
        {"name": "Yellowfin Tuna",      "elasticity": -0.92},
        {"name": "Seer Fish",           "elasticity": -0.88},
        {"name": "Swordfish",           "elasticity": -0.80},
    ]

    highlighted_name: Optional[str] = None
    if fish_id is not None:
        matches = fish_df[fish_df["fish_id"] == fish_id]
        if not matches.empty:
            common = str(matches.iloc[0].get("common_name", "")).lower()
            for item in chart_items:
                # Check each token in the item name
                for token in item["name"].lower().replace(" /", "").split():
                    if token in common or common in token:
                        highlighted_name = item["name"]
                        break
                if highlighted_name:
                    break
            # Fall back: partial match via _get_elasticity
            if not highlighted_name:
                e_val, _ = _get_elasticity(common)
                closest = min(chart_items, key=lambda x: abs(x["elasticity"] - e_val))
                highlighted_name = closest["name"]

    return {"items": chart_items, "highlighted": highlighted_name}


# ── Feature Importance endpoint ──────────────────────────────────────────────
_FEATURE_LABELS: dict[str, dict] = {
    # Fuel / Cost
    "lk_price":            {"label": "Fuel Price (Rs/L)",       "category": "fuel"},
    "lk_price_lag1":       {"label": "Fuel Price (1-wk lag)",   "category": "fuel"},
    "lk_price_lag2":       {"label": "Fuel Price (2-wk lag)",   "category": "fuel"},
    "lk_price_change":     {"label": "Fuel Price Change",       "category": "fuel"},
    "lk_price_pct_change": {"label": "Fuel % Change",           "category": "fuel"},
    "lk_price_rose":       {"label": "Fuel Price Rose",         "category": "fuel"},
    # Weather
    "wind_speed_max":      {"label": "Wind Speed (max)",        "category": "weather"},
    "rainfall_sum":        {"label": "Rainfall (mm)",           "category": "weather"},
    "temp_c_mean":         {"label": "Temperature (°C)",        "category": "weather"},
    "humidity_mean":       {"label": "Humidity (%)",            "category": "weather"},
    "bad_weather_any":     {"label": "Bad Weather Flag",        "category": "weather"},
    "weather_effect":      {"label": "Weather Effect",          "category": "weather"},
    # Demand / Calendar
    "is_festival_day":     {"label": "Festival Day",            "category": "demand"},
    "is_poya":             {"label": "Poya Day",                "category": "demand"},
    "is_holiday":          {"label": "Public Holiday",          "category": "demand"},
    "before_festival_window": {"label": "Pre-Festival Window",  "category": "demand"},
    "days_to_festival":    {"label": "Days to Festival",        "category": "demand"},
    "poya_effect":         {"label": "Poya Effect",             "category": "demand"},
    "festival_effect":     {"label": "Festival Effect",         "category": "demand"},
    # Season / Fishing
    "fishing_season":      {"label": "Fishing Season",          "category": "season"},
    "is_waragam_west":     {"label": "SW Monsoon Season",       "category": "season"},
    "is_waragam_east":     {"label": "NE Monsoon Season",       "category": "season"},
    "is_awaragam":         {"label": "Inter-Monsoon Season",    "category": "season"},
    "is_rough_sea_season": {"label": "Rough Sea Season",        "category": "season"},
    "season":              {"label": "Season (generic)",        "category": "season"},
    # Time
    "month":               {"label": "Month",                   "category": "time"},
    "month_sin":           {"label": "Month (sin)",             "category": "time"},
    "month_cos":           {"label": "Month (cos)",             "category": "time"},
    "week_of_year":        {"label": "Week of Year",            "category": "time"},
    "day_of_week":         {"label": "Day of Week",             "category": "time"},
    "year":                {"label": "Year",                    "category": "time"},
    "is_weekend":          {"label": "Weekend",                 "category": "time"},
    # Fish
    "fish_encoded":        {"label": "Fish Species",            "category": "fish"},
}
_CATEGORY_COLORS: dict[str, str] = {
    "fuel":    "#f59e0b",
    "weather": "#3b82f6",
    "demand":  "#8b5cf6",
    "season":  "#10b981",
    "time":    "#6b7280",
    "fish":    "#ec4899",
}

@app.get("/feature-importance")
def get_feature_importance():
    """
    Return the feature importance scores extracted directly from the trained
    Random Forest (rf_model) and Gradient Boosting (gb_model) models.
    Each feature is mapped to a human-readable label and colour-coded category.
    Returns top-15 features sorted by RF importance descending.
    """
    rf_imp  = list(rf_model.feature_importances_)
    gb_imp  = list(gb_model.feature_importances_)
    names   = list(feature_names)

    combined = []
    for i, name in enumerate(names):
        rf_val = float(rf_imp[i]) if i < len(rf_imp) else 0.0
        gb_val = float(gb_imp[i]) if i < len(gb_imp) else 0.0
        meta   = _FEATURE_LABELS.get(name, {"label": name.replace("_", " ").title(), "category": "time"})
        combined.append({
            "feature":  name,
            "label":    meta["label"],
            "category": meta["category"],
            "color":    _CATEGORY_COLORS.get(meta["category"], "#6b7280"),
            "rf":       round(rf_val * 100, 2),   # percentage
            "gb":       round(gb_val * 100, 2),
            "avg":      round((rf_val + gb_val) / 2 * 100, 2),
        })

    # Sort by RF importance descending, take top 15
    combined.sort(key=lambda x: x["rf"], reverse=True)
    top = combined[:15]

    # Category summary (sum of RF importance per category)
    cat_summary: dict[str, float] = {}
    for item in combined:
        cat_summary[item["category"]] = round(
            cat_summary.get(item["category"], 0.0) + item["rf"], 2
        )
    cat_list = sorted(
        [{"category": k, "color": _CATEGORY_COLORS.get(k, "#6b7280"),
          "total_rf": v} for k, v in cat_summary.items()],
        key=lambda x: x["total_rf"], reverse=True,
    )
    return {"features": top, "category_summary": cat_list}


# ── Market Alerts endpoint ───────────────────────────────────────────────────
@app.get("/alerts")
def get_market_alerts(date: Optional[str] = None):
    """
    Generate real-time market alerts based on:
      - Weather forecast (wind / rain severity)
      - Fuel price level
      - Festival & Poya calendar
      - Sri Lanka fishing season
      - Price spike risk from demand sentiment
    Returns: { alerts: [ {type, icon, color, title, description, age} ] }
    """
    today = datetime.fromisoformat(date) if date else datetime.now()
    alerts: list[dict] = []

    # ── 1. Weather check for today & next 2 days ─────────────────────────────
    for offset in range(3):
        check_date = today + timedelta(days=offset)
        w = _get_weather_row(check_date)
        wind = w["wind_speed_max"]
        rain = w["rainfall_sum"]
        label = "Today" if offset == 0 else "Tomorrow" if offset == 1 else f"In {offset} days"
        if wind > 35 or rain > 40:
            alerts.append({
                "type":        "danger",
                "icon":        "thunderstorm-outline",
                "color":       "#ef4444",
                "title":       f"Storm Warning — {label}",
                "description": f"Wind {wind:.0f} km/h, Rain {rain:.0f} mm — Fishing boats may stay ashore",
                "age":         label,
            })
        elif wind > 22 or rain > 15:
            alerts.append({
                "type":        "warning",
                "icon":        "cloudy-outline",
                "color":       "#f59e0b",
                "title":       f"Rough Weather — {label}",
                "description": f"Wind {wind:.0f} km/h, Rain {rain:.0f} mm — Supply may be reduced",
                "age":         label,
            })

    # ── 2. Fuel price alert ───────────────────────────────────────────────────
    fuel = _get_fuel_row(today)
    lk   = fuel.get("lk_price", 0)
    chg  = fuel.get("lk_price_pct_change", 0)
    if lk > 220:
        alerts.append({
            "type":        "warning",
            "icon":        "flame-outline",
            "color":       "#f59e0b",
            "title":       f"High Kerosene Price — Rs. {lk:.0f}/L",
            "description": "Elevated fuel cost raises fishing overheads — expect prices to rise within 2–3 weeks",
            "age":         "Today",
        })
    elif chg > 5:
        alerts.append({
            "type":        "warning",
            "icon":        "flame-outline",
            "color":       "#f59e0b",
            "title":       f"Fuel Price Rose {chg:.1f}% This Week",
            "description": "Recent kerosene price hike may push fish prices up in coming weeks",
            "age":         "This week",
        })
    elif lk > 0 and lk < 160:
        alerts.append({
            "type":        "success",
            "icon":        "checkmark-circle-outline",
            "color":       "#10b981",
            "title":       f"Low Fuel Cost — Rs. {lk:.0f}/L",
            "description": "Cheap kerosene keeps fishing overhead low — stable prices expected",
            "age":         "Today",
        })

    # ── 3. Festival / Poya alerts ────────────────────────────────────────────
    boost, event = _high_demand_period(today)
    if event:
        alerts.append({
            "type":        "info",
            "icon":        "calendar-outline",
            "color":       "#8b5cf6",
            "title":       f"High Demand Period: {event}",
            "description": f"Festival window — demand up ~{int(boost * 100)}%. Prices expected to be elevated",
            "age":         "Today",
        })
    elif _is_pre_poya(today):
        alerts.append({
            "type":        "info",
            "icon":        "moon-outline",
            "color":       "#6366f1",
            "title":       "Poya Day Tomorrow",
            "description": "Buyers are stocking up early — expect a short demand surge today",
            "age":         "Today",
        })
    else:
        nearby = _nearby_festival(today)
        if nearby:
            alerts.append({
                "type":        "info",
                "icon":        "calendar-outline",
                "color":       "#3b82f6",
                "title":       f"Upcoming Festival: {nearby}",
                "description": "Demand likely to rise as the festival approaches",
                "age":         "Next 3 days",
            })

    # ── 4. Seasonal alert ────────────────────────────────────────────────────
    season = _get_season_info(today.month)
    alert_text = season.get("season_alert", "")
    if alert_text:
        impact = season.get("season_price_impact", "")
        alerts.append({
            "type":        "info",
            "icon":        "leaf-outline",
            "color":       "#0ea5e9",
            "title":       season["current_season"],
            "description": f"{alert_text} ({impact} price impact)",
            "age":         f"Month {today.month}",
        })

    # ── 5. Demand spike risk (via representative elasticity + weather) ────────
    try:
        w0 = _get_weather_row(today)
        wf = 1.0 + (0.05 if w0["wind_speed_max"] > 20 else 0) + (0.05 if w0["rainfall_sum"] > 10 else 0)
        sentiment = calculate_demand_sentiment(today, -1.5, wf)
        if sentiment.get("spike_risk"):
            day = sentiment.get("festival", "upcoming event")
            alerts.append({
                "type":        "warning",
                "icon":        "trending-up-outline",
                "color":       "#ef4444",
                "title":       "Price Spike Risk Detected",
                "description": f"Combined weather + calendar signals suggest a price spike around {day}",
                "age":         "Forecast",
            })
        elif sentiment.get("score", 0.5) >= 0.7:
            alerts.append({
                "type":        "warning",
                "icon":        "arrow-up-circle-outline",
                "color":       "#f59e0b",
                "title":       "Above-Normal Demand Expected",
                "description": "Demand sentiment score is elevated — prices may drift higher this week",
                "age":         "This week",
            })
    except Exception:
        pass

    # Deduplicate by title (keep first occurrence), cap at 6
    seen: set[str] = set()
    unique: list[dict] = []
    for a in alerts:
        if a["title"] not in seen:
            seen.add(a["title"])
            unique.append(a)
        if len(unique) >= 6:
            break

    # Always return at least one informational alert when things are calm
    if not unique:
        unique.append({
            "type":        "success",
            "icon":        "checkmark-circle-outline",
            "color":       "#10b981",
            "title":       "Market Conditions Normal",
            "description": "No significant weather, fuel, or demand signals detected today",
            "age":         "Today",
        })

    return {"alerts": unique}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
