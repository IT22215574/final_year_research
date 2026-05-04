"""
Configuration settings for Fish Price Prediction models

This module contains all configuration constants used throughout the application.
"""

from pathlib import Path
from datetime import datetime

# ════════════════════════════════════════════════════════════════
# DIRECTORIES
# ════════════════════════════════════════════════════════════════

MODULE_DIR = Path(__file__).parent
TRAIN_DIR = MODULE_DIR / "train"
PREDICT_DIR = MODULE_DIR / "predict"
MODELS_DIR = MODULE_DIR / "models"
DATA_DIR = MODULE_DIR / "data"
ASSETS_DIR = MODULE_DIR / "assets"

# ════════════════════════════════════════════════════════════════
# MODEL FILES
# ════════════════════════════════════════════════════════════════

# Model paths
RF_MODEL_PATH = MODELS_DIR / "rf_model.pkl"
GB_MODEL_PATH = MODELS_DIR / "gb_model.pkl"
FEATURE_NAMES_PATH = MODELS_DIR / "feature_names.pkl"
LE_SINHALA_PATH = MODELS_DIR / "le_sinhala.pkl"

# ════════════════════════════════════════════════════════════════
# DATA PATHS
# ════════════════════════════════════════════════════════════════

# Dataset paths
FEATURES_DATASET_PATH = DATA_DIR / "features_dataset.csv"
FISH_NAMES_PATH = DATA_DIR / "fish_names.csv"

# ════════════════════════════════════════════════════════════════
# GUI CONFIGURATION
# ════════════════════════════════════════════════════════════════

GUI_TITLE = "Fish Price Predictor"
GUI_GEOMETRY = "900x700"
PREDICTION_DAYS = 30  # Days before and after for trend

# Color scheme
COLOR_PRIMARY = "#2c3e50"
COLOR_SUCCESS = "#27ae60"
COLOR_ERROR = "#e74c3c"
COLOR_WARNING = "#f39c12"
COLOR_INFO = "#3498db"

# ════════════════════════════════════════════════════════════════
# ML MODEL CONFIGURATION
# ════════════════════════════════════════════════════════════════

# Model training parameters
TRAIN_TEST_SPLIT = 0.2
RANDOM_STATE = 42

# Random Forest parameters
RF_PARAMS = {
    "n_estimators": 100,
    "max_depth": 10,
    "min_samples_split": 5,
    "min_samples_leaf": 2,
    "random_state": RANDOM_STATE,
    "n_jobs": -1,
}

# XGBoost parameters
XGB_PARAMS = {
    "n_estimators": 100,
    "max_depth": 6,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "random_state": RANDOM_STATE,
}

# ════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ════════════════════════════════════════════════════════════════

# Time-based features
TIME_FEATURES = [
    "day_of_week",
    "month",
    "year",
    "week_of_year",
    "month_sin",
    "month_cos",
]

# Seasonal features
SEASONAL_FEATURES = [
    "season",
    "is_waragam_west",  # Sri Lankan SW monsoon (May-Sep, West coast)
    "is_waragam_east",  # Sri Lankan NE monsoon (Oct-Jan, East coast)
    "is_awaragam",      # Calm season (Feb-Apr)
    "fishing_season",
    "is_rough_sea_season",
]

# Special day features
SPECIAL_DAY_FEATURES = [
    "is_weekend",
    "is_festival_day",
    "before_festival_window",
    "days_to_festival",
    "poya_effect",
]

# Environmental features
ENVIRONMENTAL_FEATURES = [
    "sst_temp",
    "sst_anomaly",
    "chlorophyll",
    "ocean_current_u",
    "ocean_current_v",
    "weather_effect",
]

# ════════════════════════════════════════════════════════════════
# DATE RANGE
# ════════════════════════════════════════════════════════════════

MIN_DATE_YEAR = 2024
MIN_DATE_MONTH = 1
MIN_DATE_DAY = 1

MAX_DATE_YEAR = 2030
MAX_DATE_MONTH = 12
MAX_DATE_DAY = 31

# ════════════════════════════════════════════════════════════════
# PREDICTION SETTINGS
# ════════════════════════════════════════════════════════════════

# Ensemble method
ENSEMBLE_METHOD = "average"  # "average" or "weighted"
RF_WEIGHT = 0.5
XGB_WEIGHT = 0.5

# Price thresholds
MIN_PRICE = 0
MAX_PRICE = 10000

# ════════════════════════════════════════════════════════════════
# LOGGING
# ════════════════════════════════════════════════════════════════

LOG_LEVEL = "INFO"
LOG_DIR = MODULE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ════════════════════════════════════════════════════════════════
# VALIDATION
# ════════════════════════════════════════════════════════════════

# Model validation metrics
METRICS = ["MAE", "RMSE", "R2", "MAPE"]

# Cross-validation folds
CV_FOLDS = 5
