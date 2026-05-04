// Backend/src/common/utils/carbon.util.ts

/**
 * Carbon estimation utilities for DATCIE
 *
 * We estimate CO2 emissions from predicted/actual fuel liters.
 * Assumption (diesel):
 *   CO2 factor ≈ 2.68 kg CO2 per 1 liter of diesel
 *
 * Why 2.68?
 * Commonly used approximation in carbon calculators (diesel combustion).
 *
 * Outputs:
 *  - carbonEmissionKg: total CO2 (kg)
 *  - carbonPerKgCatch: CO2 per 1 kg of catch (kgCO2/kg fish)
 */

export type CarbonEstimate = {
  emissionFactorKgPerLiter: number;
  carbonEmissionKg: number;
  carbonPerKgCatch: number;
};

export const DEFAULT_DIESEL_EMISSION_FACTOR = 2.68;

/**
 * Estimate CO2 emissions from fuel and catch.
 *
 * @param fuelLiters predicted or actual liters used
 * @param expectedCatchKg expected (or actual) catch in kg
 * @param emissionFactorKgPerLiter kg CO2 per liter (default diesel factor)
 */
export function estimateCarbonFromFuel(
  fuelLiters: number,
  expectedCatchKg: number,
  emissionFactorKgPerLiter: number = DEFAULT_DIESEL_EMISSION_FACTOR,
): CarbonEstimate {
  const safeFuel = Number.isFinite(fuelLiters) ? Math.max(0, fuelLiters) : 0;
  const safeCatch = Number.isFinite(expectedCatchKg)
    ? Math.max(0, expectedCatchKg)
    : 0;

  const carbonEmissionKg = safeFuel * emissionFactorKgPerLiter;

  // Avoid divide-by-zero; if catch is 0, we define intensity as 0 (or you can set to carbonEmissionKg)
  const carbonPerKgCatch = safeCatch > 0 ? carbonEmissionKg / safeCatch : 0;

  return {
    emissionFactorKgPerLiter,
    carbonEmissionKg,
    carbonPerKgCatch,
  };
}

/**
 * Convenience helper when your prediction returns liters and you also have expectedCatch.
 * Returns the two values you store in Trip schema:
 *  - carbonEmissionKg
 *  - carbonPerKgCatch
 */
export function carbonMetrics(
  fuelLiters: number,
  expectedCatchKg: number,
): { carbonEmissionKg: number; carbonPerKgCatch: number } {
  const r = estimateCarbonFromFuel(fuelLiters, expectedCatchKg);
  return {
    carbonEmissionKg: r.carbonEmissionKg,
    carbonPerKgCatch: r.carbonPerKgCatch,
  };
}
