import os
import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime

BASE_DIR = os.path.dirname(__file__)
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "fish_prices.csv")
URL = "https://www.fisheries.gov.lk/web/index.php/en/statistics/weekly-fish-prices"

def fetch_latest_prices():
    print("📡 Fetching latest weekly fish prices...")
    resp = requests.get(URL, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    table = soup.find("table")
    if not table:
        raise ValueError("❌ No table found on the page - site layout may have changed.")

    # --- Try pandas.read_html first ---
    try:
        tables = pd.read_html(str(table))
        if tables:
            df_new = tables[0]
        else:
            raise ValueError("No tables parsed with pandas.read_html")
    except Exception as e:
        # --- Fallback to manual parsing ---
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        rows = []
        for tr in table.find_all("tr")[1:]:
            tds = [td.get_text(separator=" ", strip=True) for td in tr.find_all("td")]
            if not tds:
                continue
            if len(tds) < len(headers):
                tds += [""] * (len(headers) - len(tds))
            rows.append(tds[:len(headers)])
        if not rows:
            raise ValueError("❌ No rows parsed from table.")
        df_new = pd.DataFrame(rows, columns=headers)

    # --- Clean column names ---
    df_new.columns = df_new.columns.astype(str)
    df_new.columns = df_new.columns.str.strip().str.replace("\n", " ").str.replace("\r", "")

    # --- Rename mapping ---
    rename_map = {
        "Fish Type": "FishType",
        "Fish": "FishType",
        "Species": "FishType",
        "Market": "Market",
        "Price (LKR/kg)": "Price_LKR_per_kg",
        "Price (Rs/kg)": "Price_LKR_per_kg",
        "Date": "Date"
    }
    df_new.rename(columns=rename_map, inplace=True)

    # --- Ensure FishType column exists ---
    if "FishType" in df_new.columns:
        df_new["FishType"] = df_new["FishType"].fillna("Unknown").astype(str).str.lower().str.strip()
    else:
        df_new["FishType"] = "Unknown"

    # --- Filter target fish ---
    TARGET_FISH = ["yellow fin tuna", "tuna", "sail fish", "marlin fish"]
    df_new = df_new[df_new["FishType"].isin(TARGET_FISH)]

    # --- Handle Date ---
    if "Date" in df_new.columns:
        df_new["Date"] = pd.to_datetime(df_new["Date"], errors="coerce", dayfirst=True)
        df_new["Week"] = df_new["Date"].dt.to_period("W").apply(lambda r: r.start_time)
        df_new.drop(columns=["Date"], inplace=True)
        df_new.rename(columns={"Week": "Date"}, inplace=True)
    else:
        df_new["Date"] = pd.to_datetime(datetime.now().date())

    # --- Handle Price ---
    if "Price_LKR_per_kg" in df_new.columns:
        df_new["Price_LKR_per_kg"] = pd.to_numeric(
            df_new["Price_LKR_per_kg"].astype(str).str.replace(",", ""),
            errors="coerce"
        )

    # --- Add default numeric columns ---
    for col in ["Temp_C", "Rainfall_mm", "FuelPrice_LKR", "DemandIndex", "Season", "PrevPrice"]:
        if col not in df_new.columns:
            df_new[col] = 0.0

    # --- Save dataset ---
    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
    if os.path.exists(DATASET_PATH):
        df_old = pd.read_csv(DATASET_PATH)
        df_old.columns = df_old.columns.astype(str)
        df_old.columns = df_old.columns.str.strip().str.replace("\n", " ").str.replace("\r", "")
        combined = pd.concat([df_old, df_new], ignore_index=True, sort=False)
        combined = combined.drop_duplicates(subset=["Date", "FishType", "Market"], keep="last")
    else:
        combined = df_new

    combined.to_csv(DATASET_PATH, index=False)

    # --- Save per-fish CSVs ---
    for fish in TARGET_FISH:
        df_fish = combined[combined["FishType"] == fish]
        df_fish.to_csv(f"dataset/{fish.replace(' ', '_')}.csv", index=False)

    print(f"✅ Dataset updated and saved to {DATASET_PATH} (total rows: {len(combined)})")
    print("🔎 Sample data:\n", combined.head())

if __name__ == "__main__":
    fetch_latest_prices()