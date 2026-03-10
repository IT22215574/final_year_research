/**
 * Trip Type Definition
 * 
 * Represents a fishing trip with predicted values (from ML/DATCIE),
 * actual values (user logged), and comparison metrics (backend calculated).
 * 
 * Aligned with backend Trip schema.
 */
export interface Trip {
  _id: string;
  userId: string;
  boatId?: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';

  // Timestamps
  departureTime?: string;
  returnTime?: string;
  createdAt?: string;
  updatedAt?: string;

  // ==================== PREDICTED VALUES (from ML/DATCIE) ====================
  
  /** Predicted fuel consumption in liters */
  predictedFuelLiters?: number;
  
  /** Predicted total trip cost */
  predictedTotalCost?: number;
  
  /** Predicted fuel cost component */
  predictedFuelCost?: number;
  
  /** Predicted operational cost (crew, ice, etc.) */
  predictedOperationalCost?: number;
  
  /** Predicted total external costs */
  predictedExternalCostTotal?: number;
  
  /** Predicted distance in kilometers */
  predictedDistanceKm?: number;
  
  /** Risk category (low/medium/high) */
  riskCategory?: string;
  
  /** Profitability probability (0-1) */
  profitabilityProbability?: number;
  
  /** Weather severity index */
  weatherSeverityIndex?: number;
  
  /** Economic stress index */
  economicStressIndex?: number;
  
  /** DATCIE optimization recommendations */
  optimizationRecommendations?: any[];

  // ==================== ACTUAL VALUES (user logged) ====================
  
  /** Actual fuel consumed in liters */
  actualFuelLiters?: number;
  
  /** Actual catch weight in kg */
  actualCatchKg?: number;
  
  /** Actual fuel cost spent */
  actualFuelCost?: number;
  
  /** Actual operational cost spent */
  actualOperationalCost?: number;
  
  /** Actual external costs breakdown */
  actualExternalCosts?: Array<{
    category: string;
    amount: number;
    notes?: string;
  }>;
  
  /** Actual revenue from catch */
  actualRevenue?: number;
  
  /** Additional notes from fisher */
  actualNotes?: string;

  // ==================== COMPARISON METRICS (backend calculated) ====================
  
  // Fuel comparison
  /** Absolute fuel error in liters */
  fuelErrorLiters?: number;
  
  /** Fuel error as percentage of predicted */
  fuelErrorPercent?: number;
  
  /** Fuel variance: actual - predicted (negative = used less, positive = used more) */
  fuelVarianceLiters?: number;
  
  /** True if fuel error is within threshold (≤15%) */
  isFuelPredictionAccurate?: boolean;

  // Cost comparison
  /** Absolute cost error in currency */
  costErrorAmount?: number;
  
  /** Cost error as percentage of predicted */
  costErrorPercent?: number;
  
  /** Cost variance: actual - predicted */
  costVarianceAmount?: number;
  
  /** True if cost error is within threshold (≤15%) */
  isCostPredictionAccurate?: boolean;

  // Fuel cost specific
  /** Fuel cost error amount */
  fuelCostErrorAmount?: number;
  
  /** Fuel cost error percentage */
  fuelCostErrorPercent?: number;

  // Meta
  /** True if trip has both predicted and actual values for comparison */
  comparisonEligible?: boolean;
  
  /** Accuracy threshold used (typically 15) */
  accuracyThresholdUsed?: number;
  
  /** When comparison metrics were calculated */
  comparisonCalculatedAt?: string;

  // ==================== ✅ NEW: BOAT TYPE-BASED NORMALIZED FUEL METRICS ====================
  
  /** Expected fuel consumption based on boat type baseline (liters) */
  expectedFuelForBoatType?: number;
  
  /** Normalized variance as percentage of boat type baseline */
  normalizedVariancePercent?: number;
  
  /** Efficiency score (0-150): How efficiently this boat performed vs its type average */
  efficiencyScore?: number;
  
  /** Contextual rating: 'excellent' | 'good' | 'fair' | 'poor' */
  varianceRating?: string;
  
  /** ML-adjusted expected fuel for this specific boat (liters) */
  mlAdjustedExpectedFuel?: number;
  
  /** ML variance percentage from learned patterns */
  mlVariancePercent?: number;
  
  /** Boat type code used for normalization (e.g., 'IMUL', 'OFRP') */
  boatTypeUsedForMetrics?: string;

  // Legacy fields (backward compatibility)
  distanceKm?: number;
  fuelUsedLiters?: number;
}

/**
 * Dashboard Statistics
 * 
 * Aggregated metrics calculated by backend TripMetricsService.
 * This is the SINGLE SOURCE OF TRUTH for all dashboard stats.
 * 
 * Frontend should NEVER calculate these - only display them.
 */
export interface DashboardStats {
  // ==================== BASIC COUNTS ====================
  
  /** Total number of trips (all statuses) */
  totalTrips: number;
  
  /** Number of completed trips */
  completedTrips: number;
  
  /** Number of trips with both predicted and actual values logged */
  predictionsWithActuals: number;

  // ==================== ACCURACY RATES (PRIMARY METRICS) ====================
  
  /** 
   * Fuel prediction accuracy rate
   * Percentage of trips where fuel error ≤ 15%
   * Example: 83 means 83% of predictions were within ±15%
   */
  fuelAccuracyRate: number;
  
  /** 
   * Cost prediction accuracy rate
   * Percentage of trips where cost error ≤ 15%
   */
  costAccuracyRate: number;

  // ==================== AVERAGES ====================
  
  /** Average predicted cost across all trips */
  averagePredictedCost: number;
  
  /** Average actual cost across completed trips with actuals */
  averageActualCost: number;
  
  /** Average fuel error percentage across eligible trips */
  averageFuelErrorPercent: number;
  
  /** Average cost error percentage across eligible trips */
  averageCostErrorPercent: number;

  // ==================== FUEL TOTALS ====================
  
  /** Total predicted fuel across all trips (liters) */
  totalPredictedFuel: number;
  
  /** Total actual fuel consumed (liters) */
  totalActualFuel: number;
  
  /** 
   * Total fuel variance (liters)
   * Negative = used less than predicted
   * Positive = used more than predicted
   * NOT the same as "fuel saved" - may be due to model error
   */
  totalFuelVariance: number;

  // ==================== COST TOTALS ====================
  
  /** Total predicted cost across all trips */
  totalPredictedCost: number;
  
  /** Total actual cost spent */
  totalActualCost: number;
  
  /** 
   * Total cost variance
   * Negative = spent less than predicted
   * Positive = spent more than predicted
   */
  totalCostVariance: number;

  // ==================== OTHER ====================
  
  /** 
   * @deprecated Use totalActualFuel instead
   * Kept for backward compatibility
   */
  totalFuelUsed: number;
  
  /** Total distance traveled across all trips (km) */
  totalDistance: number;

  // ==================== ✅ NEW: BOAT TYPE-BASED NORMALIZED FUEL METRICS ====================
  
  /** Normalized fuel metrics with boat type context */
  normalizedFuelMetrics?: NormalizedFuelMetrics;
}

/**
 * ✅ NEW: Normalized Fuel Metrics
 * Contextual fuel variance metrics based on boat type baselines and ML patterns
 */
export interface NormalizedFuelMetrics {
  /** Average fleet efficiency score (0-150) */
  averageEfficiencyScore: number;
  
  /** Average normalized variance percentage across all trips */
  averageNormalizedVariancePercent: number;
  
  /** Total expected fuel based on boat type baselines (liters) */
  totalExpectedFuelForBoatTypes: number;
  
  /** Overall fleet rating: 'excellent' | 'good' | 'fair' | 'poor' */
  overallVarianceRating: string;
  
  /** Breakdown of metrics by boat type */
  boatTypeBreakdown: Record<string, BoatTypeStats>;
}

/**
 * ✅ NEW: Per Boat Type Statistics
 */
export interface BoatTypeStats {
  /** Human-readable boat type name */
  boatTypeName: string;
  
  /** Number of trips with this boat type */
  count: number;
  
  /** Average efficiency score for this boat type */
  averageEfficiency: number;
  
  /** Average normalized variance for this boat type */
  averageVariance: number;
}

/**
 * Log Actual Values DTO
 * Data sent when user logs actual trip values after completion
 */
export interface LogActualDto {
  actualFuelLiters?: number;
  actualCatchKg?: number;
  actualFuelCost?: number;
  actualOperationalCost?: number;
  actualExternalCosts?: Array<{
    category: string;
    amount: number;
    notes?: string;
  }>;
  actualRevenue?: number;
  actualNotes?: string;
}
