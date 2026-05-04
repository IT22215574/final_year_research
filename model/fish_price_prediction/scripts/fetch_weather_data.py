import datetime
import requests
import pandas as pd
from pathlib import Path
import socket

# Paths
script_dir = Path(__file__).parent            # fish_price_prediction/scripts
# Navigate: scripts/ → fish_price_prediction/ → model/ → final_year_research/ → Backend/
project_root = script_dir.parent.parent.parent
backend_dir = project_root / "Backend"

# Output CSV path
OUT_FILE = backend_dir / "dataset" / "processed" / "weather_dataset.csv"

# Sri Lanka main ports with lat/lon (approx.)
PORTS = {
    "Colombo": (6.9271, 79.8612),
    "Negombo": (7.2083, 79.8358),
    "Galle": (6.0535, 80.2210),
    "Trincomalee": (8.5874, 81.2152),
    "Jaffna": (9.6615, 80.0255),
    "Hambantota": (6.1246, 81.1185),
    "Kalpitiya": (8.4020, 79.7557)
}


def ensure_output_dir():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)


def check_connectivity():
    """Check if DNS resolution works"""
    try:
        socket.gethostbyname("archive-api.open-meteo.com")
        return True
    except socket.gaierror:
        return False


def fetch_weather_open_meteo(city, lat, lon, start_date, end_date):
    """
    Fetch historical weather data from Open-Meteo API (FREE, no API key needed)
    
    Args:
        start_date: datetime object or string (YYYY-MM-DD)
        end_date: datetime object or string (YYYY-MM-DD)
    """
    ensure_output_dir()

    # Check internet
    if not check_connectivity():
        print("\n" + "="*60)
        print("⚠️  Internet / DNS Problem")
        print("="*60)
        print("Cannot resolve archive-api.open-meteo.com")
        print("\n💡 Weather data is OPTIONAL — app works fine without it.")
        print("="*60 + "\n")
        return

    # Format dates
    if isinstance(start_date, datetime.datetime):
        start_str = start_date.strftime("%Y-%m-%d")
    else:
        start_str = str(start_date)
    
    if isinstance(end_date, datetime.datetime):
        end_str = end_date.strftime("%Y-%m-%d")
    else:
        end_str = str(end_date)

    # Open-Meteo API endpoint (FREE, no key needed)
    url = "https://archive-api.open-meteo.com/v1/archive"
    
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_str,
        "end_date": end_str,
        "daily": "temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_max,precipitation_sum",
        "timezone": "Asia/Colombo"
    }

    print(f"\n📡 Fetching weather data for {city} ({start_str} to {end_str})...")
    print("🌐 Using Open-Meteo API (FREE, no API key needed)")

    try:
        resp = requests.get(url, params=params, timeout=30)
        print(f"✅ API Response Status: {resp.status_code}")

        if resp.status_code != 200:
            print(f"[ERROR] API request failed: {resp.status_code}")
            print("Response:", resp.text[:200])
            return

        payload = resp.json()
        print("✅ Successfully parsed JSON response")

    except Exception as e:
        print(f"[ERROR] Network error: {e}")
        return

    # Extract daily data
    if "daily" not in payload:
        print("[ERROR] No daily data in API response.")
        return

    daily = payload["daily"]
    print("\n📊 Extracting weather data fields...")
    
    dates = daily.get("time", [])
    temps = daily.get("temperature_2m_mean", [])
    humidity = daily.get("relative_humidity_2m_mean", [])
    wind = daily.get("wind_speed_10m_max", [])
    precip = daily.get("precipitation_sum", [])
    
    # Log data retrieval status
    print(f"  ✓ Dates: {len(dates)} records")
    print(f"  ✓ Temperature: {len(temps)} records")
    print(f"  ✓ Humidity: {len(humidity)} records")
    print(f"  ✓ Wind Speed: {len(wind)} records")
    print(f"  ✓ Precipitation: {len(precip)} records")

    if not dates:
        print("[ERROR] No dates in API response.")
        return
    
    print(f"\n✅ All weather fields retrieved successfully!")

    # Create DataFrame
    print("\n🔄 Processing weather data...")
    weather_data = []
    bad_weather_count = 0
    
    for i in range(len(dates)):
        # Determine bad weather (rain > 5mm or wind > 30 km/h)
        rain = precip[i] if i < len(precip) else 0
        wind_speed = wind[i] if i < len(wind) else 0
        bad_weather = 1 if (rain > 5 or wind_speed > 30) else 0
        
        if bad_weather:
            bad_weather_count += 1
        
        weather_data.append({
            "date": dates[i],
            "temp_c": round(temps[i], 2) if i < len(temps) else None,
            "humidity": round(humidity[i], 1) if i < len(humidity) else None,
            "wind_speed": round(wind_speed, 2) if i < len(wind) else None,
            "rainfall": round(rain, 2),
            "condition": "Rainy" if rain > 5 else "Clear",
            "city": city,
            "bad_weather": bad_weather
        })
    
    print(f"  ✓ Processed {len(weather_data)} weather records")
    print(f"  ✓ Bad weather days detected: {bad_weather_count}")

    df = pd.DataFrame(weather_data)
    print(f"  ✓ DataFrame created with {len(df)} rows")

    # Remove any existing data for these dates and append new
    if OUT_FILE.exists():
        print("\n📝 Merging with existing weather data...")
        try:
            existing = pd.read_csv(OUT_FILE)
            print(f"  ✓ Found existing data: {len(existing)} records")
            existing = existing[~((existing["date"].isin(df["date"])) & (existing["city"] == city))]
            print(f"  ✓ After removing duplicates for {city}: {len(existing)} records")
            df = pd.concat([existing, df], ignore_index=True)
            df = df.sort_values(["date", "city"]).drop_duplicates(subset=["date", "city"])
            print(f"  ✓ Final merged data: {len(df)} records")
        except Exception as e:
            print("[WARN] Failed reading existing CSV:", e)
    else:
        print("\n📝 Creating new weather dataset file...")

    try:
        print("\n💾 Saving weather data to CSV...")
        df.to_csv(OUT_FILE, index=False)

        print("\n" + "="*60)
        print("✅ WEATHER DATA SUCCESSFULLY SAVED!")
        print("="*60)
        print(f"📁 File: {OUT_FILE}")
        print(f"📊 Total Records: {len(df)}")
        print(f"📅 Date range: {df['date'].min()} to {df['date'].max()}")
        print(f"🌡️ Temp range: {df['temp_c'].min():.1f}°C - {df['temp_c'].max():.1f}°C")
        print(f"💧 Humidity range: {df['humidity'].min():.0f}% - {df['humidity'].max():.0f}%")
        print(f"🌧️ Bad weather days: {df['bad_weather'].sum()}/{len(df)}")
        print("="*60 + "\n")

    except Exception as e:
        print(f"[ERROR] Failed writing CSV: {e}")


def main():
    # Fetch weather for 2024-2025 for all ports
    start = datetime.datetime(2024, 1, 1)
    end = datetime.datetime.now()

    for city, (lat, lon) in PORTS.items():
        fetch_weather_open_meteo(city, lat, lon, start, end)


if __name__ == "__main__":
    main()
