import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for logging actual trip values after completion
 */
export class LogActualDto {
  @IsOptional()
  @IsNumber()
  actualFuelLiters?: number;

  @IsOptional()
  @IsNumber()
  actualCatchKg?: number;

  @IsOptional()
  @IsNumber()
  actualFuelCost?: number;

  @IsOptional()
  @IsNumber()
  actualOperationalCost?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalCostItemDto)
  actualExternalCosts?: ExternalCostItemDto[];

  @IsOptional()
  @IsNumber()
  actualRevenue?: number;

  @IsOptional()
  @IsString()
  actualNotes?: string;
}

export class ExternalCostItemDto {
  @IsString()
  category: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Response DTO for trip with comparison metrics
 */
export class TripResponseDto {
  _id: string;
  userId: string;
  boatId?: string;
  status: string;

  departureTime?: Date;
  returnTime?: Date;

  // Predicted values (from ML)
  predictedFuelLiters?: number;
  predictedTotalCost?: number;
  predictedFuelCost?: number;
  predictedOperationalCost?: number;
  predictedExternalCostTotal?: number;
  predictedDistanceKm?: number;
  riskCategory?: string;
  profitabilityProbability?: number;

  // Actual values (user logged)
  actualFuelLiters?: number;
  actualCatchKg?: number;
  actualFuelCost?: number;
  actualOperationalCost?: number;
  actualExternalCosts?: ExternalCostItemDto[];
  actualRevenue?: number;
  actualNotes?: string;

  // Comparison metrics (backend calculated)
  fuelErrorLiters?: number;
  fuelErrorPercent?: number;
  fuelVarianceLiters?: number;
  isFuelPredictionAccurate?: boolean;

  costErrorAmount?: number;
  costErrorPercent?: number;
  costVarianceAmount?: number;
  isCostPredictionAccurate?: boolean;

  fuelCostErrorAmount?: number;
  fuelCostErrorPercent?: number;

  comparisonEligible?: boolean;
  accuracyThresholdUsed?: number;
  comparisonCalculatedAt?: Date;

  // ✅ NEW: Boat type-based normalized fuel metrics
  expectedFuelForBoatType?: number;
  normalizedVariancePercent?: number;
  efficiencyScore?: number;
  varianceRating?: string; // 'excellent' | 'good' | 'fair' | 'poor'
  mlAdjustedExpectedFuel?: number;
  mlVariancePercent?: number;
  boatTypeUsedForMetrics?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * ✅ NEW: Boat type-based normalized fuel metrics for dashboard
 */
export class NormalizedFuelMetricsDto {
  averageEfficiencyScore: number;
  averageNormalizedVariancePercent: number;
  totalExpectedFuelForBoatTypes: number;
  overallVarianceRating: string; // 'excellent' | 'good' | 'fair' | 'poor'
  boatTypeBreakdown: Record<string, BoatTypeStatsDto>;
}

/**
 * ✅ NEW: Per boat type statistics
 */
export class BoatTypeStatsDto {
  boatTypeName: string;
  count: number;
  averageEfficiency: number;
  averageVariance: number;
}

/**
 * Response DTO for dashboard statistics
 */
export class DashboardStatsDto {
  // Basic counts
  totalTrips: number;
  completedTrips: number;
  predictionsWithActuals: number;

  // Accuracy rates (PRIMARY METRICS)
  fuelAccuracyRate: number;
  costAccuracyRate: number;

  // Averages
  averagePredictedCost: number;
  averageActualCost: number;
  averageFuelErrorPercent: number;
  averageCostErrorPercent: number;

  // Fuel totals
  totalPredictedFuel: number;
  totalActualFuel: number;
  totalFuelVariance: number;

  // Cost totals
  totalPredictedCost: number;
  totalActualCost: number;
  totalCostVariance: number;

  // Other
  totalFuelUsed: number; // DEPRECATED: Use totalActualFuel instead
  totalDistance: number;

  // ✅ NEW: Boat type-based normalized fuel metrics
  normalizedFuelMetrics?: NormalizedFuelMetricsDto;
}
