import { Injectable } from '@nestjs/common';
import {
  BoatTypeCoefficientService,
  NormalizedVarianceMetrics,
} from './boat-type-coefficients.service';

/**
 * TripMetricsService
 *
 * Calculates official trip-level comparison metrics and aggregated dashboard stats.
 * This is the SINGLE SOURCE OF TRUTH for all research accuracy metrics.
 *
 * Design principles:
 * 1. Backend owns all metric formulas
 * 2. Frontend only displays backend-calculated values
 * 3. Null-safe numeric validation throughout
 * 4. Consistent accuracy thresholds (15% default)
 * 5. Clear terminology (variance vs savings, fuel accuracy vs generic accuracy)
 * 6. Boat type-based normalized variance for contextual metrics
 */
@Injectable()
export class TripMetricsService {
  private readonly FUEL_ACCURACY_THRESHOLD = 15; // percent
  private readonly COST_ACCURACY_THRESHOLD = 15; // percent

  constructor(
    private readonly boatTypeCoefficientService: BoatTypeCoefficientService,
  ) {}

  /**
   * Calculate trip-level comparison metrics
   * Call this after actual values are logged for a trip
   */
  calculateTripMetrics(trip: any): TripComparisonMetrics {
    const predicted = {
      fuel: this.safeNumber(trip.predictedFuelLiters),
      cost: this.safeNumber(trip.predictedTotalCost),
      fuelCost: this.safeNumber(trip.predictedFuelCost),
      operationalCost: this.safeNumber(trip.predictedOperationalCost),
      externalCost: this.safeNumber(trip.predictedExternalCostTotal),
    };

    const actual = {
      fuel: this.safeNumber(trip.actualFuelLiters),
      cost: this.calculateActualTotalCost(trip),
      fuelCost: this.safeNumber(trip.actualFuelCost),
      operationalCost: this.safeNumber(trip.actualOperationalCost),
      externalCost: this.calculateActualExternalCostTotal(trip),
    };

    // Fuel metrics
    const fuelErrorLiters = this.calculateError(predicted.fuel, actual.fuel);
    const fuelErrorPercent = this.calculateErrorPercent(
      predicted.fuel,
      actual.fuel,
    );
    const fuelVarianceLiters = this.calculateVariance(
      predicted.fuel,
      actual.fuel,
    );

    // Cost metrics
    const costErrorAmount = this.calculateError(predicted.cost, actual.cost);
    const costErrorPercent = this.calculateErrorPercent(
      predicted.cost,
      actual.cost,
    );
    const costVarianceAmount = this.calculateVariance(
      predicted.cost,
      actual.cost,
    );

    // Fuel cost metrics (separate from total cost)
    const fuelCostErrorAmount = this.calculateError(
      predicted.fuelCost,
      actual.fuelCost,
    );
    const fuelCostErrorPercent = this.calculateErrorPercent(
      predicted.fuelCost,
      actual.fuelCost,
    );

    // Accuracy flags
    const isFuelPredictionAccurate =
      fuelErrorPercent != null &&
      fuelErrorPercent <= this.FUEL_ACCURACY_THRESHOLD;

    const isCostPredictionAccurate =
      costErrorPercent != null &&
      costErrorPercent <= this.COST_ACCURACY_THRESHOLD;

    // Comparison eligibility
    const comparisonEligible = this.isComparisonEligible(trip);

    // ✅ NEW: Boat type-based normalized variance metrics
    let normalizedMetrics: NormalizedVarianceMetrics | null = null;

    if (comparisonEligible && predicted.fuel != null && actual.fuel != null) {
      const boatType = trip.boatType || 'UNKNOWN';
      const distanceKm =
        this.safeNumber(trip.distanceKm) ||
        this.safeNumber(trip.predictedDistanceKm) ||
        0;
      const boatId = trip.boatId;

      normalizedMetrics =
        this.boatTypeCoefficientService.calculateNormalizedVariance(
          predicted.fuel,
          actual.fuel,
          boatType,
          distanceKm,
          boatId,
        );
    }

    return {
      // Fuel comparison
      fuelErrorLiters,
      fuelErrorPercent,
      fuelVarianceLiters,
      isFuelPredictionAccurate,

      // Cost comparison
      costErrorAmount,
      costErrorPercent,
      costVarianceAmount,
      isCostPredictionAccurate,

      // Fuel cost specific
      fuelCostErrorAmount,
      fuelCostErrorPercent,

      // ✅ NEW: Normalized variance (boat type context)
      normalizedFuelMetrics: normalizedMetrics,

      // Meta
      comparisonEligible,
      accuracyThresholdUsed: this.FUEL_ACCURACY_THRESHOLD,
      comparisonCalculatedAt: new Date(),
    };
  }

  /**
   * Calculate aggregated dashboard statistics for a user
   * This replaces frontend calculation logic
   */
  calculateDashboardStats(trips: any[]): DashboardStats {
    const totalTrips = trips.length;
    const completedTrips = trips.filter((t) => t.status === 'completed').length;

    // Only include trips with both predicted and actual values
    const eligibleTrips = trips.filter((t) => this.isComparisonEligible(t));
    const predictionsWithActuals = eligibleTrips.length;

    // Fuel accuracy calculation
    const fuelAccurateTrips = eligibleTrips.filter((t) => {
      const errorPercent = this.calculateErrorPercent(
        this.safeNumber(t.predictedFuelLiters),
        this.safeNumber(t.actualFuelLiters),
      );
      return (
        errorPercent != null && errorPercent <= this.FUEL_ACCURACY_THRESHOLD
      );
    });

    const fuelAccuracyRate =
      predictionsWithActuals > 0
        ? Math.round((fuelAccurateTrips.length / predictionsWithActuals) * 100)
        : 0;

    // Cost accuracy calculation
    const costAccurateTrips = eligibleTrips.filter((t) => {
      const actualCost = this.calculateActualTotalCost(t);
      const errorPercent = this.calculateErrorPercent(
        this.safeNumber(t.predictedTotalCost),
        actualCost,
      );
      return (
        errorPercent != null && errorPercent <= this.COST_ACCURACY_THRESHOLD
      );
    });

    const costAccuracyRate =
      predictionsWithActuals > 0
        ? Math.round((costAccurateTrips.length / predictionsWithActuals) * 100)
        : 0;

    // Fuel aggregations
    const totalPredictedFuel = this.sumSafe(
      trips.map((t) => t.predictedFuelLiters),
    );
    const totalActualFuel = this.sumSafe(
      eligibleTrips.map((t) => t.actualFuelLiters),
    );
    const totalFuelVariance = totalActualFuel - totalPredictedFuel;

    // Cost aggregations
    const totalPredictedCost = this.sumSafe(
      trips.map((t) => t.predictedTotalCost),
    );
    const totalActualCost = eligibleTrips.reduce((sum, t) => {
      return sum + (this.calculateActualTotalCost(t) || 0);
    }, 0);
    const totalCostVariance = totalActualCost - totalPredictedCost;

    // Averages
    const averagePredictedCost =
      totalTrips > 0 ? Math.round(totalPredictedCost / totalTrips) : 0;

    const averageActualCost =
      predictionsWithActuals > 0
        ? Math.round(totalActualCost / predictionsWithActuals)
        : 0;

    // Error percentages
    const fuelErrors = eligibleTrips
      .map((t) =>
        this.calculateErrorPercent(
          this.safeNumber(t.predictedFuelLiters),
          this.safeNumber(t.actualFuelLiters),
        ),
      )
      .filter((e) => e != null);

    const averageFuelErrorPercent =
      fuelErrors.length > 0
        ? Math.round(
            (fuelErrors.reduce((sum, e) => sum + e, 0) / fuelErrors.length) *
              10,
          ) / 10
        : 0;

    const costErrors = eligibleTrips
      .map((t) => {
        const actualCost = this.calculateActualTotalCost(t);
        return this.calculateErrorPercent(
          this.safeNumber(t.predictedTotalCost),
          actualCost,
        );
      })
      .filter((e) => e != null);

    const averageCostErrorPercent =
      costErrors.length > 0
        ? Math.round(
            (costErrors.reduce((sum, e) => sum + e, 0) / costErrors.length) *
              10,
          ) / 10
        : 0;

    // Distance
    const totalDistance = this.sumSafe(
      trips.map((t) => t.distanceKm || t.predictedDistanceKm),
    );

    // ✅ NEW: Boat type-based normalized metrics aggregation
    const normalizedMetrics =
      this.calculateAggregatedNormalizedMetrics(eligibleTrips);

    return {
      // Basic counts
      totalTrips,
      completedTrips,
      predictionsWithActuals,

      // Accuracy rates (MOST IMPORTANT)
      fuelAccuracyRate,
      costAccuracyRate,

      // Average values
      averagePredictedCost,
      averageActualCost,
      averageFuelErrorPercent,
      averageCostErrorPercent,

      // Fuel totals
      totalPredictedFuel: Math.round(totalPredictedFuel * 10) / 10,
      totalActualFuel: Math.round(totalActualFuel * 10) / 10,
      totalFuelVariance: Math.round(totalFuelVariance * 10) / 10,

      // Cost totals
      totalPredictedCost: Math.round(totalPredictedCost),
      totalActualCost: Math.round(totalActualCost),
      totalCostVariance: Math.round(totalCostVariance),

      // Deprecated (keep for backward compatibility, but mark clearly)
      totalFuelUsed: Math.round(totalActualFuel * 10) / 10, // DEPRECATED: use totalActualFuel

      // Other
      totalDistance: Math.round(totalDistance * 10) / 10,

      // ✅ NEW: Boat type-based normalized metrics
      normalizedFuelMetrics: normalizedMetrics,
    };
  }

  /**
   * ✅ NEW: Calculate aggregated boat type-based normalized metrics
   */
  private calculateAggregatedNormalizedMetrics(
    trips: any[],
  ): AggregatedNormalizedMetrics {
    const tripMetrics = trips
      .map((trip) => {
        const predictedFuel = this.safeNumber(trip.predictedFuelLiters);
        const actualFuel = this.safeNumber(trip.actualFuelLiters);
        const boatType = trip.boatType || 'UNKNOWN';
        const distanceKm =
          this.safeNumber(trip.distanceKm) ||
          this.safeNumber(trip.predictedDistanceKm) ||
          0;
        const boatId = trip.boatId;

        if (predictedFuel == null || actualFuel == null || distanceKm === 0) {
          return null;
        }

        return this.boatTypeCoefficientService.calculateNormalizedVariance(
          predictedFuel,
          actualFuel,
          boatType,
          distanceKm,
          boatId,
        );
      })
      .filter((m) => m != null);

    if (tripMetrics.length === 0) {
      return {
        averageEfficiencyScore: 0,
        averageNormalizedVariancePercent: 0,
        totalExpectedFuelForBoatTypes: 0,
        overallVarianceRating: 'fair',
        boatTypeBreakdown: {},
      };
    }

    // Calculate averages
    const avgEfficiency =
      tripMetrics.reduce((sum, m) => sum + m.efficiencyScore, 0) /
      tripMetrics.length;
    const avgNormalizedVariance =
      tripMetrics.reduce(
        (sum, m) => sum + Math.abs(m.normalizedVariancePercent),
        0,
      ) / tripMetrics.length;
    const totalExpected = tripMetrics.reduce(
      (sum, m) => sum + m.expectedFuelForBoatType,
      0,
    );

    // Overall rating based on average efficiency
    let overallRating: 'excellent' | 'good' | 'fair' | 'poor';
    if (avgEfficiency >= 95) {
      overallRating = 'excellent';
    } else if (avgEfficiency >= 85) {
      overallRating = 'good';
    } else if (avgEfficiency >= 70) {
      overallRating = 'fair';
    } else {
      overallRating = 'poor';
    }

    // Breakdown by boat type
    const boatTypeBreakdown: Record<string, BoatTypeStats> = {};

    trips.forEach((trip) => {
      const boatType = trip.boatType || 'UNKNOWN';
      if (!boatTypeBreakdown[boatType]) {
        const profile =
          this.boatTypeCoefficientService.getBoatTypeProfile(boatType);
        boatTypeBreakdown[boatType] = {
          boatTypeName: profile.name,
          count: 0,
          averageEfficiency: 0,
          averageVariance: 0,
        };
      }
      boatTypeBreakdown[boatType].count++;
    });

    // Calculate per-boat-type metrics
    Object.keys(boatTypeBreakdown).forEach((boatType) => {
      const typeMetrics = tripMetrics.filter(
        (m) => m.boatTypeUsed === boatType,
      );
      if (typeMetrics.length > 0) {
        boatTypeBreakdown[boatType].averageEfficiency =
          typeMetrics.reduce((sum, m) => sum + m.efficiencyScore, 0) /
          typeMetrics.length;
        boatTypeBreakdown[boatType].averageVariance =
          typeMetrics.reduce((sum, m) => sum + m.normalizedVariancePercent, 0) /
          typeMetrics.length;
      }
    });

    return {
      averageEfficiencyScore: Math.round(avgEfficiency),
      averageNormalizedVariancePercent:
        Math.round(avgNormalizedVariance * 10) / 10,
      totalExpectedFuelForBoatTypes: Math.round(totalExpected * 10) / 10,
      overallVarianceRating: overallRating,
      boatTypeBreakdown,
    };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Safe number conversion (null/undefined/NaN → null)
   */
  private safeNumber(value: any): number | null {
    if (value == null) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Calculate absolute error
   */
  private calculateError(
    predicted: number | null,
    actual: number | null,
  ): number | null {
    if (predicted == null || actual == null) return null;
    return Math.abs(actual - predicted);
  }

  /**
   * Calculate error percentage
   */
  private calculateErrorPercent(
    predicted: number | null,
    actual: number | null,
  ): number | null {
    if (predicted == null || actual == null || predicted === 0) return null;
    return Math.abs((actual - predicted) / predicted) * 100;
  }

  /**
   * Calculate variance (positive = actual > predicted, negative = actual < predicted)
   */
  private calculateVariance(
    predicted: number | null,
    actual: number | null,
  ): number | null {
    if (predicted == null || actual == null) return null;
    return actual - predicted;
  }

  /**
   * Calculate actual total cost from trip components
   */
  private calculateActualTotalCost(trip: any): number | null {
    const fuelCost = this.safeNumber(trip.actualFuelCost);
    const operationalCost = this.safeNumber(trip.actualOperationalCost);
    const externalCost = this.calculateActualExternalCostTotal(trip);

    if (fuelCost == null && operationalCost == null && externalCost == null) {
      return null;
    }

    return (fuelCost || 0) + (operationalCost || 0) + (externalCost || 0);
  }

  /**
   * Calculate total from actualExternalCosts array
   */
  private calculateActualExternalCostTotal(trip: any): number | null {
    if (
      !Array.isArray(trip.actualExternalCosts) ||
      trip.actualExternalCosts.length === 0
    ) {
      return null;
    }

    return trip.actualExternalCosts.reduce((sum, item) => {
      const amount = this.safeNumber(item.amount);
      return sum + (amount || 0);
    }, 0);
  }

  /**
   * Check if trip is eligible for comparison
   * Enhanced with data quality validation
   */
  private isComparisonEligible(trip: any): boolean {
    const predictedFuel = this.safeNumber(trip.predictedFuelLiters);
    const actualFuel = this.safeNumber(trip.actualFuelLiters);
    const predictedCost = this.safeNumber(trip.predictedTotalCost);
    const actualCost = this.calculateActualTotalCost(trip);

    // Must have predicted values
    const hasPredicted = predictedFuel != null && predictedCost != null;

    // Must have actual values
    const hasActual = actualFuel != null && actualCost != null;

    if (!hasPredicted || !hasActual) {
      return false;
    }

    // Data quality checks - filter out unrealistic values
    // Fuel should be positive and reasonable (not 0, not absurdly high)
    if (predictedFuel <= 0 || actualFuel < 0) {
      return false;
    }

    // Filter extreme outliers - prediction and actual shouldn't differ by more than 1000%
    const fuelRatio = actualFuel > 0 ? predictedFuel / actualFuel : 0;
    if (fuelRatio > 10 || fuelRatio < 0.1) {
      // Prediction is 10x actual or actual is 10x prediction - likely bad data
      return false;
    }

    // Cost should be positive
    if (predictedCost <= 0 || actualCost < 0) {
      return false;
    }

    return true;
  }

  /**
   * Sum array of numbers safely
   */
  private sumSafe(values: any[]): number {
    return values.reduce((sum, val) => {
      const num = this.safeNumber(val);
      return sum + (num || 0);
    }, 0);
  }
}

// ==================== TYPE DEFINITIONS ====================

export interface TripComparisonMetrics {
  // Fuel metrics
  fuelErrorLiters: number | null;
  fuelErrorPercent: number | null;
  fuelVarianceLiters: number | null;
  isFuelPredictionAccurate: boolean;

  // Cost metrics
  costErrorAmount: number | null;
  costErrorPercent: number | null;
  costVarianceAmount: number | null;
  isCostPredictionAccurate: boolean;

  // Fuel cost specific
  fuelCostErrorAmount: number | null;
  fuelCostErrorPercent: number | null;

  // ✅ NEW: Boat type-based normalized variance metrics
  normalizedFuelMetrics: NormalizedVarianceMetrics | null;

  // Meta
  comparisonEligible: boolean;
  accuracyThresholdUsed: number;
  comparisonCalculatedAt: Date;
}

export interface DashboardStats {
  // Basic counts
  totalTrips: number;
  completedTrips: number;
  predictionsWithActuals: number;

  // Accuracy rates (primary metrics)
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
  totalFuelUsed: number; // DEPRECATED
  totalDistance: number;

  // ✅ NEW: Boat type-based normalized metrics
  normalizedFuelMetrics: AggregatedNormalizedMetrics;
}

/**
 * ✅ NEW: Aggregated normalized metrics across all trips
 */
export interface AggregatedNormalizedMetrics {
  averageEfficiencyScore: number; // 0-150 - average fleet efficiency
  averageNormalizedVariancePercent: number; // Average variance from boat type baselines
  totalExpectedFuelForBoatTypes: number; // Total fuel expected based on boat types
  overallVarianceRating: 'excellent' | 'good' | 'fair' | 'poor'; // Overall fleet rating
  boatTypeBreakdown: Record<string, BoatTypeStats>; // Per boat type statistics
}

/**
 * ✅ NEW: Per boat type statistics
 */
export interface BoatTypeStats {
  boatTypeName: string;
  count: number;
  averageEfficiency: number;
  averageVariance: number;
}
