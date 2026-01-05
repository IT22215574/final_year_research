"""
Quick Dataset Generator for Smart Fisher Lanka
Generates synthetic fishing trip data for ML training
"""

import pandas as pd
import numpy as np
import random

print("🔄 Generating dataset...")

# Boat configurations (realistic Sri Lankan OFRP boats)
boat_configs = {
    'IMUL': {'hp': 75, 'ice': 200, 'water': 100, 'speed': 12},
    'MDBT': {'hp': 120, 'ice': 800, 'water': 500, 'speed': 15},
    'OBFR': {'hp': 40, 'ice': 150, 'water': 50, 'speed': 10},
    'TKBO': {'hp': 85, 'ice': 300, 'water': 150, 'speed': 13},
    'NMTR': {'hp': 0, 'ice': 100, 'water': 30, 'speed': 8}  # Non-motorized
}

# Current LKR prices (2026)
FUEL_PRICE_PER_LITER = 350  # Diesel/Petrol
ICE_COST_PER_KG = 12.0
WATER_COST_PER_LITER = 5.0

# Generate 10,000 records
records = []
for i in range(10000):
    boat_type = random.choice(list(boat_configs.keys()))
    config = boat_configs[boat_type]
    
    # Trip parameters
    trip_days = random.randint(1, 7)
    distance_km = random.uniform(20, 500)
    trip_month = random.randint(1, 12)
    crew_size = random.randint(2, 6)
    
    # Environmental factors
    wind_kph = random.uniform(5, 40)
    wave_height_m = random.uniform(0.5, 3.0)
    weather_factor = random.uniform(0.8, 1.5)
    
    # Location
    region = random.choice(['North', 'East', 'South', 'West'])
    
    # Derived features
    is_multi_day = trip_days > 1
    has_engine = config['hp'] > 0
    is_deep_sea = distance_km > 100
    
    # Calculate fuel consumption
    if config['hp'] > 0:
        # Fuel consumption based on engine HP, distance, speed, and weather
        base_fuel_per_hour = config['hp'] * 0.25  # liters/hour
        trip_hours = distance_km / config['speed']
        fuel_liters = base_fuel_per_hour * trip_hours * weather_factor
        fuel_cost = fuel_liters * FUEL_PRICE_PER_LITER
    else:
        fuel_cost = 0
    
    # Calculate ice cost (depends on trip duration and ice capacity)
    ice_used_kg = min(config['ice'], config['ice'] * trip_days * 0.8)
    ice_cost = ice_used_kg * ICE_COST_PER_KG
    
    # Calculate water cost
    water_used_liters = min(config['water'], config['water'] * trip_days * 0.7)
    water_cost = water_used_liters * WATER_COST_PER_LITER
    
    # Total cost
    total_cost = fuel_cost + ice_cost + water_cost
    
    # Create record
    record = {
        # Boat specifications
        'boat_type': boat_type,
        'engine_hp': config['hp'],
        'fuel_type': 'Diesel' if config['hp'] > 0 else 'None',
        'crew_size': crew_size,
        'ice_capacity_kg': config['ice'],
        'water_capacity_L': config['water'],
        'avg_speed_kmh': config['speed'],
        
        # Trip parameters
        'trip_days': trip_days,
        'trip_month': trip_month,
        'distance_km': distance_km,
        
        # Environmental factors
        'wind_kph': wind_kph,
        'wave_height_m': wave_height_m,
        'weather_factor': weather_factor,
        
        # Location and derived
        'region': region,
        'is_multi_day': is_multi_day,
        'has_engine': has_engine,
        'is_deep_sea': is_deep_sea,
        
        # TARGETS (what we want to predict)
        'fuel_cost_lkr': fuel_cost,
        'ice_cost_lkr': ice_cost,
        'water_cost_lkr': water_cost,
        'total_base_cost_lkr': total_cost
    }
    
    records.append(record)
    
    # Progress indicator
    if (i + 1) % 2000 == 0:
        print(f"  Generated {i + 1:,} records...")

# Create DataFrame
df = pd.DataFrame(records)

# Save dataset
output_file = 'smart_fisher_full_dataset.csv'
df.to_csv(output_file, index=False)

print(f"\n✅ Dataset generation complete!")
print(f"   Records: {len(df):,}")
print(f"   File: {output_file}")
print(f"\n📊 Statistics:")
print(f"   Average trip cost: LKR {df['total_base_cost_lkr'].mean():,.0f}")
print(f"   Min cost: LKR {df['total_base_cost_lkr'].min():,.0f}")
print(f"   Max cost: LKR {df['total_base_cost_lkr'].max():,.0f}")
print(f"\n   Boat type distribution:")
for boat in df['boat_type'].value_counts().items():
    print(f"     {boat[0]}: {boat[1]:,} trips")

print(f"\n🚀 Ready to train ML model!")
print(f"   Run: python complete_ml_training_pipeline.py")
