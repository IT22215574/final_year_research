import os
import pandas as pd
import pickle
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from datetime import datetime

# --- Paths ---
BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "dataset", "fish_prices.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model", "model.pkl")

# --- Step 1: Load data ---
if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"❌ Dataset not found: {DATA_PATH}")

df = pd.read_csv(DATA_PATH, parse_dates=["Date"], dayfirst=True)

# --- Step 2: Basic cleaning ---
df = df.dropna(subset=["Price_LKR_per_kg"])
df["FishType_id"] = df["FishType"].astype("category").cat.codes
df["Market_id"] = df["Market"].astype("category").cat.codes

# Convert season text to numeric categories
df["Season_id"] = df["Season"].astype("category").cat.codes

# --- Step 3: Feature engineering ---
df["WeekNumber"] = df["Date"].dt.isocalendar().week
df = df.sort_values("Date")

# Add previous week price (Lag feature)
df["PrevPrice"] = df["Price_LKR_per_kg"].shift(1).fillna(df["Price_LKR_per_kg"].mean())

# --- Step 4: Feature/Target split ---
features = ["FishType_id", "Market_id", "Temp_C", "Rainfall_mm",
            "FuelPrice_LKR", "DemandIndex", "Season_id", "PrevPrice"]

X = df[features]
y = df["Price_LKR_per_kg"]

# --- Step 5: Train/test split ---
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

# --- Step 6: Train model ---
model = RandomForestRegressor(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# --- Step 7: Evaluate ---
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
print(f"✅ Model trained successfully | MAE: {mae:.2f}")

# --- Step 8: Save model & mappings ---
mappings = {
    "fishtypes": list(df["FishType"].astype("category").cat.categories),
    "markets": list(df["Market"].astype("category").cat.categories),
    "seasons": list(df["Season"].astype("category").cat.categories)
}

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
pickle.dump({"model": model, "mappings": mappings}, open(MODEL_PATH, "wb"))
print(f"💾 Model saved to: {MODEL_PATH}")

# --- Step 9: Optional - Self-learning update ---
def retrain_with_new_data(new_csv_path):
    """
    Append new weekly data and retrain model automatically.
    """
    new_df = pd.read_csv(new_csv_path, parse_dates=["Date"], dayfirst=True)
    combined = pd.concat([df, new_df], ignore_index=True).drop_duplicates(subset=["Date", "FishType", "Market"])
    combined.to_csv(DATA_PATH, index=False)
    print("🔁 Dataset updated with new weekly records.")
    os.system(f"python {__file__}")  # retrain automatically
