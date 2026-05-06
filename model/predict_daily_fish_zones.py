#!/usr/bin/env python3
"""
Daily Fish Zone Predictor

This script loads the latest environmental data (SST, chlorophyll, ocean currents)
and the trained Random Forest model to predict fish zones across Sri Lankan waters.

It generates:
1. A heatmap showing fish zone probabilities
2. A GeoJSON file with predictions
3. A CSV file with prediction results

Author: Ravindu Jayaweera
Date: March 2026
"""

import sys
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple
import json

import numpy as np
import pandas as pd
import xarray as xr
import joblib
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.patches import Rectangle

# Add the train directory to path for imports
sys.path.append(str(Path(__file__).parent / "finding fish location" / "train"))
from land_mask import is_land

# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Paths
MODEL_PATH = Path(__file__).parent / "finding fish location" / "train" / "models" / "xgboost_fish_zone_model.pkl"
# Unified data folder
BASE_DATA_FOLDER = Path(__file__).parent / "Fish zone daily data"

SST_DATA_DIR = BASE_DATA_FOLDER
CHLOROPHYLL_DATA_DIR = BASE_DATA_FOLDER
CURRENTS_DATA_DIR = BASE_DATA_FOLDER
BATHYMETRY_PATH = BASE_DATA_FOLDER / "bathymetry.nc"
OUTPUT_DIR = Path(__file__).parent / "fish_zone_predictions"

# Sri Lanka EEZ outer bounding box (used only to limit the initial grid)
MIN_LON, MAX_LON = 76.0, 85.0
MIN_LAT, MAX_LAT = 2.0, 10.5

# Sri Lanka EEZ polygon (approximate, based on 1974/1976 India-SL maritime agreements)
# Points listed as (lat, lon) counterclockwise. Excludes Indian coastal waters.
SRI_LANKA_EEZ_POLYGON = [
    (10.5, 80.0),   # North – Palk Strait India boundary
    (10.5, 82.5),   # North-Northeast
    (10.0, 85.0),   # Northeast
    (8.0,  85.0),   # East
    (5.0,  85.0),   # East-Southeast
    (2.5,  83.0),   # Southeast
    (2.5,  80.0),   # South
    (2.5,  78.0),   # South-Southwest
    (4.0,  76.5),   # Southwest (Maldives boundary)
    (6.0,  76.5),   # West
    (8.0,  77.5),   # West (India-SL Gulf of Mannar boundary)
    (8.5,  78.5),   # Northwest
    (9.0,  79.0),   # Northwest
    (9.5,  79.5),   # North (Gulf of Mannar / India boundary)
    (10.0, 80.0),   # North (Palk Strait)
    (10.5, 80.0),   # Close polygon
]


def _point_in_eez(lat: float, lon: float) -> bool:
    """Ray-casting check: is (lat, lon) inside SRI_LANKA_EEZ_POLYGON?"""
    poly = SRI_LANKA_EEZ_POLYGON
    n = len(poly)
    inside = False
    j = n - 1
    for i in range(n):
        lat_i, lon_i = poly[i]
        lat_j, lon_j = poly[j]
        if ((lon_i > lon) != (lon_j > lon)) and (
            lat < (lat_j - lat_i) * (lon - lon_i) / (lon_j - lon_i) + lat_i
        ):
            inside = not inside
        j = i
    return inside

# Grid resolution for predictions
GRID_RESOLUTION = 0.1  # degrees (~11 km)

# Logging
LOG_FILE = OUTPUT_DIR / "prediction_log.txt"

# ==============================================================================
# LOGGING SETUP
# ==============================================================================

def setup_logging():
    """Configure logging to both file and console."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    logger = logging.getLogger("FishZonePredictor")
    logger.setLevel(logging.INFO)
    
    # Clear existing handlers
    logger.handlers = []
    
    # File handler
    file_handler = logging.FileHandler(LOG_FILE, mode='a')
    file_handler.setLevel(logging.INFO)
    file_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter('%(levelname)s: %(message)s')
    console_handler.setFormatter(console_formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

logger = setup_logging()

# ==============================================================================
# DATA LOADING FUNCTIONS
# ==============================================================================

def get_latest_file(directory: Path, pattern: str) -> Optional[Path]:
    """Get the most recent file matching a pattern in a directory."""
    files = sorted(directory.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    if files:
        return files[0]
    return None


def load_latest_sst() -> Optional[xr.Dataset]:
    """Load the latest SST data file."""
    latest_file = get_latest_file(SST_DATA_DIR, "sst_*.nc")
    if not latest_file:
        logger.error(f"No SST data files found in {SST_DATA_DIR}")
        return None
    
    logger.info(f"Loading SST data: {latest_file.name}")
    try:
        ds = xr.open_dataset(latest_file)
        return ds
    except Exception as e:
        logger.error(f"Failed to load SST data: {e}")
        return None


def load_latest_chlorophyll() -> Optional[xr.Dataset]:
    """Load the latest chlorophyll data file."""
    latest_file = get_latest_file(CHLOROPHYLL_DATA_DIR, "chlorophyll_*.nc")
    if not latest_file:
        logger.error(f"No chlorophyll data files found in {CHLOROPHYLL_DATA_DIR}")
        return None
    
    logger.info(f"Loading chlorophyll data: {latest_file.name}")
    try:
        ds = xr.open_dataset(latest_file)
        return ds
    except Exception as e:
        logger.error(f"Failed to load chlorophyll data: {e}")
        return None


def load_latest_currents() -> Optional[xr.Dataset]:
    """Load the latest ocean current data file."""
    latest_file = get_latest_file(CURRENTS_DATA_DIR, "currents_*.nc")
    if not latest_file:
        logger.error(f"No ocean current data files found in {CURRENTS_DATA_DIR}")
        return None
    
    logger.info(f"Loading ocean current data: {latest_file.name}")
    try:
        ds = xr.open_dataset(latest_file)
        return ds
    except Exception as e:
        logger.error(f"Failed to load ocean current data: {e}")
        return None


def load_bathymetry() -> Optional[xr.Dataset]:
    """Load bathymetry data."""
    if not BATHYMETRY_PATH.exists():
        logger.warning(f"Bathymetry data not found at {BATHYMETRY_PATH}")
        return None
    
    logger.info(f"Loading bathymetry data: {BATHYMETRY_PATH.name}")
    try:
        return xr.open_dataset(BATHYMETRY_PATH)
    except Exception as e:
        logger.error(f"Failed to load bathymetry data: {e}")
        return None


def load_model() -> Optional[dict]:
    """Load the trained Random Forest model."""
    if not MODEL_PATH.exists():
        logger.error(f"Model not found at {MODEL_PATH}")
        logger.error("Please train the model first using train_random_forest.py")
        return None
    
    logger.info(f"Loading model: {MODEL_PATH.name}")
    try:
        artifact = joblib.load(MODEL_PATH)
        
        # Handle both dict and direct pipeline formats
        if isinstance(artifact, dict) and "pipeline" in artifact:
            return artifact
        else:
            return {
                "pipeline": artifact,
                "feature_columns": ["lat", "lon", "sst", "chlor_a", "water_u", "water_v", "depth"]
            }
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return None

# ==============================================================================
# PREDICTION FUNCTIONS
# ==============================================================================

def extract_value_at_point(ds: xr.Dataset, var_name: str, lat: float, lon: float) -> Optional[float]:
    """Extract a single value from a dataset at given coordinates using nearest neighbor."""
    try:
        # Find coordinate names (they might vary)
        lat_coord = [c for c in ds.coords if 'lat' in c.lower()][0]
        lon_coord = [c for c in ds.coords if 'lon' in c.lower()][0]
        
        # Select nearest point
        point = ds.sel({lat_coord: lat, lon_coord: lon}, method='nearest')
        
        # Handle depth dimension if exists (take surface level)
        if 'depth' in point.dims:
            point = point.isel(depth=0)
        
        # Handle time dimension if exists (take first/only time)
        if 'time' in point.dims:
            point = point.isel(time=0)
        
        # Extract variable value
        if var_name in point:
            val = point[var_name].values
            # Handle both scalar and array returns
            if isinstance(val, np.ndarray):
                val = val.item()  # Convert to scalar
            val = float(val)
            if np.isnan(val) or np.isinf(val):
                return None
            
            # Convert SST from Kelvin to Celsius if needed
            if 'sst' in var_name.lower() and val > 100:  # Likely in Kelvin if > 100
                val = val - 273.15
            
            return val
        
        return None
    except Exception as e:
        logger.debug(f"Error extracting {var_name} at ({lat}, {lon}): {e}")
        return None


def create_prediction_grid() -> pd.DataFrame:
    """Create a grid of lat/lon points within Sri Lanka's EEZ only."""
    lats = np.arange(MIN_LAT, MAX_LAT, GRID_RESOLUTION)
    lons = np.arange(MIN_LON, MAX_LON, GRID_RESOLUTION)

    lat_grid, lon_grid = np.meshgrid(lats, lons)

    grid_points = []
    for lat, lon in zip(lat_grid.flatten(), lon_grid.flatten()):
        # Keep only points inside Sri Lanka's EEZ polygon
        if not _point_in_eez(lat, lon):
            continue
        # Skip any land mass (Sri Lanka island, Indian mainland, etc.)
        if is_land(lat, lon):
            continue
        grid_points.append({'lat': lat, 'lon': lon})

    logger.info(f"Created prediction grid with {len(grid_points)} ocean points")
    return pd.DataFrame(grid_points)


def predict_fish_zones(grid_df: pd.DataFrame, 
                      sst_ds: xr.Dataset, 
                      chlor_ds: xr.Dataset, 
                      currents_ds: xr.Dataset, 
                      bathymetry_ds: Optional[xr.Dataset],
                      model_artifact: dict) -> pd.DataFrame:
    """Predict fish zones for all grid points."""
    
    logger.info("Extracting environmental data for grid points...")
    
    # Identify variable names in datasets
    sst_var = 'analysed_sst' if 'analysed_sst' in sst_ds else 'sst'
    chlor_var = 'CHL' if 'CHL' in chlor_ds else 'chlor_a'
    u_var = 'uo' if 'uo' in currents_ds else 'water_u'
    v_var = 'vo' if 'vo' in currents_ds else 'water_v'
    
    # Find bathymetry variable name if available
    bathy_var = None
    if bathymetry_ds is not None:
        for var in ['deptho', 'elevation', 'bathymetry', 'depth']:
            if var in bathymetry_ds:
                bathy_var = var
                logger.info(f"Found bathymetry variable: {bathy_var}")
                break
    
    # Extract data for each point
    sst_values = []
    chlor_values = []
    u_values = []
    v_values = []
    bathy_values = []
    
    valid_indices = []
    
    for idx, row in grid_df.iterrows():
        lat, lon = row['lat'], row['lon']
        
        sst = extract_value_at_point(sst_ds, sst_var, lat, lon)
        chlor = extract_value_at_point(chlor_ds, chlor_var, lat, lon)
        u = extract_value_at_point(currents_ds, u_var, lat, lon)
        v = extract_value_at_point(currents_ds, v_var, lat, lon)
        
        # Extract bathymetry if available
        bathy = None
        if bathymetry_ds is not None and bathy_var is not None:
            bathy = extract_value_at_point(bathymetry_ds, bathy_var, lat, lon)
            # Convert elevation to depth (GEBCO style: negative values are ocean depth)
            # For 'deptho', values are already positive depths
            if bathy is not None:
                if bathy_var == 'elevation' and bathy < 0:
                    bathy = abs(bathy)  # Convert negative elevation to positive depth
                elif bathy_var == 'deptho':
                    # deptho is already positive depth, keep as is
                    pass
                # Ensure depth is positive and reasonable (0-6000m)
                if bathy < 0 or bathy > 6000:
                    bathy = None
        
        # Only include points with all valid data
        if all(val is not None for val in [sst, chlor, u, v]):
            valid_indices.append(idx)
            sst_values.append(sst)
            chlor_values.append(chlor)
            u_values.append(u)
            v_values.append(v)
            bathy_values.append(bathy if bathy is not None else 0.0)
    
    # Create feature dataframe
    valid_grid = grid_df.loc[valid_indices].copy()
    valid_grid['sst'] = sst_values
    valid_grid['chlor_a'] = chlor_values
    valid_grid['water_u'] = u_values
    valid_grid['water_v'] = v_values
    valid_grid['depth'] = bathy_values  # Renamed from 'bathymetry' to 'depth' to match model training
    
    logger.info(f"Valid data points: {len(valid_grid)} / {len(grid_df)}")
    
    # Make predictions
    pipeline = model_artifact['pipeline']
    feature_columns = model_artifact.get('feature_columns', 
                                         ['lat', 'lon', 'sst', 'chlor_a', 'water_u', 'water_v'])
    
    X = valid_grid[feature_columns]
    
    logger.info("Making predictions...")
    predictions = pipeline.predict(X)
    probabilities = pipeline.predict_proba(X)[:, 1]  # Probability of fish presence
    
    valid_grid['fish_zone'] = predictions
    valid_grid['fish_probability'] = probabilities
    
    # Add bathymetry column for output (same as depth)
    valid_grid['bathymetry'] = valid_grid['depth']
    
    return valid_grid

# ==============================================================================
# VISUALIZATION AND OUTPUT
# ==============================================================================

def save_predictions_csv(predictions_df: pd.DataFrame, output_path: Path):
    """Save predictions to CSV file."""
    predictions_df.to_csv(output_path, index=False)
    logger.info(f"Saved predictions to {output_path}")


def save_predictions_geojson(predictions_df: pd.DataFrame, output_path: Path):
    """Save predictions as GeoJSON for mapping applications."""
    features = []
    
    for _, row in predictions_df.iterrows():
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [row['lon'], row['lat']]
            },
            "properties": {
                "fish_zone": int(row['fish_zone']),
                "fish_probability": float(row['fish_probability']),
                "sst": float(row['sst']),
                "chlorophyll": float(row['chlor_a']),
                "current_u": float(row['water_u']),
                "current_v": float(row['water_v']),
                "bathymetry": float(row['bathymetry'])
            }
        }
        features.append(feature)
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    with open(output_path, 'w') as f:
        json.dump(geojson, f, indent=2)
    
    logger.info(f"Saved GeoJSON to {output_path}")


def create_fish_zone_heatmap(predictions_df: pd.DataFrame, output_path: Path):
    """Create and save a heatmap visualization of fish zone predictions."""
    
    fig, ax = plt.subplots(figsize=(12, 10))
    
    # Create pivot table for heatmap
    pivot = predictions_df.pivot_table(
        values='fish_probability',
        index='lat',
        columns='lon',
        aggfunc='mean'
    )
    
    # Create heatmap
    im = ax.imshow(
        pivot.values,
        extent=[MIN_LON, MAX_LON, MIN_LAT, MAX_LAT],
        origin='lower',
        cmap='YlOrRd',
        aspect='auto',
        vmin=0,
        vmax=1
    )
    
    # Colorbar
    cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.set_label('Fish Zone Probability', rotation=270, labelpad=20, fontsize=11)
    
    # Labels and title
    ax.set_xlabel('Longitude', fontsize=12)
    ax.set_ylabel('Latitude', fontsize=12)
    ax.set_title(f'Predicted Fish Zones - Sri Lankan Waters\n{datetime.now().strftime("%Y-%m-%d")}', 
                 fontsize=14, fontweight='bold')
    
    # Grid
    ax.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
    
    # Save
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    logger.info(f"Saved heatmap to {output_path}")


def create_summary_statistics(predictions_df: pd.DataFrame) -> str:
    """Generate summary statistics of predictions."""
    total_points = len(predictions_df)
    fish_zone_points = (predictions_df['fish_zone'] == 1).sum()
    avg_probability = predictions_df['fish_probability'].mean()
    max_probability = predictions_df['fish_probability'].max()
    
    high_prob_zones = (predictions_df['fish_probability'] > 0.7).sum()
    
    summary = f"""
Fish Zone Prediction Summary
{'='*50}
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Total prediction points: {total_points}
Predicted fish zones: {fish_zone_points} ({fish_zone_points/total_points*100:.1f}%)
High probability zones (>70%): {high_prob_zones} ({high_prob_zones/total_points*100:.1f}%)

Average fish probability: {avg_probability:.3f}
Maximum fish probability: {max_probability:.3f}

Environmental Data Ranges:
- SST: {predictions_df['sst'].min():.2f}°C to {predictions_df['sst'].max():.2f}°C
- Chlorophyll: {predictions_df['chlor_a'].min():.4f} to {predictions_df['chlor_a'].max():.4f} mg/m³
- Ocean Current U: {predictions_df['water_u'].min():.3f} to {predictions_df['water_u'].max():.3f} m/s
- Ocean Current V: {predictions_df['water_v'].min():.3f} to {predictions_df['water_v'].max():.3f} m/s
- Water Depth: {predictions_df['depth'].min():.1f}m to {predictions_df['depth'].max():.1f}m
{'='*50}
"""
    
    return summary

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

def main():
    """Main execution function."""
    logger.info("="*60)
    logger.info("Starting Daily Fish Zone Prediction")
    logger.info("="*60)
    
    # Load model
    model_artifact = load_model()
    if model_artifact is None:
        logger.error("Cannot proceed without model. Exiting.")
        return 1
    
    # Load environmental data
    sst_ds = load_latest_sst()
    chlor_ds = load_latest_chlorophyll()
    currents_ds = load_latest_currents()
    bathymetry_ds = load_bathymetry()
    
    if any(ds is None for ds in [sst_ds, chlor_ds, currents_ds]):
        logger.error("Missing environmental data. Ensure all data is downloaded first.")
        return 1
    
    if bathymetry_ds is None:
        logger.warning("Bathymetry data not available - depths will be set to 0")
    
    # Create prediction grid
    grid_df = create_prediction_grid()
    
    # Make predictions
    predictions_df = predict_fish_zones(grid_df, sst_ds, chlor_ds, currents_ds, bathymetry_ds, model_artifact)
    
    if len(predictions_df) == 0:
        logger.error("No valid predictions generated. Check data quality.")
        return 1
    
    # Generate timestamp for output files
    timestamp = datetime.now().strftime("%Y-%m-%d")
    
    # Save outputs
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    csv_path = OUTPUT_DIR / f"fish_zones_{timestamp}.csv"
    geojson_path = OUTPUT_DIR / f"fish_zones_{timestamp}.geojson"
    heatmap_path = OUTPUT_DIR / f"fish_zones_heatmap_{timestamp}.png"
    
    save_predictions_csv(predictions_df, csv_path)
    save_predictions_geojson(predictions_df, geojson_path)
    create_fish_zone_heatmap(predictions_df, heatmap_path)
    
    # Generate and log summary
    summary = create_summary_statistics(predictions_df)
    logger.info(summary)
    
    # Save summary to file
    summary_path = OUTPUT_DIR / f"summary_{timestamp}.txt"
    with open(summary_path, 'w') as f:
        f.write(summary)
    
    logger.info("="*60)
    logger.info("Fish Zone Prediction Complete!")
    logger.info("="*60)
    
    # Close datasets
    sst_ds.close()
    chlor_ds.close()
    currents_ds.close()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
