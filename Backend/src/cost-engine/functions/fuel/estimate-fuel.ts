export type FuelBaseInput = {
  predictedDistanceKm: number;
  wsi: number;
  speed: number;
  efficiencyFactor: number;
};

export type FuelBaseResult = {
  fuelPerKmBase: number;
  fuelBase: number;
  weatherMultiplier: number;
  predictedFuelLiters: number;
};

export function estimateFuelBase(input: FuelBaseInput): FuelBaseResult {
  const fuelPerKmBase = 0.5;
  const fuelBase = input.predictedDistanceKm * fuelPerKmBase;
  const weatherMultiplier = 1 + input.wsi * 0.5;

  const predictedFuelLiters =
    fuelBase * weatherMultiplier * input.efficiencyFactor;

  return {
    fuelPerKmBase,
    fuelBase,
    weatherMultiplier,
    predictedFuelLiters,
  };
}

export function applySpeedAdjustment(predictedFuelLiters: number, speed: number) {
  const baseSpeed = 10;
  const speedAdjPerKnot = 0.03;

  const speedFactor = 1 + (speed - baseSpeed) * speedAdjPerKnot;
  const clampedSpeedFactor = Math.max(0.7, Math.min(1.4, speedFactor));

  return {
    speedFactor: clampedSpeedFactor,
    predictedFuelLiters: predictedFuelLiters * clampedSpeedFactor,
  };
}

export function applyModeFuelAdjustment(
  predictedFuelLiters: number,
  fuelMultiplier: number,
) {
  return predictedFuelLiters * fuelMultiplier;
}