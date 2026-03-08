import os
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "trip_cost_dataset_fuel5_train.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "fuel_model.pkl")

df = pd.read_csv(DATA_PATH)

# ✅ exactly the 5 features that your FastAPI uses
X = df[["distanceKm", "speed", "engineHP", "fishingHours", "weatherSeverityIndex"]]
y = df["fuelUsedLiters"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestRegressor(
    n_estimators=250,
    max_depth=12,
    n_jobs=-1,
    random_state=42
)

model.fit(X_train, y_train)

pred = model.predict(X_test)
print("Fuel R2:", r2_score(y_test, pred))
print("Fuel MAE:", mean_absolute_error(y_test, pred))
print("n_features_in_:", model.n_features_in_)

joblib.dump(model, MODEL_PATH)
print("✅ Saved:", MODEL_PATH)