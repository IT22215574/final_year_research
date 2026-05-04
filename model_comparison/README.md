# Fish Zone Prediction - Model Comparison Suite

This directory contains the model comparison setup for fish zone prediction using oceanographic data.

## Contents

### Trained Models
- `xgboost_fish_zone_model.pkl` - XGBoost classifier (new model)
- `rf_fish_zone_model.pkl` - Random Forest classifier (available in parent directory)

### Training Scripts
- `train_xgboost_model.py` - Training script for XGBoost model
- `train_random_forest.py` - Training script for Random Forest model

### Supporting Files
- `final_dataset_with_bathymetry.csv` - Preprocessed oceanographic dataset (38,008 samples)
- `land_mask.py` - Utility for filtering land-based predictions

### Reports & Metrics
- `MODEL_COMPARISON_REPORT.md` - Comprehensive comparison report
- `xgboost_model_metrics.json` - XGBoost model metrics (JSON format)
- `xgboost_classification_report.txt` - Scikit-learn classification report for XGBoost

## Quick Start

### Install Dependencies
```bash
pip install pandas scikit-learn xgboost joblib
brew install libomp  # macOS only, required for XGBoost
```

### Train XGBoost Model
```bash
python train_xgboost_model.py
```

### Train Random Forest Model
```bash
python train_random_forest.py
```

### Use Pre-trained Models

```python
import joblib
import pandas as pd

# Load model
artifact = joblib.load('xgboost_fish_zone_model.pkl')
pipeline = artifact['pipeline']
features = artifact['feature_columns']

# Prepare data
df = pd.read_csv('final_dataset_with_bathymetry.csv')
X = df[features]

# Make predictions
predictions = pipeline.predict(X)
probabilities = pipeline.predict_proba(X)
```

## Dataset

**File**: `final_dataset_with_bathymetry.csv`

**Features** (7):
- `lat` - Latitude
- `lon` - Longitude
- `sst` - Sea Surface Temperature
- `chlor_a` - Chlorophyll-a concentration
- `water_u` - Ocean current (u-component)
- `water_v` - Ocean current (v-component)
- `depth` - Bathymetry (water depth)

**Target**: `fish_presence` (binary: 0 = no fish, 1 = fish present)

**Size**: 38,008 samples
**Split**: 80% train (30,406), 20% test (7,602)

## Model Performance Summary

Both models achieve >99.9% accuracy:

| Model | Accuracy | Precision | Recall | F1-Score |
|-------|----------|-----------|--------|----------|
| Random Forest | 0.9991 | 1.0000 | 0.9949 | 0.9975 |
| XGBoost | 0.9992 | 1.0000 | 0.9957 | 0.9978 |

**Recommendation**: Random Forest (better recall, faster, simpler)

## Configuration

### XGBoost Hyperparameters
```python
n_estimators=300
max_depth=6
learning_rate=0.1
subsample=0.8
colsample_bytree=0.8
min_child_weight=1
```

### Random Forest Hyperparameters
```python
n_estimators=300
max_depth=None
min_samples_split=2
min_samples_leaf=1
class_weight='balanced'
```

## Reproducing Results

### Train Both Models
```bash
python train_random_forest.py
python train_xgboost_model.py
```

### View Results
```bash
# XGBoost metrics
cat xgboost_model_metrics.json

# XGBoost classification report
cat xgboost_classification_report.txt

# Full comparison
cat MODEL_COMPARISON_REPORT.md
```

## Integration with Backend

To use these models in the backend:

1. Copy the `.pkl` files to your backend model directory
2. Update the model loading code to use the desired model
3. Both models use the same feature columns and format

## Troubleshooting

**Issue**: XGBoost import fails on macOS  
**Solution**: Install libomp with `brew install libomp`

**Issue**: Missing columns error  
**Solution**: Ensure dataset has all required columns: lat, lon, sst, chlor_a, water_u, water_v, depth

**Issue**: Different results than expected  
**Solution**: Check that `random_state=42` is used for reproducibility

## Further Improvements

Potential enhancements:
- Hyperparameter tuning using GridSearch/RandomSearch
- Feature importance analysis
- Cross-validation evaluation
- Ensemble methods combining RF + XGBoost
- Neural network baseline (MLP classifier)

---

**Last Updated**: 2026-05-05
