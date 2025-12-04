import os
import datetime
import requests
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
import socket

# Paths
script_dir = Path(__file__).parent            # backend/scripts
backend_dir = script_dir.parent               # backend/
project_root = backend_dir.parent             # project root
env_file = backend_dir / ".env"               # backend/.env

# Load .env correctly
load_dotenv(dotenv_path=env_file, override=True)

API_KEY = os.getenv("OPENWEATHER_API_KEY")
CITY = "Colombo"

# Output CSV path
OUT_FILE = backend_dir / "dataset" / "raw" / "weather" / "weather_data.csv"


def ensure_output_dir():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)


def check_connectivity():
    """Check if DNS resolution works"""
    try:
        socket.gethostbyname("api.openweathermap.org")
        return True
    except socket.gaierror:
        return False


def fetch_weather():
    ensure_output_dir()

    # Check API key
    if not API_KEY or len(API_KEY) < 10:
        print("[ERROR] No valid API key found in .env file!")
        print("Please add: OPENWEATHER_API_KEY=YOUR_KEY")
        print("Get a free API key from: https://openweathermap.org/api")
        return

    # Check internet
    if not check_connectivity():
        print("\n" + "="*60)
        print("⚠️  Internet / DNS Problem")
        print("="*60)
        print("Cannot resolve api.openweathermap.org")
        print("\n💡 Weather data is OPTIONAL — app works fine without it.")
        print("="*60 + "\n")
        return

    url = f"https://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={API_KEY}&units=metric"

    print(f"\n📡 Fetching weather data for {CITY}...")

    try:
        resp = requests.get(url, timeout=10)

        if resp.status_code != 200:
            print(f"[ERROR] API request failed: {resp.status_code}")

            if resp.status_code == 401:
                print("❌ Invalid API key. Please check your .env file.")
            elif resp.status_code == 404:
                print(f"❌ City '{CITY}' not found.")
            else:
                print("Response:", resp.text[:200])
            return

        payload = resp.json()

    except Exception as e:
        print(f"[ERROR] Network error: {e}")
        return

    # Extract fields safely
    main = payload.get("main", {})
    wind = payload.get("wind", {})
    weather_list = payload.get("weather", [{}])
    condition = weather_list[0].get("main")

    temp = main.get("temp")
    humidity = main.get("humidity")
    wind_speed = wind.get("speed")

    if None in (temp, humidity, wind_speed, condition):
        print("[ERROR] Missing fields in API response.")
        return

    today = datetime.date.today().isoformat()

    # Avoid duplicates
    if OUT_FILE.exists():
        try:
            existing = pd.read_csv(OUT_FILE)
            if today in existing.get("date", []).astype(str).values:
                print(f"[SKIP] Weather already saved for {today}")
                return
        except Exception as e:
            print("[WARN] Failed reading existing CSV:", e)

    df = pd.DataFrame({
        "date": [today],
        "temp_c": [round(float(temp), 2)],
        "humidity": [humidity],
        "wind_speed": [wind_speed],
        "condition": [condition],
        "city": [CITY]
    })

    try:
        df.to_csv(
            OUT_FILE,
            mode='a' if OUT_FILE.exists() else 'w',
            header=not OUT_FILE.exists(),
            index=False
        )

        print("\n✅ Weather data saved!")
        print(f"📁 File: {OUT_FILE}")
        print(f"🌡️ Temp: {temp}°C")
        print(f"💧 Humidity: {humidity}%")
        print(f"💨 Wind: {wind_speed} m/s")
        print(f"☁️ Condition: {condition}\n")

    except Exception as e:
        print(f"[ERROR] Failed writing CSV: {e}")


def main():
    fetch_weather()


if __name__ == "__main__":
    main()
