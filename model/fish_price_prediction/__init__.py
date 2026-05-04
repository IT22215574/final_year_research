"""
Fish Price Prediction Module
=============================

This module provides comprehensive tools for fish price prediction using machine learning.
It includes training, prediction, and visualization capabilities.

Main Components:
- train: Model training and evaluation
- predict: Price prediction and GUI
- models: Pre-trained models storage
- data: Datasets for training and testing
- assets: Images and visualization outputs

Usage:
    from fish_price_prediction.predict import FishPricePredictor
    
    predictor = FishPricePredictor()
    price = predictor.predict(fish_name="තුනා", date="2024-01-15")
"""

__version__ = "1.0.0"
__author__ = "Research Team"

from pathlib import Path

# Base directory for this module
MODULE_DIR = Path(__file__).parent

# Key directories
TRAIN_DIR = MODULE_DIR / "train"
PREDICT_DIR = MODULE_DIR / "predict"
MODELS_DIR = MODULE_DIR / "models"
DATA_DIR = MODULE_DIR / "data"
ASSETS_DIR = MODULE_DIR / "assets"

__all__ = [
    "MODULE_DIR",
    "TRAIN_DIR",
    "PREDICT_DIR",
    "MODELS_DIR",
    "DATA_DIR",
    "ASSETS_DIR",
]
