import pandas as pd
import os
from pathlib import Path

def generate_festival_features(
    input_file=None,
    festival_master_file=None,
    output_file=None
):
    # Setup paths relative to script location
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent
    processed_dir = backend_dir / "dataset" / "processed"
    
    # Default paths
    if input_file is None:
        input_file = processed_dir / "final_merged_dataset.csv"
    if festival_master_file is None:
        festival_master_file = backend_dir / "dataset" / "raw" / "festivals" / "festivals_2020_2026.csv"
    if output_file is None:
        output_file = processed_dir / "merged_festival_features.csv"

    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        print("Please run merge_all_data.py first to generate the merged dataset.")
        return

    # Load main data
    df = pd.read_csv(input_file)
    df["date"] = pd.to_datetime(df["date"])

    # Load festival master and merge
    fest_df = pd.read_csv(festival_master_file)
    fest_df["festival_date"] = pd.to_datetime(fest_df["festival_date"])
    fest_df.rename(columns={"festival_date": "date"}, inplace=True)
    
    # Merge with festival data, using suffix to avoid column conflicts
    df = df.merge(fest_df, on="date", how="left", suffixes=('', '_fest'))
    
    # Use festival_name_fest if it exists from merge, otherwise create it
    if "festival_name_fest" in df.columns:
        df["festival_name"] = df["festival_name_fest"]
        df = df.drop(columns=["festival_name_fest"])
    
    df["festival_name"] = df["festival_name"].fillna("None")

    df["is_festival_day"] = (df["festival_name"] != "None").astype(int)

    window_size = 14  # 2 weeks before festival
    df = df.sort_values("date")

    df["days_to_festival"] = 999
    df["days_after_festival"] = 999

    festival_dates = df[df["is_festival_day"] == 1]["date"].tolist()

    for fday in festival_dates:
        df["days_to_festival"] = df["days_to_festival"].where(
            (df["days_to_festival"] < (fday - df["date"]).dt.days) |
            ((fday - df["date"]).dt.days < 0),
            (fday - df["date"]).dt.days
        )
        df["days_after_festival"] = df["days_after_festival"].where(
            (df["days_after_festival"] < (df["date"] - fday).dt.days) |
            ((df["date"] - fday).dt.days < 0),
            (df["date"] - fday).dt.days
        )

    df["before_festival_window"] = (df["days_to_festival"].between(1, window_size)).astype(int)
    df["after_festival_window"] = (df["days_after_festival"].between(1, window_size)).astype(int)

    # Assume columns: 'stock', 'price' exist. If not, create dummy columns for demonstration.
    if "stock" not in df.columns:
        df["stock"] = 100  # base stock
    if "price" not in df.columns:
        df["price"] = 50   # base price

    # On Poya day, decrease stock and increase price
    poya_mask = df["festival_name"].str.lower().str.contains("poya", na=False)
    df.loc[poya_mask, "stock"] -= 20
    df.loc[poya_mask, "price"] += 10

    # As any festival approaches, increase stock and decrease price
    before_mask = df["before_festival_window"] == 1
    df.loc[before_mask, "stock"] += (
        window_size - df.loc[before_mask, "days_to_festival"]
    )
    df.loc[before_mask, "price"] -= (
        window_size - df.loc[before_mask, "days_to_festival"]
    ) * 0.5

    df.to_csv(output_file, index=False)
    print("✅ Festival features added →", output_file)
    print(df[["date", "festival_name", "is_festival_day", "days_to_festival", "stock", "price"]].head(20))
    print(df[["date", "festival_name", "is_festival_day", "days_to_festival", "stock", "price"]].tail(20))

if __name__ == "__main__":
    generate_festival_features()
