# run_excel_pipeline.py
from pathlib import Path
import subprocess
import sys

def run_python(file_path, args=None):
    args = args or []
    print("\n" + "="*60)
    print(f"▶ Running: {file_path.name} {' '.join(args)}")
    print("="*60)

    result = subprocess.run([sys.executable, str(file_path)] + args)
    if result.returncode != 0:
        print(f"❌ Error running {file_path.name} (exit {result.returncode})")
        sys.exit(result.returncode)
    else:
        print(f"✅ Completed: {file_path.name}")

def main():
    base = Path(__file__).resolve().parent
    scripts_dir = base / "scripts"

    # Script files
    xl_converter = scripts_dir / "xl_to_csv_converter.py"
    festival_generator = scripts_dir / "festival_master_generator.py"
    weather_fetcher = scripts_dir / "fetch_weather_data.py"  # use existing daily weather fetcher
    merge_script = scripts_dir / "merge_all_data.py"
    festival_features_script = scripts_dir / "generate_festival_window_features.py"
    feature_script = scripts_dir / "feature_engineering.py"
    model_train = base / "model_train.py"
    forecast_script = scripts_dir / "fetch_weather_forecast.py"
    future_features_script = scripts_dir / "build_future_features.py"
    predict_future = scripts_dir / "predict_future_prices.py"

    print("\n🚀 Starting Pipeline: xl → festivals → weather(optional) → merge → features → train → forecast → future predict\n")

    # 0) Convert Excel to CSV (if exists)
    if xl_converter.exists():
        run_python(xl_converter)
    else:
        print("\n⚠️ xl_to_csv_converter.py not found — skipping Excel→CSV step")

    # 1) Generate festival master data
    run_python(festival_generator)

    # 2) Fetch weather data (optional)
    if weather_fetcher.exists():
        print("\nℹ️ Fetching current weather (optional). If API key missing, this will be skipped.")
        try:
            run_python(weather_fetcher)
        except SystemExit:
            # Do not stop pipeline if weather fetch fails
            print("⚠️ Weather fetch failed — continuing without weather data")
    else:
        print("\n⚠️ Skipping weather fetch (script not found)")

    # 3) Merge all data (price + weather + festivals)
    run_python(merge_script)

    # 4) Generate festival window features
    run_python(festival_features_script)

    # 5) Feature engineering
    run_python(feature_script)

    # 6) Train models
    run_python(model_train)

    # 7) Fetch future weather forecast
    run_python(forecast_script)

    # 8) Build future features
    run_python(future_features_script)

    # 9) Predict future prices
    run_python(predict_future)

    print("\n" + "="*60)
    print("🎉 Pipeline Successfully Completed!")
    print("📊 Outputs:")
    print("   - backend/dataset/processed/features_dataset.csv (train)")
    print("   - backend/models/*.pkl (rf, gb, encoders)")
    print("   - backend/models/model_accuracy_chart.png (accuracy visualization)")
    print("   - backend/dataset/processed/future_price_predictions.csv")
    print("="*60)

if __name__ == "__main__":
    main()
 
 