/**
 * Utility to transform sample trip data into API-compatible format
 *
 * This helps convert external trip data (from datasets, Excel, etc.)
 * into the format expected by the predict-and-save API
 */

export interface SampleTripData {
  boatSpec: {
    boatName: string;
    boatType: string;
    engineHorsePower: number;
    boatLength: number;
    boatWidth: number;
    boatValue: number;
    fuelEfficiencyFactor: number;
    engineDegradationFactor: number;
    averageFuelPredictionError: number;
    fuelTankCapacityLiters: number;
    maxCrewCapacity: number;
  };
  tripParameters: {
    boatId: string;
    distanceKm: number;
    averageSpeedKmh: number;
    fishingHours: number;
    crewSize: number;
    fuelPricePerLiter: number;
    expectedFishPricePerKg: number;
    expectedCatchKg: number;
    predictedCatchKg: number;
  };
  weather: {
    windSpeedKmh: number;
    waveHeightMeters: number;
    rainLevel: number;
  };
  externalCosts: {
    iceCost: number;
    baitCost: number;
    crewFoodCost: number;
    portFee: number;
    gearMaintenanceCost: number;
    miscellaneousCost: number;
  };
}

export interface PredictAndSavePayload {
  boatId: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  windSpeed: number;
  waveHeight: number;
  fuelPrice: number;
  expectedCatch: number;
  marketPrice: number;
  fishingHours: number;
  numberOfDays: number;
  crewCount: number;
  speed: number;
  mode?: 'island' | 'international';
}

/**
 * Generate realistic Sri Lankan fishing coordinates based on distance
 * Default starting point: Colombo harbor area (6.9271° N, 79.8612° E)
 */
function generateFishingCoordinates(distanceKm: number): {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
} {
  // Common Sri Lankan fishing departure points
  const startPoints = [
    { name: 'Colombo', lat: 6.9271, lon: 79.8612 },
    { name: 'Negombo', lat: 7.2008, lon: 79.8358 },
    { name: 'Chilaw', lat: 7.5759, lon: 79.7951 },
    { name: 'Trincomalee', lat: 8.5874, lon: 81.2152 },
    { name: 'Galle', lat: 6.0535, lon: 80.221 },
  ];

  // Use first departure point for simplicity (can randomize)
  const start = startPoints[0];

  // Calculate end point based on distance
  // Assume mostly westward (into ocean) fishing
  const kmPerDegreeLat = 111.0;
  const kmPerDegreeLon = 111.0 * Math.cos((start.lat * Math.PI) / 180);

  // Direction: mostly westward with slight variation
  const angle = -90 + (Math.random() * 60 - 30); // -120° to -60° (mostly west)
  const angleRad = (angle * Math.PI) / 180;

  const latDiff = (distanceKm * Math.sin(angleRad)) / kmPerDegreeLat;
  const lonDiff = (distanceKm * Math.cos(angleRad)) / kmPerDegreeLon;

  return {
    startLat: start.lat,
    startLon: start.lon,
    endLat: start.lat + latDiff,
    endLon: start.lon + lonDiff,
  };
}

/**
 * Estimate number of days based on fishing hours
 */
function estimateNumberOfDays(fishingHours: number): number {
  if (fishingHours <= 10) return 1;
  if (fishingHours <= 20) return 2;
  if (fishingHours <= 36) return 3;
  return Math.ceil(fishingHours / 12);
}

/**
 * Transform sample trip data to API payload format
 */
export function transformSampleToPayload(
  sample: SampleTripData,
): PredictAndSavePayload {
  const coords = generateFishingCoordinates(sample.tripParameters.distanceKm);
  const numberOfDays = estimateNumberOfDays(sample.tripParameters.fishingHours);

  return {
    boatId: sample.tripParameters.boatId,
    startLat: coords.startLat,
    startLon: coords.startLon,
    endLat: coords.endLat,
    endLon: coords.endLon,
    windSpeed: sample.weather.windSpeedKmh,
    waveHeight: sample.weather.waveHeightMeters,
    fuelPrice: sample.tripParameters.fuelPricePerLiter,
    expectedCatch: sample.tripParameters.expectedCatchKg,
    marketPrice: sample.tripParameters.expectedFishPricePerKg,
    fishingHours: sample.tripParameters.fishingHours,
    numberOfDays,
    crewCount: sample.tripParameters.crewSize,
    speed: sample.tripParameters.averageSpeedKmh,
    mode: sample.tripParameters.distanceKm > 80 ? 'international' : 'island',
  };
}

/**
 * Transform array of samples
 */
export function transformSamplesToPayloads(
  samples: SampleTripData[],
): PredictAndSavePayload[] {
  return samples.map(transformSampleToPayload);
}

/**
 * Extract actual data for log-actual endpoint
 */
export function extractActualData(sample: SampleTripData) {
  // Since sample data is "predicted", we'll simulate actual values
  // In real scenario, you'd have separate actual data

  const predictedFuel = sample.tripParameters.distanceKm * 2.5; // Rough estimate
  const actualFuelVariation = 1 + (Math.random() * 0.2 - 0.1); // ±10% variation

  return {
    actualFuelLiters: Math.round(predictedFuel * actualFuelVariation * 10) / 10,
    actualCatchKg:
      sample.tripParameters.predictedCatchKg + (Math.random() * 10 - 5),
    actualRevenue:
      sample.tripParameters.predictedCatchKg *
      sample.tripParameters.expectedFishPricePerKg,
    actualNotes: `Sample trip from ${sample.boatSpec.boatName}`,
  };
}

/**
 * Example usage:
 *
 * const sampleTrips: SampleTripData[] = [...]; // Your trip data
 *
 * // Transform to API format
 * const payloads = transformSamplesToPayloads(sampleTrips);
 *
 * // Use for prediction
 * for (const payload of payloads) {
 *   const result = await predictAndSave(payload);
 *   console.log('Trip created:', result.trip._id);
 * }
 *
 * // Later, log actuals
 * for (const sample of sampleTrips) {
 *   const actualData = extractActualData(sample);
 *   await logActual(tripId, actualData);
 * }
 */
