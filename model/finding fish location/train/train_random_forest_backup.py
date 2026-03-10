#!/usr/bin/env python3

import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from land_mask import keep_sea_rows_in_sri_lanka_bbox


DEFAULT_FEATURE_COLUMNS = [
    "lat",
    "lon",
    "sst",
    "chlor_a",
    "water_u",
    "water_v",
]
DEFAULT_TARGET_COLUMN = "fish_presence"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Train a RandomForestClassifier to predict fish presence using lat/lon, "
            "SST, chlorophyll, and ocean current components (u/v)."
        )
    )

    parser.add_argument(
        "--data",
        type=Path,
        default=Path(__file__).with_name("final_dataset_no_bathymetry.csv"),
        help="Path to the CSV dataset.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "rf_fish_zone_model.pkl",
        help="Where to save the trained model artifact (joblib-serialized .pkl).",
    )

    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)

    parser.add_argument("--n-estimators", type=int, default=300)
    parser.add_argument("--max-depth", type=int, default=None)
    parser.add_argument("--min-samples-split", type=int, default=2)
    parser.add_argument("--min-samples-leaf", type=int, default=1)
    parser.add_argument("--class-weight", type=str, default="balanced")

    parser.add_argument(
        "--features",
        nargs="+",
        default=DEFAULT_FEATURE_COLUMNS,
        help="Feature column names in the CSV.",
    )
    parser.add_argument(
        "--target",
        type=str,
        default=DEFAULT_TARGET_COLUMN,
        help="Target label column name in the CSV.",
    )

    parser.add_argument(
        "--allow-land",
        action="store_true",
        help="If set, do NOT filter out Sri Lankan land points (default filters them out).",
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.data.exists():
        raise FileNotFoundError(f"Dataset not found: {args.data}")

    df = pd.read_csv(args.data)

    if (not args.allow_land) and ("lat" in df.columns) and ("lon" in df.columns):
        before = len(df)
        df = keep_sea_rows_in_sri_lanka_bbox(df, lat_col="lat", lon_col="lon")
        removed = before - len(df)
        if removed:
            print(f"Removed {removed:,} Sri Lankan land rows (kept sea only).")

    missing_cols = [c for c in [*args.features, args.target] if c not in df.columns]
    if missing_cols:
        raise ValueError(
            "Missing required columns in dataset: "
            + ", ".join(missing_cols)
            + f". Available columns: {', '.join(df.columns)}"
        )

    X = df[args.features]
    y = df[args.target]

    # Ensure binary/int labels (common in classification metrics)
    if y.dtype == "bool":
        y = y.astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=y if y.nunique() > 1 else None,
    )

    model = RandomForestClassifier(
        n_estimators=args.n_estimators,
        random_state=args.random_state,
        max_depth=args.max_depth,
        min_samples_split=args.min_samples_split,
        min_samples_leaf=args.min_samples_leaf,
        n_jobs=-1,
        class_weight=None if args.class_weight.lower() == "none" else args.class_weight,
    )

    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("model", model),
        ]
    )

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")
    print("\nClassification report:")
    print(classification_report(y_test, y_pred, digits=4, zero_division=0))

    artifact = {
        "pipeline": pipeline,
        "feature_columns": list(args.features),
        "target_column": args.target,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, args.output)
    print(f"\nSaved model artifact to: {args.output}")


if __name__ == "__main__":
    main()
