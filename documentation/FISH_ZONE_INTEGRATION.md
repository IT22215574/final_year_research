# Fish Zone Integration Guide

## Overview

This guide explains how the FishZoneMap component integrates with TripPlanner to provide real fish zone data for trip cost predictions.

## Architecture

### Components Involved

1. **FishZoneMap.tsx** - Displays interactive map with fish zone predictions
2. **TripPlanner.tsx** - Trip planning and cost prediction interface
3. **fishingZoneStore.ts** - Zustand store managing zone state across the app
4. **zoneIntegration.ts** - Utilities for converting and managing zone data

### Data Flow

```
FishZoneMap (selects zone)
    ↓
MapFishZone data (lat, lon, sst, chlor_a, fish_probability, bathymetry)
    ↓
convertMapZoneToFishingZone() helper
    ↓
useFishingZoneStore.addMapZone()
    ↓
TripPlanner (reads selectedZones from store)
    ↓
Weather/Cost calculations using real zone data
```

## How to Use

### For Users

1. **From TripPlanner:**
   - Click "Select Zone from Map" button
   - This navigates to FishZoneMap
   - Select a zone by clicking on a marker
2. **On FishZoneMap:**
   - Click a marker to view zone details
   - Details show: coordinates, fish probability, SST, chlorophyll, depth
3. **Returning to TripPlanner:**
   - The selected zone is now active
   - Weather data automatically updates
   - Cost predictions use real zone coordinates

### For Developers

#### Add Zone from Map Code

To programmatically add a zone from the map:

```typescript
import { useZoneIntegration } from "@/utils/zoneIntegration";

const { selectZoneFromMap, replaceZoneFromMap } = useZoneIntegration();

// Add zone (keeps existing zones if needed)
const mapZone: MapFishZone = {
  lat: 7.5,
  lon: 81.2,
  sst: 28.5,
  chlor_a: 0.45,
  water_u: 0.2,
  water_v: 0.1,
  fish_zone: 3,
  fish_probability: 0.75,
  bathymetry: 250,
};

selectZoneFromMap(mapZone);

// Or replace all zones with new one
replaceZoneFromMap(mapZone);
```

#### Zone Data Structure

```typescript
interface MapFishZone {
  lat: number; // Latitude (e.g., 7.5)
  lon: number; // Longitude (e.g., 81.2)
  sst: number; // Sea Surface Temperature (°C)
  chlor_a: number; // Chlorophyll-a concentration (mg/m³)
  water_u: number; // Water velocity U component (m/s)
  water_v: number; // Water velocity V component (m/s)
  fish_zone: number; // Zone identifier
  fish_probability: number; // Probability 0-1 (0.75 = 75%)
  bathymetry: number; // Ocean depth (meters)
}
```

#### Using Zone Data in TripPlanner

```typescript
import { useZoneIntegration, formatZoneInfo } from "@/utils/zoneIntegration";

const { selectedZones, getCurrentZone } = useZoneIntegration();

// Get current zone
const currentZone = getCurrentZone();

if (currentZone) {
  // Use zone coordinates
  const { lat, lon } = currentZone;

  // Get formatted info for display
  const info = formatZoneInfo(currentZone);

  // Access zone details
  console.log("Fish Probability:", currentZone.fish_probability);
  console.log("Depth:", currentZone.depth);
  console.log("Temperature:", currentZone.sst);
}
```

## Integration Points

### FishZoneMap → TripPlanner Integration

When a user selects a zone on FishZoneMap:

1. **Currently:** Zone is stored in FishZoneMap's local `selectedZone` state
2. **Needed:** Add this line in FishZoneMap's zone selection handler:

```typescript
// In FishZoneMap.tsx, after handleMarkerPress()
const zoneStore = useFishingZoneStore();

const handleMarkerPress = (zone: FishZone) => {
  setSelectedZone(zone);

  // 🔧 ADD THIS: Store zone for TripPlanner
  // Uncomment when ready to integrate:
  // const mapZone: MapFishZone = {
  //   lat: zone.lat,
  //   lon: zone.lon,
  //   sst: zone.sst,
  //   chlor_a: zone.chlor_a,
  //   water_u: zone.water_u,
  //   water_v: zone.water_v,
  //   fish_zone: zone.fish_zone,
  //   fish_probability: zone.fish_probability,
  //   bathymetry: zone.bathymetry,
  // };
  // zoneStore.addMapZone(mapZone);
};
```

### TripPlanner Integration (Already Configured)

TripPlanner now has:

- ✅ Import `useZoneIntegration` hook
- ✅ "Select Zone from Map" button
- ✅ Navigation to FishZoneMap
- ✅ Automatic zone data retrieval from store
- ✅ Weather calculations using real coordinates

## Features

### Real Zone Data Advantages

1. **Accurate Location**: Uses actual predicted fish zones from oceanographic data
2. **Environmental Factors**: Includes:
   - Sea Surface Temperature (SST)
   - Chlorophyll-a concentration (food availability)
   - Ocean depth (bathymetry)
   - Fish probability percentage
3. **Automatic Calculations**:
   - Weather fetching for the actual zone
   - Distance calculations to real coordinates
   - Better cost predictions

### Zone Selection Smart Features

- **Duplicate Prevention**: Won't add same zone twice
- **Coordinate Matching**: Detects zones within 0.001° precision
- **Probability Color Coding**: Visual indication of fish probability
- **Quick Clear**: "Clear" button to remove zones and start over

## Troubleshooting

### Zone Not Showing After Selection

- Check: Is TripPlanner using `useFishingZoneStore()`?
- Check: Is FishZoneMap calling `addMapZone()` when selecting?

### Weather Data Not Updating

- Check: selectedZones has valid latitude/longitude
- Check: getWeatherForZones is receiving correct coordinates

### Coordinates Seem Wrong

- Ensure latitude is between -90 and 90 (negative = South)
- Ensure longitude is between -180 and 180 (negative = West)
- Sri Lanka EEZ: ~6-10°N, ~79-85°E

## Files Modified

- ✅ `mobile/stores/fishingZoneStore.ts` - Added MapFishZone interface, addMapZone action
- ✅ `mobile/utils/zoneIntegration.ts` - New integration utilities
- ✅ `mobile/app/(root)/(tabs)/fishtripcost/components/TripPlanner.tsx` - Added map navigation buttons

## Files Not Modified (Per Request)

- ❌ `mobile/app/(root)/(tabs)/FishZoneMap.tsx` - No changes made to preserve existing functionality

---

**Integration Status**: Ready for FishZoneMap to call `useZoneIntegration().selectZoneFromMap(zone)` when a user selects a zone marker.
