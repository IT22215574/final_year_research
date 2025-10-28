import pandas as pd
import pickle, os
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "dataset", "fish_prices.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model", "model.pkl")

# --- Load data ---
if not os.path.exists(DATA_PATH):
    print(f"❌ Dataset not found at {DATA_PATH}")
    raise SystemExit(1)

df = pd.read_csv(DATA_PATH)

# Check for 'Date' column
if "Date" not in df.columns:
    raise ValueError("❌ 'Date' column missing! Run fetch_prices.py first or fix CSV headers.")

# --- Clean and encode ---
df = df.dropna(subset=["Price_LKR_per_kg"]) if "Price_LKR_per_kg" in df.columns else df.dropna()

df["FishType_id"] = df["FishType"].astype("category").cat.codes if "FishType" in df.columns else 0
df["Market_id"] = df["Market"].astype("category").cat.codes if "Market" in df.columns else 0

# Features selection (adjust if needed)
feature_cols = [c for c in ["FishType_id","Market_id","Temp_C","Rainfall_mm","FuelPrice_LKR","DemandIndex"] if c in df.columns]
if not feature_cols:
    raise ValueError("No valid feature columns found!")

X = df[feature_cols]
y = df[df.columns[df.columns.str.contains("Price")][0]]  # auto-detect price column

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(f"✅ Model trained. MAE: {mean_absolute_error(y_test, y_pred):.2f}")

# Save model and mappings
mappings = {
    "fishtypes": list(df["FishType"].astype("category").cat.categories) if "FishType" in df.columns else [],
    "markets": list(df["Market"].astype("category").cat.categories) if "Market" in df.columns else []
}

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
pickle.dump({"model": model, "mappings": mappings}, open(MODEL_PATH, "wb"))
print(f"💾 Model saved to {MODEL_PATH}")
