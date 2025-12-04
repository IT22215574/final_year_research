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
    festival_generator = scripts_dir / "festival_master_generator.py"
    merge_script = scripts_dir / "merge_all_data.py"
    festival_features_script = scripts_dir / "generate_festival_window_features.py"
    feature_script = scripts_dir / "feature_engineering.py"

    print("\n🚀 Starting Pipeline: festivals → merge → features → engineering\n")

    # 1) Generate festival master data
    run_python(festival_generator)

    # 2) Merge all data (price + weather + festivals)
    run_python(merge_script)

    # 3) Generate festival window features
    run_python(festival_features_script)

    # 4) Feature engineering
    run_python(feature_script)

    print("\n" + "="*60)
    print("🎉 Pipeline Successfully Completed!")
    print("📊 Output: backend/dataset/processed/features_dataset.csv")
    print("="*60)

if __name__ == "__main__":
    main()
