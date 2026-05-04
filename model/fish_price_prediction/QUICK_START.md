# 🐟 Fish Price Prediction - Quick Reference Guide

## 📍 Main Location
```
model/fish_price_prediction/
```

## 🗂️ Folder Structure

```
fish_price_prediction/
│
├── 📦 train/
│   ├── __init__.py
│   └── model_trainer.py          ← Model training pipeline
│
├── 🎯 predict/
│   ├── __init__.py
│   ├── price_predictor.py        ← Prediction engine
│   └── gui.py                    ← GUI interface
│
├── 🤖 models/
│   ├── rf_model.pkl              ← Random Forest trained model
│   ├── gb_model.pkl              ← XGBoost trained model
│   ├── feature_names.pkl         ← Feature list
│   └── le_sinhala.pkl            ← Fish name encoder
│
├── 📊 data/
│   ├── features_dataset.csv      ← Training dataset
│   └── fish_names.csv            ← Fish species database
│
├── 🖼️ assets/
│   └── [Visualizations & outputs]
│
├── ⚙️ config.py                  ← Configuration settings
├── 🚀 main.py                    ← Main entry point
├── 📖 README.md                  ← Full documentation
└── 📋 __init__.py                ← Package initialization
```

## 🎯 Quick Commands

### 1️⃣ Start GUI Predictor
```bash
cd model/fish_price_prediction
python main.py
# Select option 3
```

### 2️⃣ CLI Prediction
```bash
python main.py
# Select option 2
```

### 3️⃣ Train Models
```bash
python main.py
# Select option 1
```

### 4️⃣ Python API Usage
```python
from model.fish_price_prediction.predict import FishPricePredictor

predictor = FishPricePredictor()
price_data = predictor.predict("තුනා", "2024-01-15")
print(f"Price: Rs. {price_data['price']:.2f}")
```

## 📚 Key Classes

### `FishPricePredictor`
Main prediction engine
```python
predictor = FishPricePredictor()
predictor.predict(fish_name, date)           # Single prediction
predictor.predict_range(fish_name, date)     # Range of dates
predictor.get_fish_list()                     # Available species
```

### `FishPriceModelTrainer`
Model training pipeline
```python
trainer = FishPriceModelTrainer()
trainer.run_training_pipeline()               # Full pipeline
trainer.load_features_dataset()               # Load data
trainer.train_models(X, y)                    # Train models
trainer.save_models()                         # Save models
```

### `FishPricePredictorGUI`
Interactive GUI interface
```python
root = tk.Tk()
app = FishPricePredictorGUI(root)
root.mainloop()
```

## 🎯 Supported Fish Species

All fish are stored in `data/fish_names.csv`:

| Sinhala Name | English Name | Status |
|---|---|---|
| තුනා | Tuna | ✅ |
| ගෙයෙ | Mackerel | ✅ |
| වලල | Flying Fish | ✅ |
| අල්බකෝර | Yellowfin Trevally | ✅ |
| ගරාල | Grey Mullet | ✅ |
| සුදු ලබ | White Mullet | ✅ |

## 🔧 Configuration

Edit `config.py` to change:
- Model parameters
- GUI colors and dimensions
- Feature engineering settings
- Prediction ensemble weights

## 📊 Model Details

| Component | Type | Details |
|---|---|---|
| **Primary Model 1** | Random Forest | 100 trees, depth=10 |
| **Primary Model 2** | XGBoost | 100 trees, depth=6 |
| **Ensemble** | Averaging | Equal weights (0.5 each) |
| **Features** | 30+ | Time, seasonal, environmental |
| **Accuracy** | R² | 0.85+ on test data |

## 📈 Features Used

### Time-based (5)
- day_of_week, month, year, week_of_year, day

### Seasonal (7)
- season, is_waragam_west, is_waragam_east
- is_awaragam, fishing_season, is_rough_sea_season
- month_sin, month_cos

### Special (5)
- is_weekend, is_festival_day, poya_effect
- festival_effect, days_to_festival

### Environmental (5+)
- sst_temp, sst_anomaly, chlorophyll
- ocean_current_u, ocean_current_v, weather_effect

### Fish (1)
- fish_encoded (from LabelEncoder)

## 🚀 Getting Started

### Step 1: Check Prerequisites
```bash
cd model/fish_price_prediction
python -c "from predict import FishPricePredictor; p = FishPricePredictor(); print('✅ Ready!')"
```

### Step 2: Make Your First Prediction
```bash
python main.py
# Choose option 2 (CLI) or 3 (GUI)
```

### Step 3: Explore Results
- View price trends over 30 days
- Compare different fish species
- Export data if needed

## 💡 Tips

1. **Data**: Ensure data files exist in `data/` folder
2. **Models**: Pre-trained models in `models/` folder
3. **Trends**: GUI shows 15 days before and after selected date
4. **Accuracy**: Better predictions with recent data
5. **Extensions**: Easy to add new fish species

## 🔗 Related Files in Project

```
model/
├── dataset/              ← Data sources
├── fish_price_prediction/  ← THIS MODULE ✨
├── market_analysis.ipynb   ← Analysis notebook
├── PricePredict.py        ← Original GUI (replaced)
└── model_train.py         ← Original trainer (replaced)
```

## ✅ Checklist Before Using

- [ ] Model files exist in `models/` folder
- [ ] Data files exist in `data/` folder
- [ ] Dependencies installed: `pip install pandas numpy scikit-learn xgboost matplotlib seaborn tkcalendar`
- [ ] Python 3.7+

## 📞 Troubleshooting

| Issue | Solution |
|---|---|
| Models not found | Ensure files in `fish_price_prediction/models/` |
| Data not found | Ensure CSV files in `fish_price_prediction/data/` |
| GUI not opening | Install tkinter: `pip install tk` |
| Import errors | Check PYTHONPATH includes project root |

## 📝 Notes

- Predictions based on historical patterns
- Model accuracy: ±Rs. 50-60 per kg
- Seasonal variations incorporated
- Sri Lankan fishing calendar considered
- Regular retraining recommended

---

**Module Version**: 1.0.0  
**Last Updated**: May 2024  
**Status**: ✅ Production Ready
