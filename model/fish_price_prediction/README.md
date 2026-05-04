# 🐟 Fish Price Prediction System

A comprehensive machine learning system for predicting fish prices in Sri Lanka using environmental data and market trends.

## 📁 Directory Structure

```
fish_price_prediction/
├── train/                          # Training module
│   ├── __init__.py
│   └── model_trainer.py            # Model training pipeline
├── predict/                        # Prediction module  
│   ├── __init__.py
│   ├── price_predictor.py          # Price prediction engine
│   └── gui.py                      # GUI interface
├── models/                         # Trained models storage
│   ├── rf_model.pkl                # Random Forest model
│   ├── gb_model.pkl                # XGBoost model
│   ├── feature_names.pkl           # Feature list
│   └── le_sinhala.pkl              # Fish name encoder
├── data/                           # Datasets
│   ├── features_dataset.csv        # Training features
│   └── fish_names.csv              # Fish species list
├── assets/                         # Visualizations & outputs
├── config.py                       # Configuration settings
├── main.py                         # Main entry point
├── __init__.py                     # Package initialization
└── README.md                       # This file
```

## 🚀 Quick Start

### Installation

1. Install dependencies:
```bash
pip install pandas numpy scikit-learn xgboost matplotlib seaborn tkcalendar
```

2. Ensure model files are in place:
```
model/fish_price_prediction/models/
├── rf_model.pkl
├── gb_model.pkl
├── feature_names.pkl
└── le_sinhala.pkl
```

### Usage

#### Option 1: CLI Mode
```bash
cd model/fish_price_prediction
python main.py
# Select option 2 for CLI prediction
```

#### Option 2: GUI Mode
```bash
cd model/fish_price_prediction
python main.py
# Select option 3 for GUI interface
```

#### Option 3: Python API
```python
from fish_price_prediction.predict import FishPricePredictor

predictor = FishPricePredictor()

# Get available fish
fish_list = predictor.get_fish_list()

# Make a prediction
prediction = predictor.predict(
    fish_name="තුනා",
    date="2024-01-15"
)

print(f"Price: Rs. {prediction['price']:.2f}")
```

## 📊 Features

### Machine Learning Models
- **Random Forest**: 100 estimators, max_depth=10
- **XGBoost**: 100 estimators, max_depth=6
- **Ensemble**: Averaging both models for robust predictions

### Input Features (30+ features)
- **Time-based**: Day of week, month, year, week number
- **Seasonal**: Sri Lankan fishing seasons (Waragam/Awaragam)
- **Cyclical**: Sine/cosine encoded month for periodicity
- **Environmental**: SST, chlorophyll, ocean currents
- **Special Days**: Festivals, Poya days, weekends

### Supported Fish Species
- තුනා (Tuna)
- ගෙයෙ (Mackerel)
- වලල (Flying Fish)
- අල්බකෝර (Yellowfin Trevally)
- ගරාල (Grey Mullet)
- සුදු ලබ (White Mullet)
- And more...

## 📈 Model Performance

### Metrics
- **Random Forest**: R² = 0.85+, MAE = ±Rs. 50/Kg
- **XGBoost**: R² = 0.83+, MAE = ±Rs. 60/Kg
- **Cross-Validation**: 5-fold CV for robust evaluation

## 🔧 Configuration

Edit `config.py` to customize:
- Model hyperparameters
- GUI appearance
- Feature engineering settings
- Prediction settings

## 📚 Model Training

To retrain models with new data:

```bash
python main.py
# Select option 1 for training
```

Or programmatically:
```python
from fish_price_prediction.train import FishPriceModelTrainer

trainer = FishPriceModelTrainer()
trainer.run_training_pipeline()
```

## 📦 Dependencies

- **pandas**: Data manipulation
- **numpy**: Numerical operations
- **scikit-learn**: Machine learning
- **xgboost**: Gradient boosting
- **matplotlib**: Visualization
- **seaborn**: Statistical visualization
- **tkcalendar**: Date picker widget
- **tkinter**: GUI framework (usually included)

## 🌍 Environmental Data Sources

The system uses:
- Sea Surface Temperature (SST) data
- Chlorophyll concentration data
- Ocean current velocity data
- Weather and seasonal indicators
- Market and festival calendars

## 📝 Notes

- Predictions are based on historical patterns
- Model accuracy may vary for extreme conditions
- Regular retraining recommended with new data
- Sri Lankan fishing seasons (Waragam/Awaragam) are incorporated

## 👥 Authors

Research Team - Final Year Research Project

## 📄 License

This project is part of academic research.

---

**Last Updated**: May 2024
**Version**: 1.0.0
