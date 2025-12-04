import os
import pandas as pd
from pathlib import Path

# File paths
BASE_DIR = Path(__file__).resolve().parents[2]     # backend/
RAW_PATH = BASE_DIR / "dataset" / "raw" / "catch_volume"
OUTPUT_PATH = BASE_DIR / "dataset" / "csv" / "processed" / "catch_volume.csv"

def load_catch_volume():
    print("\n📌 Loading Catch Volume Data from:", RAW_PATH)

    all_data = []

    for file in os.listdir(RAW_PATH):
        if file.endswith(".csv") or file.endswith(".xlsx"):
            file_path = RAW_PATH / file
            print(f"   ➤ Reading: {file}")

            try:
                if file.endswith(".xlsx"):
                    df = pd.read_excel(file_path)
                else:
                    df = pd.read_csv(file_path)

                all_data.append(df)

            except Exception as e:
                print(f"   ❌ Error reading {file}: {e}")

    if not all_data:
        print("❌ No catch volume files found!")
        return

    # Merge all files
    final_df = pd.concat(all_data, ignore_index=True)

    # Basic cleanup
    final_df.columns = [col.strip().lower().replace(" ", "_") for col in final_df.columns]
    final_df.drop_duplicates(inplace=True)

    # Save file
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(OUTPUT_PATH, index=False)

    print("✅ Catch Volume Dataset Processed!")
    print("📁 Saved to:", OUTPUT_PATH)


if __name__ == "__main__":
    load_catch_volume()
