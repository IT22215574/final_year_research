#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from land_mask import keep_sea_rows_in_sri_lanka_bbox


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    return df


def _pick_depth_series(df: pd.DataFrame) -> pd.Series:
    """Return a depth-in-meters series derived from common bathymetry columns.

    Supported columns:
    - depth
    - bathymetry
    - elevation (GEBCO style: negative for ocean depth)

    If `elevation` contains negatives, depth_m = -elevation.
    Otherwise assume it's already meters depth (positive).
    """
    for col in ("depth", "bathymetry"):
        if col in df.columns:
            return pd.to_numeric(df[col], errors="coerce")

    if "elevation" in df.columns:
        elev = pd.to_numeric(df["elevation"], errors="coerce")
        finite = elev.dropna()
        if len(finite) and float((finite < 0).mean()) > 0.5:
            return -elev
        return elev

    raise ValueError(
        "No bathymetry column found. Expected one of: depth, bathymetry, elevation. "
        f"Found: {list(df.columns)}"
    )


def _has_any_depth_column(df: pd.DataFrame) -> bool:
    cols = set(df.columns)
    return bool({"depth", "bathymetry", "elevation"} & cols)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Compute current speed from u/v, label fish_presence by thresholds, and write final_dataset.csv"
        )
    )
    parser.add_argument(
        "--input",
        default="merged.csv",
        help="Input merged dataset CSV (default: merged.csv)",
    )
    parser.add_argument(
        "--output",
        default="final_dataset.csv",
        help="Output CSV (default: final_dataset.csv)",
    )
    parser.add_argument("--sst-min", type=float, default=26.0)
    parser.add_argument("--sst-max", type=float, default=30.0)
    parser.add_argument("--chlorophyll-min", type=float, default=0.2)
    parser.add_argument("--speed-min", type=float, default=0.1)
    parser.add_argument("--speed-max", type=float, default=1.0)
    parser.add_argument("--depth-min", type=float, default=50.0)
    parser.add_argument("--depth-max", type=float, default=2000.0)
    parser.add_argument(
        "--skip-bathymetry",
        action="store_true",
        help="If set, do not apply the bathymetry depth condition when labeling fish_presence.",
    )
    parser.add_argument(
        "--allow-land",
        action="store_true",
        help="If set, do NOT filter out Sri Lankan land points (default filters them out).",
    )

    args = parser.parse_args()

    in_path = Path(args.input).expanduser().resolve()
    out_path = Path(args.output).expanduser().resolve()

    df = pd.read_csv(in_path)
    df = _normalize_columns(df)

    if (not args.allow_land) and ("lat" in df.columns) and ("lon" in df.columns):
        before = len(df)
        df = keep_sea_rows_in_sri_lanka_bbox(df, lat_col="lat", lon_col="lon")
        removed = before - len(df)
        if removed:
            print(f"Removed {removed:,} Sri Lankan land rows (kept sea only).")

    required = ["sst", "chlor_a", "water_u", "water_v"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}. Found: {list(df.columns)}")

    sst = pd.to_numeric(df["sst"], errors="coerce")
    chlor = pd.to_numeric(df["chlor_a"], errors="coerce")
    u = pd.to_numeric(df["water_u"], errors="coerce")
    v = pd.to_numeric(df["water_v"], errors="coerce")
    depth_m: Optional[pd.Series]
    if _has_any_depth_column(df):
        depth_m = _pick_depth_series(df)
    else:
        depth_m = None

    current_speed = np.sqrt(u.to_numpy(dtype=float) ** 2 + v.to_numpy(dtype=float) ** 2)
    df["current_speed"] = current_speed
    if (not args.skip_bathymetry) and (depth_m is not None):
        df["bathymetry_depth_m"] = depth_m

    mask = (
        sst.between(args.sst_min, args.sst_max, inclusive="both")
        & (chlor >= args.chlorophyll_min)
        & pd.Series(current_speed).between(args.speed_min, args.speed_max, inclusive="both")
    )

    # Apply depth condition only if available and not explicitly skipped.
    if (not args.skip_bathymetry) and (depth_m is not None):
        mask = mask & depth_m.between(args.depth_min, args.depth_max, inclusive="both")

    df["fish_presence"] = mask.fillna(False).astype(int)

    df.to_csv(out_path, index=False)

    count_1 = int(df["fish_presence"].sum())
    print(f"Wrote {len(df):,} rows to {out_path}")
    print(f"fish_presence=1: {count_1:,} ({(count_1 / max(len(df), 1)) * 100:.2f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
