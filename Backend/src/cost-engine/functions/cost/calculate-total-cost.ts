export type CostCalculationInput = {
  adjustedFuelLiters: number;
  fuelPrice: number;
  crewCount: number;
  fesi: number;
  mode: string;
  modeAdjustments: {
    crewMultiplier: number;
    equipmentCost: number;
    permitCost: number;
    communicationCost: number;
    riskMultiplier: number;
    insuranceMultiplier: number;
  };
  internationalCosts?: number;
};

export type CostCalculationResult = {
  fuelCost: number;
  crewCost: number;
  equipmentCost: number;
  permitCost: number;
  communicationCost: number;
  internationalCosts: number;
  operationalCost: number;
  riskAdjustedCost: number;
  rawTotalCost: number;
  predictedTotalCost: number;
};

export function calculateTotalCost(
  input: CostCalculationInput,
): CostCalculationResult {
  const fuelCost = input.adjustedFuelLiters * input.fuelPrice;

  const baseCrew = input.crewCount * 5000;
  const crewCost = baseCrew * input.modeAdjustments.crewMultiplier;

  const equipmentCost = input.modeAdjustments.equipmentCost;
  const permitCost = input.modeAdjustments.permitCost;
  const communicationCost = input.modeAdjustments.communicationCost;
  const internationalCosts = input.internationalCosts ?? 0;

  const operationalCost =
    fuelCost +
    crewCost +
    equipmentCost +
    permitCost +
    communicationCost +
    internationalCosts;

  const riskAdjustedCost =
    operationalCost * input.modeAdjustments.riskMultiplier;

  const rawTotalCost = riskAdjustedCost * (1 + input.fesi * 0.15);

  const predictedTotalCost =
    rawTotalCost * input.modeAdjustments.insuranceMultiplier;

  return {
    fuelCost,
    crewCost,
    equipmentCost,
    permitCost,
    communicationCost,
    internationalCosts,
    operationalCost,
    riskAdjustedCost,
    rawTotalCost,
    predictedTotalCost,
  };
}
