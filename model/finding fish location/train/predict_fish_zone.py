#!/usr/bin/env python3

import argparse
from pathlib import Path

import joblib
import pandas as pd

from land_mask import is_sri_lanka_land


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Load a trained Random Forest fish-zone model and predict fish presence (0/1) "
            "from latitude, longitude, SST, chlorophyll, and ocean current components (u/v)."
        )
    )

    parser.add_argument(
        "--model",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "rf_fish_zone_model.pkl",
        help="Path to the saved model artifact (joblib .pkl).",
    )

    parser.add_argument("--lat", type=float, required=True, help="Latitude")
    parser.add_argument("--lon", type=float, required=True, help="Longitude")
    parser.add_argument("--sst", type=float, required=True, help="Sea surface temperature")
    parser.add_argument(
        "--chlorophyll",
        "--chlor-a",
        dest="chlor_a",
        type=float,
        required=True,
        help="Chlorophyll concentration (chlor_a)",
    )
    parser.add_argument(
        "--u",
        "--water-u",
        dest="water_u",
        type=float,
        required=True,
        help="Eastward ocean current component (water_u)",
    )
    parser.add_argument(
        "--v",
        "--water-v",
        dest="water_v",
        type=float,
        required=True,
        help="Northward ocean current component (water_v)",
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Sea-only guard: if the user passes a coordinate on Sri Lankan land,
    # do not predict a fish zone there.
    if is_sri_lanka_land(args.lat, args.lon):
        print(0)
        return

    if not args.model.exists():
        raise FileNotFoundError(
            f"Model artifact not found: {args.model}. "
            "Train the model first (train_random_forest.py) or pass --model."
        )

    artifact = joblib.load(args.model)

    # Backward/forward compatibility:
    # - Newer artifact: {pipeline, feature_columns, target_column}
    # - Older artifact: pipeline directly
    if isinstance(artifact, dict) and "pipeline" in artifact:
        pipeline = artifact["pipeline"]
        feature_columns = artifact.get(
            "feature_columns", ["lat", "lon", "sst", "chlor_a", "water_u", "water_v"]
        )
    else:
        pipeline = artifact
        feature_columns = ["lat", "lon", "sst", "chlor_a", "water_u", "water_v"]

    row = {
        "lat": args.lat,
        "lon": args.lon,
        "sst": args.sst,
        "chlor_a": args.chlor_a,
        "water_u": args.water_u,
        "water_v": args.water_v,
    }

    X = pd.DataFrame([row], columns=list(feature_columns))
    pred = pipeline.predict(X)

    # Print only the predicted class (0/1)
    print(int(pred[0]))


if __name__ == "__main__":
    main()
