type BuildCostBreakdownParams = {
  predictedFuelCost: number;
  baseOperationalCost: number;
  externalCostTotal: number;
};

export function buildCostBreakdown({
  predictedFuelCost,
  baseOperationalCost,
  externalCostTotal,
}: BuildCostBreakdownParams) {
  const fuelCost = Number(predictedFuelCost || 0);
  const operationalCost = Number(baseOperationalCost || 0);
  const externalCosts = Number(externalCostTotal || 0);

  const grandTotal = fuelCost + operationalCost + externalCosts;

  return {
    fuelCost,
    operationalCost,
    externalCostTotal: externalCosts,
    grandTotal,
  };
}
