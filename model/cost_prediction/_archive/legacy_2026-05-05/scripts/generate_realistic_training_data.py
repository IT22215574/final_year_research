#!/usr/bin/env python3
"""
Generate realistic training data for Sri Lankan small-scale fishing boats
Based on actual fuel consumption rates: 0.15-0.18 L/HP-hr
"""

import pandas as pd
import numpy as np
import os

# Realistic Sri Lankan fishing boat specifications
BOAT_TYPES = {
    'Fiber Boat (small)': {'hp_range': (25, 35), 'speed_range': (8, 12)},
    'Fiber Boat (medium)': {'hp_range': (35, 50), 'speed_range': (10, 14)},
    'One Day Boat': {'hp_range': (40, 60), 'speed_range': (10, 15)},
    'Multi Day Boat': {'hp_range': (50, 80), 'speed_range': (12, 18)},
    'Longliner': {'hp_range': (60, 100), 'speed_range': (12, 16)},
}

def calculate_realistic_fuel(engine_hp, travel_hours, fishing_hours, weather_severity):
    """
    Calculate realistic fuel consumption based on physics
    
    Fuel consumption rate for diesel marine engines:
    - Cruising: 0.15-0.18 L/HP-hr (industry standard)
    - Fishing (idling/slow): 0.08-0.12 L/HP-hr
    - Weather impact: +5-25% in rough conditions
    """
    
    # Base consumption rates (L/HP-hr)
    cruise_rate = np.random.uniform(0.15, 0.18)  # Cruising to/from fishing grounds
    fishing_rate = np.random.uniform(0.08, 0.12)  # While fishing (slower/idling)
    
    # Calculate base fuel
    cruise_fuel = engine_hp * travel_hours * cruise_rate
    fishing_fuel = engine_hp * fishing_hours * fishing_rate
    base_fuel = cruise_fuel + fishing_fuel
    
    # Weather impact (rough seas increase consumption)
    weather_multiplier = 1.0 + (weather_severity * 0.25)  # Up to +25% in severe weather
    
    # Engine efficiency variation (±10% for different maintenance states)
    efficiency_variance = np.random.uniform(0.9, 1.1)
    
    total_fuel = base_fuel * weather_multiplier * efficiency_variance
    
    # Add realistic noise (±5%)
    noise = np.random.uniform(0.95, 1.05)
    return total_fuel * noise

def generate_trip_data(n_samples=2000):
    """Generate realistic fishing trip data"""
    
    data = []
    
    for _ in range(n_samples):
        # Select random boat type
        boat_type = np.random.choice(list(BOAT_TYPES.keys()))
        boat_spec = BOAT_TYPES[boat_type]
        
        # Boat specifications
        engine_hp = np.random.uniform(*boat_spec['hp_range'])
        speed = np.random.uniform(*boat_spec['speed_range'])  # knots
        
        # Trip parameters
        distance_km = np.random.uniform(5, 200)  # 5-200 km (coastal to offshore)
        fishing_hours = np.random.uniform(2, 24)  # 2-24 hours fishing
        
        # Calculate travel time (round trip)
        speed_kmh = speed * 1.852  # Convert knots to km/h
        travel_hours = (distance_km * 2) / speed_kmh  # Round trip
        
        # Weather severity (0.0 = calm, 1.0 = severe)
        weather_severity = np.random.beta(2, 5)  # Biased toward calmer weather
        
        # Calculate realistic fuel consumption
        fuel_liters = calculate_realistic_fuel(
            engine_hp, 
            travel_hours, 
            fishing_hours, 
            weather_severity
        )
        
        data.append({
            'distanceKm': round(distance_km, 2),
            'speed': round(speed, 1),
            'engineHP': round(engine_hp, 1),
            'fishingHours': round(fishing_hours, 2),
            'weatherSeverityIndex': round(weather_severity, 3),
            'fuelUsedLiters': round(fuel_liters, 2),
            'boatType': boat_type,
            'travelHours': round(travel_hours, 2)
        })
    
    return pd.DataFrame(data)

def main():
    print("🔧 Generating realistic Sri Lankan fishing boat training data...")
    
    # Generate data
    df = generate_trip_data(n_samples=2000)
    
    # Statistics
    print(f"\n📊 Generated {len(df)} training samples")
    print(f"\nEngine HP range: {df['engineHP'].min():.1f} - {df['engineHP'].max():.1f}")
    print(f"Distance range: {df['distanceKm'].min():.1f} - {df['distanceKm'].max():.1f} km")
    print(f"Fuel range: {df['fuelUsedLiters'].min():.1f} - {df['fuelUsedLiters'].max():.1f} L")
    print(f"Fuel average: {df['fuelUsedLiters'].mean():.1f} L")
    
    # Sample check for 45 HP, 35 km trips
    print(f"\n✅ Sample check: 45 HP boats, 30-40 km range:")
    sample = df[
        (df['engineHP'] >= 40) & (df['engineHP'] <= 50) &
        (df['distanceKm'] >= 30) & (df['distanceKm'] <= 40)
    ][['engineHP', 'distanceKm', 'fishingHours', 'fuelUsedLiters']].head(10)
    print(sample)
    print(f"\nAverage fuel for this range: {sample['fuelUsedLiters'].mean():.1f} L")
    print("Expected: 18-35 L (depends on fishing hours)")
    
    # Save to CSV
    output_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 
        'data', 
        'trip_cost_dataset_realistic_srilanka.csv'
    )
    df.to_csv(output_path, index=False)
    print(f"\n💾 Saved to: {output_path}")
    
    return output_path

if __name__ == "__main__":
    main()
