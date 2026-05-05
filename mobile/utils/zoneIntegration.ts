/**
 * Zone Integration Utilities
 * Bridges FishZoneMap data with TripPlanner
 */

import useFishingZoneStore, { MapFishZone } from "@/stores/fishingZoneStore";

/**
 * Hook to select a zone from the map and integrate with TripPlanner
 * Usage:
 * 1. User clicks "Select Zone from Map" in TripPlanner
 * 2. Navigates to FishZoneMap
 * 3. User selects a zone on the map
 * 4. Call this function with the zone data
 * 5. Zone is added to store and available in TripPlanner
 */
export const useZoneIntegration = () => {
  const { addMapZone, selectedZones, clearZones } = useFishingZoneStore();

  /**
   * Add a real zone from FishZoneMap to the trip planner
   * @param mapZone - Zone data from FishZoneMap API
   */
  const selectZoneFromMap = (mapZone: MapFishZone) => {
    // Add the map zone to the store
    // This will make it available in TripPlanner automatically
    addMapZone(mapZone);
  };

  /**
   * Replace current zone with a new one from the map
   * Useful if user wants to change their zone selection
   * @param mapZone - Zone data from FishZoneMap API
   */
  const replaceZoneFromMap = (mapZone: MapFishZone) => {
    // Clear previous zones and add new one
    clearZones();
    addMapZone(mapZone);
  };

  /**
   * Get the current selected zone details
   * Returns null if no zone selected
   */
  const getCurrentZone = () => {
    return selectedZones.length > 0 ? selectedZones[0] : null;
  };

  /**
   * Check if a zone with these coordinates already exists
   */
  const hasZoneAtCoordinates = (lat: number, lon: number): boolean => {
    return selectedZones.some(
      (z) =>
        Math.abs(z.latitude - lat) < 0.001 &&
        Math.abs(z.longitude - lon) < 0.001,
    );
  };

  return {
    selectZoneFromMap,
    replaceZoneFromMap,
    getCurrentZone,
    hasZoneAtCoordinates,
    selectedZones,
    clearZones,
  };
};

/**
 * Format zone details for display in TripPlanner
 */
export const formatZoneInfo = (zone: any): string => {
  return `
Zone at (${zone.latitude.toFixed(3)}°, ${zone.longitude.toFixed(3)}°)
Fish Probability: ${zone.density} (${((zone.fish_probability || 0) * 100).toFixed(1)}%)
Sea Surface Temp: ${zone.sst?.toFixed(1) || "N/A"}°C
Chlorophyll-a: ${zone.chlor_a?.toFixed(3) || "N/A"} mg/m³
Depth: ${zone.depth}
  `.trim();
};

/**
 * Get zone coordinates for weather/routing services
 */
export const getZoneCoordinates = (zone: any) => {
  return {
    lat: zone.latitude,
    lon: zone.longitude,
  };
};
