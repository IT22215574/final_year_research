#!/usr/bin/env python3
"""
Retrain fuel model with realistic Sri Lankan boat data
"""

import os
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "trip_cost_dataset_realistic_srilanka.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "fuel_model.pkl")
BACKUP_PATH = os.path.join(BASE_DIR, "models", "fuel_model_OLD_UNREALISTIC.pkl")

print("🔧 Retraining fuel model with realistic Sri Lankan boat data...")
print(f"📁 Data: {DATA_PATH}")
print(f"💾 Model: {MODEL_PATH}")

# Backup old model
if os.path.exists(MODEL_PATH):
    import shutil
    shutil.copy(MODEL_PATH, BACKUP_PATH)
    print(f"📦 Backed up old model to: fuel_model_OLD_UNREALISTIC.pkl")

# Load realistic data
df = pd.read_csv(DATA_PATH)
print(f"\n📊 Loaded {len(df)} training samples")

# Features and target
X = df[["distanceKm", "speed", "engineHP", "fishingHours", "weatherSeverityIndex"]]
y = df["fuelUsedLiters"]

print(f"\nFeatures: {list(X.columns)}")
print(f"Target: fuelUsedLiters")
print(f"  Min: {y.min():.1f} L")
print(f"  Max: {y.max():.1f} L")
print(f"  Mean: {y.mean():.1f} L")
print(f"  Median: {y.median():.1f} L")

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"\nTrain: {len(X_train)} samples")
print(f"Test: {len(X_test)} samples")

# Train model
model = RandomForestRegressor(
    n_estimators=300,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    n_jobs=-1,
    random_state=42
)

print("\n🚀 Training model...")
model.fit(X_train, y_train)

# Evaluate
pred_train = model.predict(X_train)
pred_test = model.predict(X_test)

train_r2 = r2_score(y_train, pred_train)
test_r2 = r2_score(y_test, pred_test)
train_mae = mean_absolute_error(y_train, pred_train)
test_mae = mean_absolute_error(y_test, pred_test)
train_rmse = np.sqrt(mean_squared_error(y_train, pred_train))
test_rmse = np.sqrt(mean_squared_error(y_test, pred_test))

print(f"\n📈 TRAINING METRICS:")
print(f"  R²: {train_r2:.4f}")
print(f"  MAE: {train_mae:.2f} L")
print(f"  RMSE: {train_rmse:.2f} L")

print(f"\n📊 TEST METRICS:")
print(f"  R²: {test_r2:.4f}")
print(f"  MAE: {test_mae:.2f} L")
print(f"  RMSE: {test_rmse:.2f} L")

# Test on 45 HP, 35 km scenario
print(f"\n✅ TEST: 45 HP boat, 35 km trip")
test_scenarios = [
    {"distanceKm": 35, "speed": 12, "engineHP": 45, "fishingHours": 3, "weatherSeverityIndex": 0.1},
    {"distanceKm": 35, "speed": 12, "engineHP": 45, "fishingHours": 5, "weatherSeverityIndex": 0.1},
    {"distanceKm": 35, "speed": 12, "engineHP": 45, "fishingHours": 8, "weatherSeverityIndex": 0.2},
]

for scenario in test_scenarios:
    X_test_scenario = pd.DataFrame([scenario])
    pred = model.predict(X_test_scenario)[0]
    fishing_hrs = scenario["fishingHours"]
    weather = scenario["weatherSeverityIndex"]
    print(f"  {fishing_hrs}h fishing, WSI={weather}: {pred:.1f} L")

# Feature importance
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print(f"\n🎯 FEATURE IMPORTANCE:")
for _, row in feature_importance.iterrows():
    print(f"  {row['feature']}: {row['importance']:.4f}")

# Save model
joblib.dump(model, MODEL_PATH)
print(f"\n💾 Model saved to: {MODEL_PATH}")
print(f"✅ Model features: {model.n_features_in_}")
print("\n🎉 Retraining complete! Restart your ML service to use the new model.")
