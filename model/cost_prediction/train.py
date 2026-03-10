import pandas as pd
import numpy as np
import os
import joblib
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# =========================================
# Configuration
# =========================================
RANDOM_STATE = 42
MODEL_DIR = "models"
DATA_FILE = "trips_export.csv"

# Create models directory if not exists
os.makedirs(MODEL_DIR, exist_ok=True)

# =========================================
# Load Dataset
# =========================================
print("Loading dataset...")
df = pd.read_csv(DATA_FILE)

print("Dataset Shape:", df.shape)
print()

# =========================================
# ================= FUEL MODEL =================
# =========================================

print("Training Fuel Model...")

fuel_features = [
    'distanceKm',
    'engineHorsePower',
    'windSpeed',
    'waveHeight',
    'tripDurationHours'
]

X_fuel = df[fuel_features]
y_fuel = df['fuelUsedLiters']

X_train_f, X_test_f, y_train_f, y_test_f = train_test_split(
    X_fuel, y_fuel,
    test_size=0.2,
    random_state=RANDOM_STATE
)

fuel_model = RandomForestRegressor(
    n_estimators=200,
    random_state=RANDOM_STATE
)

fuel_model.fit(X_train_f, y_train_f)

fuel_pred = fuel_model.predict(X_test_f)

# Evaluation
fuel_r2 = r2_score(y_test_f, fuel_pred)
fuel_mae = mean_absolute_error(y_test_f, fuel_pred)
fuel_rmse = np.sqrt(mean_squared_error(y_test_f, fuel_pred))

print("----- Fuel Model Performance -----")
print("R2 Score :", round(fuel_r2, 4))
print("MAE      :", round(fuel_mae, 4))
print("RMSE     :", round(fuel_rmse, 4))
print()

# Save Model
fuel_model_path = os.path.join(MODEL_DIR, "fuel_model.pkl")
joblib.dump(fuel_model, fuel_model_path)

# Feature Importance Plot
plt.figure()
plt.bar(fuel_features, fuel_model.feature_importances_)
plt.title("Fuel Model Feature Importance")
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig(os.path.join(MODEL_DIR, "fuel_feature_importance.png"))
plt.close()


# =========================================
# ================= COST MODEL =================
# =========================================

print("Training Cost Model...")

cost_features = [
    'distanceKm',
    'engineHorsePower',
    'windSpeed',
    'waveHeight',
    'tripDurationHours',
    'fuelPricePerLiter'
]

X_cost = df[cost_features]
y_cost = df['totalCost']

X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
    X_cost, y_cost,
    test_size=0.2,
    random_state=RANDOM_STATE
)

cost_model = RandomForestRegressor(
    n_estimators=200,
    random_state=RANDOM_STATE
)

cost_model.fit(X_train_c, y_train_c)

cost_pred = cost_model.predict(X_test_c)

# Evaluation
cost_r2 = r2_score(y_test_c, cost_pred)
cost_mae = mean_absolute_error(y_test_c, cost_pred)
cost_rmse = np.sqrt(mean_squared_error(y_test_c, cost_pred))

print("----- Cost Model Performance -----")
print("R2 Score :", round(cost_r2, 4))
print("MAE      :", round(cost_mae, 4))
print("RMSE     :", round(cost_rmse, 4))
print()

# Save Model
cost_model_path = os.path.join(MODEL_DIR, "cost_model.pkl")
joblib.dump(cost_model, cost_model_path)

# Feature Importance Plot
plt.figure()
plt.bar(cost_features, cost_model.feature_importances_)
plt.title("Cost Model Feature Importance")
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig(os.path.join(MODEL_DIR, "cost_feature_importance.png"))
plt.close()

print("=================================")
print("✅ Models trained & saved successfully")
print("=================================")