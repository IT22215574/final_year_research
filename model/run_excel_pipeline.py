# run_excel_pipeline.py
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pathlib import Path
import subprocess

import os

def run_python(file_path, args=None, critical=True):
    """Run a Python script. If critical=False, warn on failure instead of stopping."""
    args = args or []
    print("\n" + "="*60)
    print(f"▶ Running: {file_path.name} {' '.join(args)}")
    print("="*60)

    if not file_path.exists():
        print(f"⚠️  Script not found: {file_path}")
        if critical:
            sys.exit(1)
        return False

    # Force UTF-8 encoding for child processes to avoid emoji crash on Windows
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"

    result = subprocess.run([sys.executable, str(file_path)] + args, env=env)
    if result.returncode != 0:
        print(f"❌ Error running {file_path.name} (exit {result.returncode})")
        if critical:
            sys.exit(result.returncode)
        return False
    else:
        print(f"✅ Completed: {file_path.name}")
        return True

def main():
    base = Path(__file__).resolve().parent
    scripts_dir = base / "fish_price_prediction" / "scripts"

    # Script files
    fetch_excel_script = scripts_dir / "fetch_latest_fish_prices.py"
    xl_converter = scripts_dir / "xl_to_csv_converter.py"
    festival_generator = scripts_dir / "festival_master_generator.py"
    weather_fetcher = scripts_dir / "fetch_weather_data.py"  # use existing daily weather fetcher
    fuel_price_script = scripts_dir / "process_fuel_price.py"
    merge_script = scripts_dir / "merge_all_data.py"
    festival_features_script = scripts_dir / "generate_festival_window_features.py"
    feature_script = scripts_dir / "feature_engineering.py"
    # Use the fish_price_prediction training module via a helper runner
    model_train = base / "fish_price_prediction" / "train" / "_run_training.py"
    forecast_script = scripts_dir / "fetch_weather_forecast.py"
    future_features_script = scripts_dir / "build_future_features.py"
    predict_future = scripts_dir / "predict_future_prices.py"

    print("\n🚀 Starting Pipeline: web_scraping → xl → festivals → weather(optional) → fuel → merge → features → train → forecast → future predict\n")

    # -1) Fetch Latest Excel files from web
    if fetch_excel_script.exists():
        run_python(fetch_excel_script)
    else:
        print("\n⚠️ fetch_latest_fish_prices.py not found — skipping web scraping step")

    # 0) Convert Excel to CSV (if exists)
    run_python(xl_converter, critical=False)

    # 1) Generate festival master data
    run_python(festival_generator, critical=False)

    # 2) Fetch weather data (optional — no API key needed, uses Open-Meteo)
    print("\nℹ️ Fetching current weather (optional). If API key missing, this will be skipped.")
    run_python(weather_fetcher, critical=False)

    # 2b) Process LK (Lanka Kerosene) fuel price → daily forward-filled CSV
    run_python(fuel_price_script, critical=False)

    # 3) Merge all data (fish prices + fuel + weather + festivals)
    run_python(merge_script, critical=False)

    # 4) Generate festival window features
    run_python(festival_features_script, critical=False)

    # 5) Feature engineering
    run_python(feature_script, critical=False)

    # 6) Train models — uses fish_price_prediction training module
    run_python(model_train, critical=False)

    # 7) Fetch future weather forecast
    run_python(forecast_script, critical=False)

    # 8) Build future features
    run_python(future_features_script, critical=False)

    # 9) Predict future prices
    run_python(predict_future, critical=False)

    print("\n" + "="*60)
    print("🎉 Pipeline Successfully Completed!")
    print("📊 Outputs:")
    print("   - model/dataset/processed/features_dataset.csv (train)")
    print("   - model/fish_price_prediction/models/*.pkl (rf, gb, encoders)")
    print("   - model/dataset/processed/future_price_predictions.csv")
    print("="*60)

if __name__ == "__main__":
    main()
 
 