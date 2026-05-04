export type PredictionExternalCostItem = {
  name: string;
  category: string;
  amount: number;
  source?: 'manual' | 'preference';
  description?: string;
};

export type BuildPredictionResponseInput = {
  distance: {
    baseDistanceKm: number;
    predictedDistanceKm: number;
    drf: number;
  };
  weather: {
    wsi: number;
    normalized: {
      wind: number;
      wave: number;
      rain: number;
    };
    windSpeed: number;
    waveHeight: number;
    rainMmPerHour?: number;
  };
  economics: {
    fesi: number;
    components: any;
    fuelPrice: number;
    marketPrice: number;
  };
  fuel: {
    predictedFuelLiters: number;
    adjustedFuelLiters: number;
    fuelPerKmBase: number;
    weatherMultiplier: number;
    efficiencyFactor: number;
    speedFactor: number;
    modeMultiplier: number;
  };
  cost: {
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
    baseOperationalCost: number;
    externalCosts: PredictionExternalCostItem[];
    externalCostTotal: number;
  };
  mode?: {
    selectedMode: string;
    adjustments: any;
    tripDurationHours: number;
  };
  carbon: {
    emissionFactor: number;
    carbonEmissionKg: number;
    carbonPerKgCatch: number;
  };
  profitability: {
    expectedRevenue: number;
    profit: number;
    profitabilityProbability: number;
    riskCategory: 'low' | 'medium' | 'high';
  };
  recommendations: string[];
  mlFallback: boolean;

  // ✅ Day 5 addition (append-only, non-breaking)
  modelMetadata?: any;
};

export function buildPredictionResponse(input: BuildPredictionResponseInput) {
  return {
    distance: input.distance,
    weather: input.weather,
    economics: input.economics,
    fuel: input.fuel,
    cost: input.cost,
    mode: input.mode,
    carbon: input.carbon,
    profitability: input.profitability,
    recommendations: input.recommendations,
    mlFallback: input.mlFallback,

    // ✅ THIS LINE FIXES YOUR ERROR + COMPLETES DAY 5
    modelMetadata: input.modelMetadata || null,
  };
}
