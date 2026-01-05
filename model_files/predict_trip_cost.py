#!/usr/bin/env python3
"""
Smart Fisher Trip Cost Prediction Script
Uses the new ML model with production predictor
"""

import sys
import json
import os
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.absolute()

# Add the model_files directory to Python path
sys.path.insert(0, str(SCRIPT_DIR))

# Import the production predictor
try:
    from production_predictor import TripCostPredictor
except ImportError as e:
    print(json.dumps({'error': f'Failed to import predictor: {str(e)}'}), file=sys.stderr)
    sys.exit(1)

# Port to Region Mapping (Sri Lankan fishing ports)
PORT_TO_REGION_MAP = {
    # West Coast
    'Colombo': 'West',
    'Negombo': 'West',
    'Chilaw': 'West',
    'Puttalam': 'West',
    'Kalpitiya': 'West',
    'Beruwala': 'West',
    'Kalutara': 'West',
    'Panadura': 'West',
    'Moratuwa': 'West',
    'Wadduwa': 'West',
    
    # South Coast
    'Galle': 'South',
    'Matara': 'South',
    'Tangalle': 'South',
    'Hambantota': 'South',
    'Mirissa': 'South',
    'Weligama': 'South',
    'Dikwella': 'South',
    'Dondra': 'South',
    
    # East Coast
    'Trincomalee': 'East',
    'Batticaloa': 'East',
    'Kalmunai': 'East',
    'Ampara': 'East',
    'Valaichchenai': 'East',
    'Mullativu': 'East',
    'Pulmoddai': 'East',
    
    # North Coast
    'Jaffna': 'North',
    'Point Pedro': 'North',
    'Kankesanthurai': 'North',
    'Mannar': 'North',
    'Kilinochchi': 'North',
    'Vavuniya': 'North',
    'Pesalai': 'North',
    'Delft': 'North',
}

def map_port_to_region(port_name: str) -> str:
    """Map a port name to its region."""
    if not port_name:
        return 'West'  # Default to West
    
    # Try exact match (case-insensitive)
    port_key = port_name.strip().title()
    if port_key in PORT_TO_REGION_MAP:
        return PORT_TO_REGION_MAP[port_key]
    
    # Try partial match
    port_lower = port_name.lower()
    for port, region in PORT_TO_REGION_MAP.items():
        if port.lower() in port_lower or port_lower in port.lower():
            return region
    
    # Default to West coast if unknown
    return 'West'

def main():
    """Main entry point for the script."""
    try:
        # Check if input data was provided
        if len(sys.argv) < 2:
            print(json.dumps({'error': 'No input data provided'}), file=sys.stderr)
            sys.exit(1)
        
        # Parse input JSON
        input_json = sys.argv[1]
        input_data = json.loads(input_json)
        
        # Extract port_name and map to region
        port_name = input_data.get('port_name', 'Colombo')
        region = map_port_to_region(port_name)
        
        # Determine fuel type based on boat type
        boat_type = input_data.get('boat_type', 'IMUL')
        if boat_type == 'NMTR':
            fuel_type = 'None'
        else:
            fuel_type = 'Diesel'  # Most common for OFRP boats
        
        # Determine crew size based on boat type
        crew_size_map = {
            'IMUL': 3,
            'MDBT': 5,
            'OBFR': 2,
            'TKBO': 4,
            'NMTR': 2
        }
        crew_size = crew_size_map.get(boat_type, 3)
        
        # Determine boat specifications based on type
        boat_specs = {
            'IMUL': {'ice': 200, 'water': 100, 'speed': 12},
            'MDBT': {'ice': 800, 'water': 500, 'speed': 15},
            'OBFR': {'ice': 150, 'water': 50, 'speed': 10},
            'TKBO': {'ice': 300, 'water': 150, 'speed': 13},
            'NMTR': {'ice': 100, 'water': 30, 'speed': 8}
        }
        specs = boat_specs.get(boat_type, boat_specs['IMUL'])
        
        # Prepare trip data for ML model
        trip_data = {
            # Boat specifications
            'boat_type': boat_type,
            'engine_hp': input_data.get('engine_hp', 75),
            'fuel_type': fuel_type,
            'crew_size': crew_size,
            'ice_capacity_kg': specs['ice'],
            'water_capacity_L': specs['water'],
            'avg_speed_kmh': specs['speed'],
            
            # Trip parameters
            'trip_days': input_data.get('trip_days', 1),
            'trip_month': input_data.get('month', 1),
            'distance_km': input_data.get('distance_km', 50),
            
            # Environmental factors
            'wind_kph': input_data.get('wind_kph', 15),
            'wave_height_m': input_data.get('wave_m', 1.0),
            'weather_factor': 1.0,  # Default weather factor
            
            # Location and derived
            'region': region,
            'is_multi_day': input_data.get('trip_days', 1) > 1,
            'has_engine': boat_type != 'NMTR',
            'is_deep_sea': input_data.get('distance_km', 50) > 100
        }
        
        # Initialize predictor with silent mode to avoid encoding issues
        model_path = SCRIPT_DIR / 'production_model' / 'trip_cost_predictor.pkl'
        metadata_path = SCRIPT_DIR / 'production_model' / 'model_metadata.json'
        
        predictor = TripCostPredictor(
            model_path=str(model_path),
            metadata_path=str(metadata_path),
            silent=True  # Suppress all print output to avoid Windows encoding issues
        )
        
        # Make prediction
        result = predictor.predict(trip_data, include_confidence=False)
        
        # Extract predictions
        predictions = result['predictions']
        
        # Return result in the format expected by NestJS backend
        output = {
            'base_cost': float(predictions['total_base_cost_lkr']),
            'fuel_cost_estimate': float(predictions['fuel_cost_lkr']),
            'ice_cost_estimate': float(predictions['ice_cost_lkr']),
            'water_cost_estimate': float(predictions['water_cost_lkr']),
            'currency': 'LKR',
            'model_info': result['model_info'],
            'input_data': {
                'port_name': port_name,
                'region': region,
                'boat_type': boat_type,
                'trip_days': trip_data['trip_days'],
                'distance_km': trip_data['distance_km']
            },
            'note': 'Base cost includes fuel, ice, and water. Add external costs separately.'
        }
        
        print(json.dumps(output))
        sys.exit(0)
    
    except FileNotFoundError as e:
        print(json.dumps({'error': f'Model files not found: {str(e)}. Please train the model first.'}), file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Prediction error: {str(e)}'}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
