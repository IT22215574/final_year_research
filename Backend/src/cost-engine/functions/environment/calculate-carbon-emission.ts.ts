import { carbonMetrics } from '../../../common/utils/carbon.util';

export type CarbonCalculationInput = {
  adjustedFuelLiters: number;
  expectedCatch: number;
};

export type CarbonCalculationResult = {
  emissionFactor: number;
  carbonEmissionKg: number;
  carbonPerKgCatch: number;
};

export function calculateCarbonEmission(
  input: CarbonCalculationInput,
): CarbonCalculationResult {
  const emissionFactor = 2.68;

  const { carbonEmissionKg, carbonPerKgCatch } = carbonMetrics(
    input.adjustedFuelLiters,
    input.expectedCatch,
  );

  return {
    emissionFactor,
    carbonEmissionKg,
    carbonPerKgCatch,
  };
}
