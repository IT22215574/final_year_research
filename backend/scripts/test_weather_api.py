import os
import requests
from dotenv import load_dotenv
import socket
from pathlib import Path

# Paths
script_dir = Path(__file__).parent
backend_dir = script_dir.parent
env_file = backend_dir / ".env"

# Load .env properly
load_dotenv(dotenv_path=env_file, override=True)

API_KEY = os.getenv("OPENWEATHER_API_KEY")


def check_connectivity():
    try:
        socket.gethostbyname("api.openweathermap.org")
        return True
    except:
        return False


print("=" * 60)
print("Weather API Key Tester")
print("=" * 60)

# Validate API key
if not API_KEY:
    print("\n❌ No API key found in .env file!")
    print("Add: OPENWEATHER_API_KEY=YOUR_KEY")
    print("Visit: https://home.openweathermap.org/api_keys")
else:
    masked = f"{API_KEY[:8]}...{API_KEY[-4:]}"
    print(f"\n✅ API key loaded: {masked}")

    if not check_connectivity():
        print("\n⚠️ Internet / DNS issue — cannot reach OpenWeather server")
    else:
        print("\n📡 Testing API request...")
        url = f"https://api.openweathermap.org/data/2.5/weather?q=Colombo&appid={API_KEY}&units=metric"

        try:
            r = requests.get(url, timeout=8)
            print(f"Response: {r.status_code}")

            if r.status_code == 200:
                j = r.json()
                print("\n✅ API key is VALID!")
                print("City:", j["name"])
                print("Temperature:", j["main"]["temp"])
                print("Condition:", j["weather"][0]["main"])

            elif r.status_code == 401:
                print("\n❌ INVALID API KEY (401 Unauthorized)")
                print("Possible reasons:")
                print("• Key not activated yet (takes ~1 hour)")
                print("• Incorrect key pasted")
                print("• Email not verified")
                print("• Key disabled in dashboard")

            else:
                print("\n⚠️ Unexpected response:", r.text[:200])

        except Exception as e:
            print("\n❌ Network error:", e)

print("\n" + "=" * 60)
print("💡 Weather data is OPTIONAL — App works without it!")
print("=" * 60)
