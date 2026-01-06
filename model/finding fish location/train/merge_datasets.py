#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable, Optional

import pandas as pd


def _find_first_existing(base_dir: Path, candidates: Iterable[str]) -> Optional[Path]:
    for name in candidates:
        p = base_dir / name
        if p.exists() and p.is_file():
            return p
    return None


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    return df


def _ensure_lat_lon(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Strictly support expected column names; keep minimal + predictable.
    if "lat" not in df.columns or "lon" not in df.columns:
        raise ValueError(f"Missing required columns. Found columns: {list(df.columns)}")

    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    return df


def _normalize_lon_range(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize longitude to the [-180, 180) convention when data appears to be in [0, 360]."""
    df = df.copy()
    lon = df["lon"]
    finite = lon.dropna()
    if len(finite) == 0:
        return df
    if float(finite.min()) >= 0.0 and float(finite.max()) > 180.0:
        df["lon"] = ((lon + 180.0) % 360.0) - 180.0
    return df


def _maybe_round_lat_lon(df: pd.DataFrame, *, decimals: Optional[int]) -> pd.DataFrame:
    if decimals is None:
        return df
    df = df.copy()
    df["lat"] = df["lat"].round(decimals)
    df["lon"] = df["lon"].round(decimals)
    return df


def _infer_days_origin(days_series: pd.Series) -> str:
    """Infer origin for numeric day counts.

    Heuristic tuned for common ocean/climate products:
    - Large values (e.g., ~80k) often mean 'days since 1800-01-01'
    - Values around ~18k often mean 'days since 1970-01-01'

    If ambiguous, default to 1970.
    """
    s = pd.to_numeric(days_series, errors="coerce")
    median = float(s.dropna().median()) if s.notna().any() else 0.0
    if median >= 50000:
        return "1800-01-01"
    return "1970-01-01"


def _normalize_time_to_date(df: pd.DataFrame, *, time_col: str = "time", numeric_origin: Optional[str] = None) -> pd.DataFrame:
    df = df.copy()
    if time_col not in df.columns:
        raise ValueError(f"Missing '{time_col}' column. Found columns: {list(df.columns)}")

    t = df[time_col]

    # Case 1: numeric times => interpret as days since some origin (heuristic or user-provided)
    if pd.api.types.is_numeric_dtype(t) or pd.to_numeric(t, errors="coerce").notna().mean() > 0.95:
        origin = numeric_origin or _infer_days_origin(t)
        days = pd.to_numeric(t, errors="coerce")
        dt = pd.to_datetime(origin) + pd.to_timedelta(days, unit="D")
        df[time_col] = dt.dt.normalize()
        return df

    # Case 2: string timestamps/dates
    dt = pd.to_datetime(t, errors="coerce", utc=True)
    if dt.notna().any():
        # Normalize to date and drop timezone for consistent merging
        df[time_col] = dt.dt.tz_convert(None).dt.normalize()
        return df

    # Fallback: keep as-is (will likely not merge well, but avoids hard failure)
    return df


def _read_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge SST, chlorophyll, currents, and bathymetry CSVs into merged.csv")
    parser.add_argument(
        "--dir",
        default=str(Path.cwd()),
        help="Directory containing the CSV files (default: current working directory)",
    )
    parser.add_argument("--sst", default=None, help="SST CSV filename (default: auto-detect)")
    parser.add_argument("--chlorophyll", default=None, help="Chlorophyll CSV filename (default: auto-detect)")
    parser.add_argument("--currents", default=None, help="Currents CSV filename (default: auto-detect)")
    parser.add_argument("--bathymetry", default=None, help="Bathymetry CSV filename (default: auto-detect)")
    parser.add_argument(
        "--skip-bathymetry",
        action="store_true",
        help="If set, do not load/merge bathymetry (merge only SST+chlorophyll+currents).",
    )
    parser.add_argument(
        "--output",
        default="merged.csv",
        help="Output CSV filename (default: merged.csv)",
    )
    parser.add_argument(
        "--sst-origin",
        default=None,
        help="Origin date for numeric SST time (days since). Example: 1800-01-01. Default: inferred.",
    )
    parser.add_argument(
        "--chlorophyll-origin",
        default=None,
        help="Origin date for numeric chlorophyll time (days since). Example: 1970-01-01. Default: inferred.",
    )
    parser.add_argument(
        "--round-latlon",
        type=int,
        default=None,
        help="Optional rounding (decimal places) applied to lat/lon before merging to help align different grids.",
    )

    args = parser.parse_args()
    base_dir = Path(args.dir).expanduser().resolve()

    sst_path = (base_dir / args.sst) if args.sst else _find_first_existing(
        base_dir,
        [
            "sst.csv",
            "sst.day.mean.2020.csv",
        ],
    )
    chl_path = (base_dir / args.chlorophyll) if args.chlorophyll else _find_first_existing(
        base_dir,
        [
            "chlorophyll.csv",
            "merged Chlorophyll consentration.csv 13-37-28-704.csv",
        ],
    )
    cur_path = (base_dir / args.currents) if args.currents else _find_first_existing(
        base_dir,
        [
            "currents.csv",
            "merged_ocean currents 2020.1-6currents.csv",
        ],
    )
    bathy_path = (base_dir / args.bathymetry) if args.bathymetry else _find_first_existing(
        base_dir,
        [
            "bathymetry.csv",
            "GEBCO_2023.csv",
        ],
    )

    missing = [
        ("sst", sst_path),
        ("chlorophyll", chl_path),
        ("currents", cur_path),
    ]
    if not args.skip_bathymetry:
        missing.append(("bathymetry", bathy_path))
    missing = [name for name, p in missing if p is None]
    if missing:
        raise FileNotFoundError(
            "Missing required input file(s): "
            + ", ".join(missing)
            + f". Looked in: {base_dir}"
        )

    sst = _normalize_columns(_read_csv(sst_path))
    chl = _normalize_columns(_read_csv(chl_path))
    cur = _normalize_columns(_read_csv(cur_path))
    bathy = _normalize_columns(_read_csv(bathy_path)) if (not args.skip_bathymetry and bathy_path) else None

    sst = _ensure_lat_lon(sst)
    chl = _ensure_lat_lon(chl)
    cur = _ensure_lat_lon(cur)
    if bathy is not None:
        bathy = _ensure_lat_lon(bathy)

    # Bring longitudes to a consistent convention before any merge.
    sst = _normalize_lon_range(sst)
    chl = _normalize_lon_range(chl)
    cur = _normalize_lon_range(cur)
    if bathy is not None:
        bathy = _normalize_lon_range(bathy)

    # Normalize time to dates for reliable daily joins
    sst = _normalize_time_to_date(sst, numeric_origin=args.sst_origin)
    chl = _normalize_time_to_date(chl, numeric_origin=args.chlorophyll_origin)
    cur = _normalize_time_to_date(cur)

    # Optional: make lat/lon joinable across different spatial grids.
    sst = _maybe_round_lat_lon(sst, decimals=args.round_latlon)
    chl = _maybe_round_lat_lon(chl, decimals=args.round_latlon)
    cur = _maybe_round_lat_lon(cur, decimals=args.round_latlon)
    if bathy is not None:
        bathy = _maybe_round_lat_lon(bathy, decimals=args.round_latlon)

    # Merge on lat, lon, time (inner join keeps only aligned observations)
    merged = pd.merge(sst, chl, on=["lat", "lon", "time"], how="inner")
    merged = pd.merge(merged, cur, on=["lat", "lon", "time"], how="inner")

    # Merge bathymetry on lat, lon only (optional)
    if bathy is not None:
        merged = pd.merge(merged, bathy, on=["lat", "lon"], how="left")

    out_path = (base_dir / args.output).resolve()
    merged.to_csv(out_path, index=False)

    if len(merged) == 0:
        print(
            "WARNING: merged dataset has 0 rows. This usually means the inputs do not share exact (lat, lon, time) keys. "
            "Try `--round-latlon 1` or `--round-latlon 2`, and ensure all sources use compatible longitude conventions.",
        )
    print(f"Wrote {len(merged):,} rows to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
