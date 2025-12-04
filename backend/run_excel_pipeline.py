# run_excel_pipeline.py
from pathlib import Path
import subprocess
import sys

def run_python(file_path, args=None):
    args = args or []
    print("\n" + "="*60)
    print(f"▶ Running: {file_path} {' '.join(args)}")
    print("="*60)

    result = subprocess.run([sys.executable, str(file_path)] + args)
    if result.returncode != 0:
        print(f"❌ Error running {file_path} (exit {result.returncode})")
        sys.exit(result.returncode)
    else:
        print(f"✅ Completed: {file_path}")

def main():
    base = Path(__file__).resolve().parent
    scripts_dir = base / "scripts"

    # scripts (assume in same folder)
    fetch_holidays_script = scripts_dir / "fetch_holidays.py"
    merge_script = scripts_dir / "merge_all_data.py"
    feature_script = scripts_dir / "feature_engineering.py"

    print("\n🚀 Starting Pipeline: fetch_holidays -> merge -> feature_engineering\n")

    # 1) Fetch holidays (change years as needed)
    # Example: to fetch 2019-2025 use ["--start", "2019", "--end", "2025"]
    run_python(fetch_holidays_script, args=["--start", "2019", "--end", "2025"])

    # 2) Merge all data
    run_python(merge_script)

    # 3) Feature engineering
    run_python(feature_script)

    print("\n" + "="*60)
    print("🎉 Pipeline Successfully Completed!")
    print("="*60)

if __name__ == "__main__":
    main()
