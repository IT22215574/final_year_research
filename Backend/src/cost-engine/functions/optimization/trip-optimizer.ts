export type OptimizationCandidate = {
  speed: number;
  score: number;
  prediction: any;
};

export function buildOptimizationResult(results: OptimizationCandidate[]) {
  const sorted = [...results].sort((a, b) => a.score - b.score);
  const best = sorted[0];

  return {
    best: {
      speed: best.speed,
      predictedTotalCost: best.prediction.cost.predictedTotalCost,
      predictedFuelLiters: best.prediction.fuel.adjustedFuelLiters,
      riskCategory: best.prediction.profitability.riskCategory,
      carbonEmissionKg: best.prediction.carbon.carbonEmissionKg,
      carbonPerKgCatch: best.prediction.carbon.carbonPerKgCatch,
      mlFallback: best.prediction.mlFallback,
      recommendations: best.prediction.recommendations,
    },
    candidates: sorted.map((r) => ({
      speed: r.speed,
      predictedTotalCost: r.prediction.cost.predictedTotalCost,
      predictedFuelLiters: r.prediction.fuel.adjustedFuelLiters,
      riskCategory: r.prediction.profitability.riskCategory,
      carbonPerKgCatch: r.prediction.carbon.carbonPerKgCatch,
      mlFallback: r.prediction.mlFallback,
    })),
  };
}