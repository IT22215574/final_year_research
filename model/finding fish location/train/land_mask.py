#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BBox:
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float

    def contains(self, lat: float, lon: float) -> bool:
        return (self.lat_min <= lat <= self.lat_max) and (self.lon_min <= lon <= self.lon_max)


# Rough bounding box around Sri Lanka + nearshore.
# Used only to decide when to apply the land-mask check.
SRI_LANKA_BBOX = BBox(lat_min=5.0, lat_max=10.8, lon_min=79.0, lon_max=82.6)


def _require_global_land_mask():
    try:
        from global_land_mask import globe  # type: ignore

        return globe
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "Missing optional dependency 'global-land-mask'. Install it with: pip install global-land-mask"
        ) from exc


def is_land(lat: float, lon: float) -> bool:
    globe = _require_global_land_mask()
    return bool(globe.is_land(lat, lon))


def is_sri_lanka_land(lat: float, lon: float) -> bool:
    if not SRI_LANKA_BBOX.contains(lat, lon):
        return False
    return is_land(lat, lon)


def keep_sea_rows_in_sri_lanka_bbox(df, *, lat_col: str = "lat", lon_col: str = "lon"):
    """Filter out rows that fall on Sri Lankan land.

    - Only applies within `SRI_LANKA_BBOX` to keep runtime manageable.
    - Rows with NaN lat/lon are kept unchanged.
    """

    if lat_col not in df.columns or lon_col not in df.columns:
        return df

    lat = df[lat_col]
    lon = df[lon_col]

    in_bbox = (
        lat.notna()
        & lon.notna()
        & (lat >= SRI_LANKA_BBOX.lat_min)
        & (lat <= SRI_LANKA_BBOX.lat_max)
        & (lon >= SRI_LANKA_BBOX.lon_min)
        & (lon <= SRI_LANKA_BBOX.lon_max)
    )

    if not bool(in_bbox.any()):
        return df

    # Evaluate land-mask only for rows in the bbox.
    idx = df.index[in_bbox]
    land_flags = [is_land(float(df.at[i, lat_col]), float(df.at[i, lon_col])) for i in idx]

    to_drop = set(idx[j] for j, is_land_flag in enumerate(land_flags) if is_land_flag)
    if not to_drop:
        return df

    return df.drop(index=list(to_drop))
