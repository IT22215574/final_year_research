"""
Fuel baseline rates for different Sri Lankan fishing boat types.

Based on two separate fuel concepts:
- Engine-hour fuel: L/HP/hour, used with fishing/idling hours and load factor.
- Route fuel: L/km, used with trip distance.
"""

# Boat type route fuel baselines (liters per km).
#
# These are distance-rate fallbacks for route/travel fuel. They must not be
# mixed with L/HP/hour values. Engine-hour fuel is configured separately below.
BOAT_TYPE_FUEL_BASELINES = {
    # Backend boat types (current system)
    "One Day Fishing Boat (30ft)": 0.55,  # ~40 HP, gasoline
    "Flat Bottom Boat (18-19ft)": 0.35,   # ~20 HP, gasoline
    "Canoe": 0.25,                         # ~12 HP, gasoline
    "55 Feet Long-line Fishing Trawler": 1.8,  # ~320 HP, diesel
    "Multi-day Fishing Vessel": 0.85,      # ~65 HP, diesel
    "Traditional Fishing Boat": 0.25,      # ~15 HP, gasoline/paddle
    
    # ML training data types (for compatibility)
    "IMUI": 2.25,  # Indigenous Multi-Day Ultra Light
    "IDAT": 2.00,  # Indigenous Day Boats
    "OFRP": 0.62,  # Offshore Fishing Vessel
    "MTRP": 0.43,  # Multi-day Trawler/Boat
    "Fiber Boat (small)": 0.42,   # 25-35 HP, gasoline
    "Fiber Boat (medium)": 0.58,  # 35-50 HP, gasoline
    "One Day Boat": 0.65,         # 40-60 HP, mixed
    "Multi Day Boat": 0.82,        # 50-80 HP, diesel
    "Longliner": 1.2,              # 60-100 HP, diesel
    
    # Mobile UI types (for future compatibility)
    "55-59.5 FT": 1.8,    # Large trawler, diesel
    "42 FT": 0.75,        # Yanmar diesel
    "30 FT": 0.55,        # Yamaha Enduro, gasoline
    "18-19.5 FT Flat": 0.35,  # Small flat bottom
    "Canoes/Wallam": 0.25,     # Traditional small
    
    # Generic fallbacks
    "small": 0.35,
    "medium": 0.65,
    "large": 1.2,
    "general": 0.60,  # Default if type unknown
}

# Boat type engine-hour fuel baselines (liters per HP per hour).
# These are used for fishing/idling/working-time fuel.
BOAT_TYPE_HP_HOUR_RATES = {
    "IMUI": 0.28,
    "IDAT": 0.30,
    "OFRP": 0.28,
    "MTRP": 0.25,
    "general": 0.27,
}

# Friendly boat type names for display
BOAT_TYPE_DISPLAY_NAMES = {
    "One Day Fishing Boat (30ft)": "One Day Boat (30ft)",
    "Flat Bottom Boat (18-19ft)": "Flat Bottom Boat",
    "Canoe": "Traditional Canoe",
    "55 Feet Long-line Fishing Trawler": "Long-line Trawler (55ft)",
    "Multi-day Fishing Vessel": "Multi-day Vessel",
    "Traditional Fishing Boat": "Traditional Craft",
    
    "Fiber Boat (small)": "Small FRP Boat",
    "Fiber Boat (medium)": "Medium FRP Boat",
    "IMUI": "Indigenous Multi-Day Ultra Light",
    "IDAT": "Inboard Day Boat",
    "OFRP": "Outboard FRP Boat",
    "MTRP": "Multi-day Trawler",
    "One Day Boat": "One Day Fishing Boat",
    "Multi Day Boat": "Multi-day Boat",
    "Longliner": "Long-liner",
    
    "55-59.5 FT": "Large Trawler (55-59.5ft)",
    "42 FT": "Medium Vessel (42ft)",
    "30 FT": "Day Boat (30ft)",
    "18-19.5 FT Flat": "Flat Bottom Boat (18-19.5ft)",
    "Canoes/Wallam": "Canoe/Wallam",
    
    "small": "Small Boat",
    "medium": "Medium Boat",
    "large": "Large Boat",
    "general": "General Fishing Boat",
}


def get_boat_fuel_baseline(boat_type: str) -> float:
    """
    Get fuel consumption baseline rate per km for a given boat type.
    
    Args:
        boat_type: Boat type identifier
        
    Returns:
        Fuel consumption rate in liters per kilometer
        
    Example:
        >>> get_boat_fuel_baseline("One Day Fishing Boat (30ft)")
        0.55
    """
    if not boat_type:
        return BOAT_TYPE_FUEL_BASELINES["general"]
    
    # Try exact match first
    if boat_type in BOAT_TYPE_FUEL_BASELINES:
        return BOAT_TYPE_FUEL_BASELINES[boat_type]
    
    # Try case-insensitive match
    boat_type_lower = boat_type.lower()
    for key, value in BOAT_TYPE_FUEL_BASELINES.items():
        if key.lower() == boat_type_lower:
            return value
    
    # Try partial match (for flexibility)
    for key, value in BOAT_TYPE_FUEL_BASELINES.items():
        if key.lower() in boat_type_lower or boat_type_lower in key.lower():
            return value
    
    # Fallback to general rate
    print(f"WARNING: Unknown boat type '{boat_type}', using general baseline")
    return BOAT_TYPE_FUEL_BASELINES["general"]


def get_boat_hp_hour_rate(boat_type: str) -> float:
    """
    Get engine-hour fuel rate for a given boat type.

    Args:
        boat_type: Boat type identifier

    Returns:
        Fuel consumption rate in liters per HP per hour
    """
    if not boat_type:
        return BOAT_TYPE_HP_HOUR_RATES["general"]

    if boat_type in BOAT_TYPE_HP_HOUR_RATES:
        return BOAT_TYPE_HP_HOUR_RATES[boat_type]

    boat_type_lower = boat_type.lower()
    for key, value in BOAT_TYPE_HP_HOUR_RATES.items():
        if key.lower() == boat_type_lower:
            return value

    return BOAT_TYPE_HP_HOUR_RATES["general"]


def get_boat_type_name(boat_type: str) -> str:
    """
    Get friendly display name for a boat type.
    
    Args:
        boat_type: Boat type identifier
        
    Returns:
        Friendly display name
        
    Example:
        >>> get_boat_type_name("One Day Fishing Boat (30ft)")
        "One Day Boat (30ft)"
    """
    if not boat_type:
        return "Unknown Boat Type"
    
    # Try exact match first
    if boat_type in BOAT_TYPE_DISPLAY_NAMES:
        return BOAT_TYPE_DISPLAY_NAMES[boat_type]
    
    # Try case-insensitive match
    boat_type_lower = boat_type.lower()
    for key, value in BOAT_TYPE_DISPLAY_NAMES.items():
        if key.lower() == boat_type_lower:
            return value
    
    # Fallback to original boat type
    return boat_type


def get_all_boat_types():
    """
    Get list of all supported boat types with their baselines.
    
    Returns:
        List of dictionaries with boat type info
    """
    result = []
    for boat_type, fuel_rate in BOAT_TYPE_FUEL_BASELINES.items():
        result.append({
            "type": boat_type,
            "displayName": get_boat_type_name(boat_type),
            "fuelPerKm": fuel_rate,
        })
    return result


def calculate_baseline_fuel(boat_type: str, distance_km: float, engine_hp: float = None, fishing_hours: float = 0) -> float:
    """
    Calculate baseline fuel consumption for a trip.
    
    Args:
        boat_type: Type of boat
        distance_km: Total distance to travel
        engine_hp: Engine horsepower (optional, for fishing fuel)
        fishing_hours: Hours spent fishing (optional)
        
    Returns:
        Estimated fuel consumption in liters
    """
    # Distance-based fuel
    fuel_per_km = get_boat_fuel_baseline(boat_type)
    distance_fuel = distance_km * fuel_per_km
    
    # Fishing/idling engine-hour fuel (if engine HP provided)
    fishing_fuel = 0
    if engine_hp and fishing_hours:
        hp_hour_rate = get_boat_hp_hour_rate(boat_type)
        # Fishing/idling rarely uses full rated HP continuously.
        engine_load_factor = 0.35
        fishing_fuel = engine_hp * fishing_hours * hp_hour_rate * engine_load_factor
    
    return distance_fuel + fishing_fuel


# For testing
if __name__ == "__main__":
    print("🧪 Testing boat fuel baselines...")
    
    test_types = [
        "One Day Fishing Boat (30ft)",
        "Canoe",
        "55 Feet Long-line Fishing Trawler",
        "Fiber Boat (small)",
        "unknown_type",
    ]
    
    for boat_type in test_types:
        baseline = get_boat_fuel_baseline(boat_type)
        name = get_boat_type_name(boat_type)
        print(f"  {boat_type:40} → {baseline:5.2f} L/km | Display: {name}")
    
    print("\n✅ All boat types loaded successfully!")
    print(f"   Total boat types supported: {len(BOAT_TYPE_FUEL_BASELINES)}")
