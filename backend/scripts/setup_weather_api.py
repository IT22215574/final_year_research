from pathlib import Path

def setup_api_key():
    """
    Helper script to set up OpenWeatherMap API key
    """
    print("=" * 60)
    print("Weather API Setup")
    print("=" * 60)
    
    print("\n📝 To use weather data, you need an API key from OpenWeatherMap.")
    print("\nSteps to get your API key:")
    print("1. Go to: https://openweathermap.org/api")
    print("2. Sign up for a free account")
    print("3. Get your API key from the dashboard")
    print("4. It may take a few hours to activate")
    
    print("\n" + "-" * 60)
    api_key = input("\nEnter your API key (or press Enter to skip): ").strip()
    
    if not api_key:
        print("\n⏭️  Skipped. You can set up the API key later.")
        print("\nNote: Your fish price prediction works without weather data!")
        return
    
    # Create .env file in backend directory
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent
    env_file = backend_dir / ".env"
    
    with open(env_file, "w") as f:
        f.write(f"OPENWEATHER_API_KEY={api_key}\n")
    
    print(f"\n✅ API key saved to: {env_file}")
    print("\nYou can now run fetch_weather_data.py")

if __name__ == "__main__":
    setup_api_key()
    print("\nDone!")
