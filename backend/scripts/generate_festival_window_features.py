import pandas as pd

def generate_festival_features(input_file="merged_all.csv", output_file="merged_festival_features.csv"):
    df = pd.read_csv(input_file)
    df["date"] = pd.to_datetime(df["date"])

    df["is_festival_day"] = (df["festival_name"] != "None").astype(int)

    window_size = 3  
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

    # Mark festival windows
    df["before_festival_window"] = (df["days_to_festival"].between(0, window_size)).astype(int)
    df["after_festival_window"] = (df["days_after_festival"].between(0, window_size)).astype(int)

    df.to_csv(output_file, index=False)
    print("Festival features added →", output_file)


if __name__ == "__main__":
    generate_festival_features()
