import pandas as pd
from pathlib import Path
from datetime import datetime
import requests
import os
from dotenv import load_dotenv
from hijridate import Hijri

# ----------------------------------
# PATHS
# ----------------------------------
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent

OUTPUT_DIR = BACKEND_DIR / "dataset" / "raw" / "festivals"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_CSV = OUTPUT_DIR / "festivals_2020_2026.csv"

# ----------------------------------
# LOAD API KEY
# ----------------------------------
env_file = BACKEND_DIR / ".env"
load_dotenv(env_file)

API_KEY = os.getenv("CALENDARIFIC_API_KEY")
BASE_URL = "https://calendarific.com/api/v2/holidays"

# ✅ FIX: 2020 → 2026 INCLUDE
YEARS = list(range(2020, 2027))
rows = []

# ======================================================
# 1️⃣ FIXED DATE FESTIVALS (Same every year)
# ======================================================
fixed_festivals = {
    "NewYear_Jan1": "01-01",
    "Independence_Day": "02-04",
    "Christmas": "12-25"
}

for y in YEARS:
    for name, mmdd in fixed_festivals.items():
        m, d = map(int, mmdd.split("-"))
        rows.append({
            "festival_name": name,
            "festival_date": pd.Timestamp(year=y, month=m, day=d)
        })

# ======================================================
# 2️⃣ SINHALA + TAMIL NEW YEAR (Semi-fixed)
# ======================================================
for y in YEARS:
    rows.append({"festival_name": "SinhalaNewYear", "festival_date": pd.Timestamp(f"{y}-04-13")})
    rows.append({"festival_name": "SinhalaNewYear", "festival_date": pd.Timestamp(f"{y}-04-14")})
    rows.append({"festival_name": "TamilNewYear", "festival_date": pd.Timestamp(f"{y}-04-14")})

# ======================================================
# 3️⃣ MUSLIM FESTIVALS (CALCULATED)
# ======================================================
hijri_map = {
    2020: 1441,
    2021: 1442,
    2022: 1443,
    2023: 1444,
    2024: 1445,
    2025: 1446,
    2026: 1447
}

for year, hijri_year in hijri_map.items():
    eid_fitr = Hijri(hijri_year, 10, 1).to_gregorian()
    eid_adha = Hijri(hijri_year, 12, 10).to_gregorian()

    rows.append({"festival_name": "Eid_al_Fitr", "festival_date": pd.Timestamp(eid_fitr)})
    rows.append({"festival_name": "Eid_al_Adha", "festival_date": pd.Timestamp(eid_adha)})

# ======================================================
# 4️⃣ POYA, VESAK, POSON → VIA API (AUTO EACH YEAR)
# ======================================================
if API_KEY:
    for year in YEARS:
        params = {
            "api_key": API_KEY,
            "country": "LK",
            "year": year
        }

        try:
            r = requests.get(BASE_URL, params=params, timeout=10).json()

            if "response" not in r:
                print(f"⚠ No API data for {year}")
                continue

            for h in r["response"]["holidays"]:
                name = h["name"]
                date_str = h["date"]["iso"][:10]
                date_obj = pd.to_datetime(date_str)

                if any(k in name.lower() for k in ["poya", "vesak", "poson"]):
                    rows.append({
                        "festival_name": name.replace(" Day", "").strip(),
                        "festival_date": date_obj
                    })

        except Exception as e:
            print(f"❌ API Error {year}: {e}")

else:
    print("⚠ API KEY missing → Skipping Poya / Vesak / Poson")

# ======================================================
# FINAL SAVE
# ======================================================
df = pd.DataFrame(rows)
df.sort_values("festival_date", inplace=True)
df.drop_duplicates(inplace=True)
df.reset_index(drop=True, inplace=True)
df.to_csv(OUTPUT_CSV, index=False)

print("\n✅ FESTIVAL MASTER CSV GENERATED SUCCESSFULLY")
print(f"📁 {OUTPUT_CSV}")
print(df.head(15))
print(df.tail(15))
