import datetime
import requests
import pandas as pd
from pathlib import Path
import socket
import sys

# Support running as a script (no package context)
script_dir = Path(__file__).resolve().parent
backend_dir = script_dir.parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

try:
    from scripts.fetch_weather_data import PORTS  # type: ignore
except Exception:
    # Fallback: define PORTS here if import fails
    PORTS = {
        "Colombo": (6.9271, 79.8612),
        "Negombo": (7.2083, 79.8358),
        "Galle": (6.0535, 80.2210),
        "Trincomalee": (8.5874, 81.2152),
        "Jaffna": (9.6615, 80.0255),
        "Hambantota": (6.1246, 81.1185),
        "Kalpitiya": (8.4020, 79.7557)
    }

backend_dir = Path(__file__).parent.parent
OUT_FILE = backend_dir / "dataset" / "processed" / "weather_forecast.csv"


def ensure_output_dir():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)


def check_connectivity():
    try:
        socket.gethostbyname("api.open-meteo.com")
        return True
    except socket.gaierror:
        return False


def fetch_forecast_for_city(city, lat, lon, days_ahead=14):
    ensure_output_dir()

    if not check_connectivity():
        print("⚠️  Internet / DNS Problem: api.open-meteo.com not reachable")
        return pd.DataFrame()

    start = datetime.datetime.now().date()
    end = start + datetime.timedelta(days=days_ahead)

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_max,precipitation_sum",
        "timezone": "Asia/Colombo"
    }

    print(f"\n📡 Fetching forecast for {city} ({params['start_date']} to {params['end_date']})...")

    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code != 200:
            print(f"[ERROR] API failed for {city}: {resp.status_code}")
            return pd.DataFrame()
        payload = resp.json()
    except Exception as e:
        print(f"[ERROR] Network error for {city}: {e}")
        return pd.DataFrame()

    daily = payload.get("daily", {})
    dates = daily.get("time", [])
    temps = daily.get("temperature_2m_mean", [])
    humidity = daily.get("relative_humidity_2m_mean", [])
    wind = daily.get("wind_speed_10m_max", [])
    precip = daily.get("precipitation_sum", [])

    rows = []
    for i, d in enumerate(dates):
        rain = precip[i] if i < len(precip) else 0
        wind_speed = wind[i] if i < len(wind) else 0
        bad_weather = 1 if (rain > 5 or wind_speed > 30) else 0
        rows.append({
            "date": d,
            "temp_c": round(temps[i], 2) if i < len(temps) else None,
            "humidity": round(humidity[i], 1) if i < len(humidity) else None,
            "wind_speed": round(wind_speed, 2),
            "rainfall": round(rain, 2),
            "condition": "Rainy" if rain > 5 else "Clear",
            "city": city,
            "bad_weather": bad_weather
        })

    print(f"  ✓ {city}: {len(rows)} forecast days")
    return pd.DataFrame(rows)


def main():
    ensure_output_dir()
    frames = []
    for city, (lat, lon) in PORTS.items():
        df = fetch_forecast_for_city(city, lat, lon)
        if not df.empty:
            frames.append(df)
    if not frames:
        print("❌ No forecast data fetched")
        return

    out_df = pd.concat(frames, ignore_index=True)
    # Drop duplicates on date+city if any
    out_df = out_df.sort_values(["date", "city"]).drop_duplicates(subset=["date", "city"])
    out_df.to_csv(OUT_FILE, index=False)
    print(f"\n✅ Forecast saved: {OUT_FILE} ({len(out_df)} rows)")


if __name__ == "__main__":
    main()
