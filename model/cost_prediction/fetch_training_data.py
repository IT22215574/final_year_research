#!/usr/bin/env python3
"""
Automatically fetch and save training data CSV from backend API.
This script downloads approved training candidates and saves them in the format
expected by the ML training notebooks.
"""

import os
import requests
import pandas as pd
from datetime import datetime
import json

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')
AUTH_TOKEN = os.getenv('BACKEND_AUTH_TOKEN', '')
OUTPUT_DIR = 'training_data'

# Boat types that need specialized models
BOAT_TYPES = {
    'Fiber Boat (small)': 'fiber_boat_small',
    'Fiber Boat (medium)': 'fiber_boat_medium', 
    'One Day Boat': 'one_day_boat',
    'Multi Day Boat': 'multi_day_boat',
    'Longliner': 'longliner',
}

def ensure_output_dir():
    """Create output directory if it doesn't exist."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"✓ Output directory: {OUTPUT_DIR}")

def fetch_training_data(boat_type=None):
    """
    Fetch training data from backend API.
    
    Args:
        boat_type: Optional specific boat type to fetch (None = all)
    
    Returns:
        CSV content as string, or None if failed
    """
    headers = {}
    if AUTH_TOKEN:
        headers['Authorization'] = f'Bearer {AUTH_TOKEN}'
    
    try:
        if boat_type:
            url = f'{BACKEND_URL}/api/v1/training-candidates/export/csv/{boat_type}'
            print(f"Fetching data for {boat_type}...")
        else:
            url = f'{BACKEND_URL}/api/v1/training-candidates/export/csv'
            print("Fetching all training data...")
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        print(f"✓ Successfully fetched {len(response.text)} bytes")
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed to fetch from {url}: {e}")
        return None

def save_training_data(csv_content, filename):
    """Save CSV content to file."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    try:
        with open(filepath, 'w') as f:
            f.write(csv_content)
        
        # Validate CSV by reading it
        df = pd.read_csv(filepath)
        print(f"✓ Saved {filename} ({len(df)} rows, {len(df.columns)} columns)")
        return True
    except Exception as e:
        print(f"✗ Failed to save {filename}: {e}")
        return False

def save_metadata(boat_type=None):
    """Save metadata about when the data was exported."""
    metadata = {
        'exported_at': datetime.now().isoformat(),
        'backend_url': BACKEND_URL,
        'boat_type': boat_type or 'all',
    }
    
    if boat_type:
        filepath = os.path.join(OUTPUT_DIR, f'metadata_{boat_type}.json')
    else:
        filepath = os.path.join(OUTPUT_DIR, 'metadata_all.json')
    
    with open(filepath, 'w') as f:
        json.dump(metadata, f, indent=2)

def main():
    """Main function to fetch and save all training data."""
    print("=" * 60)
    print("Training Data Export from Backend")
    print("=" * 60)
    
    ensure_output_dir()
    
    # Fetch all training data
    csv_content = fetch_training_data()
    if csv_content:
        save_training_data(csv_content, 'training_data_all.csv')
        save_metadata()
    
    # Fetch per-boat-type training data
    print("\n" + "-" * 60)
    print("Fetching boat-type specific data...")
    print("-" * 60)
    
    for boat_type_name, boat_type_id in BOAT_TYPES.items():
        csv_content = fetch_training_data(boat_type_name)
        if csv_content:
            filename = f'training_data_{boat_type_id}.csv'
            save_training_data(csv_content, filename)
            save_metadata(boat_type_name)
    
    print("\n" + "=" * 60)
    print("✓ Training data export complete!")
    print("=" * 60)

if __name__ == '__main__':
    main()
