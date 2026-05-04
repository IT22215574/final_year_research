export type RiskCategory = 'low' | 'medium' | 'high';

export type ProfitCalculationInput = {
  expectedCatch: number;
  marketPrice: number;
  predictedTotalCost: number;
};

export type ProfitCalculationResult = {
  expectedRevenue: number;
  profit: number;
  profitabilityProbability: number;
  riskCategory: RiskCategory;
};

export function calculateProfit(
  input: ProfitCalculationInput,
): ProfitCalculationResult {
  const expectedRevenue = input.expectedCatch * input.marketPrice;
  const profit = expectedRevenue - input.predictedTotalCost;

  const profitabilityProbability = profit > 0 ? 0.8 : 0.3;

  const riskCategory: RiskCategory =
    profitabilityProbability >= 0.7
      ? 'low'
      : profitabilityProbability >= 0.45
        ? 'medium'
        : 'high';

  return {
    expectedRevenue,
    profit,
    profitabilityProbability,
    riskCategory,
  };
}
