import { Injectable } from '@nestjs/common';

/**
 * BoatTypeCoefficientService
 *
 * Provides boat type-specific fuel consumption baselines, efficiency coefficients,
 * and normalized variance calculations for Sri Lankan fishing vessels.
 *
 * This makes fuel variance metrics CONTEXTUAL and MEANINGFUL by comparing
 * actual performance against boat type norms rather than just raw differences.
 */

export interface BoatTypeFuelProfile {
  name: string;
  code: string;
  baselineFuelPerKm: number; // L/km - typical fuel consumption
  efficiencyVarianceThreshold: number; // % - acceptable variance from baseline
  category: 'small' | 'medium' | 'large';
  typicalDistanceRange: { min: number; max: number }; // km
  typicalFuelRange: { min: number; max: number }; // L per trip
}

export interface NormalizedVarianceMetrics {
  // Raw metrics (already exist)
  rawVarianceLiters: number;
  rawVariancePercent: number;

  // Boat type normalized metrics
  expectedFuelForBoatType: number; // L - what this boat type typically uses
  normalizedVariancePercent: number; // % - variance relative to boat type baseline
  efficiencyScore: number; // 0-100 - how efficiently this boat performs vs its type
  varianceRating: 'excellent' | 'good' | 'fair' | 'poor'; // Contextual rating

  // ML-adjusted metrics
  mlAdjustedExpectedFuel: number | null; // L - ML-learned expected fuel for THIS boat
  mlVariancePercent: number | null; // % - variance from ML prediction

  // Context
  boatTypeUsed: string;
  distanceKm: number;
}

@Injectable()
export class BoatTypeCoefficientService {
  /**
   * Sri Lankan fishing boat type fuel profiles
   * Based on research data and BOAT_FUEL_BASELINES
   */
  private readonly BOAT_TYPE_PROFILES: Record<string, BoatTypeFuelProfile> = {
    IMUL: {
      name: 'Indigenous Multi-Day Ultra Light',
      code: 'IMUL',
      baselineFuelPerKm: 2.25,
      efficiencyVarianceThreshold: 20, // ±20% acceptable for small boats
      category: 'small',
      typicalDistanceRange: { min: 10, max: 100 },
      typicalFuelRange: { min: 20, max: 300 },
    },
    IDAY: {
      name: 'Indigenous Day Boats',
      code: 'IDAY',
      baselineFuelPerKm: 2.0,
      efficiencyVarianceThreshold: 18,
      category: 'small',
      typicalDistanceRange: { min: 5, max: 80 },
      typicalFuelRange: { min: 10, max: 200 },
    },
    OFRP: {
      name: 'Offshore Fishing Vessel',
      code: 'OFRP',
      baselineFuelPerKm: 0.62,
      efficiencyVarianceThreshold: 12, // ±12% - more efficient boats have tighter tolerance
      category: 'large',
      typicalDistanceRange: { min: 100, max: 500 },
      typicalFuelRange: { min: 100, max: 1000 },
    },
    MTRB: {
      name: 'Multi-day Trawler/Boat',
      code: 'MTRB',
      baselineFuelPerKm: 0.43,
      efficiencyVarianceThreshold: 15,
      category: 'medium',
      typicalDistanceRange: { min: 50, max: 300 },
      typicalFuelRange: { min: 50, max: 500 },
    },
  };

  /**
   * Calculate normalized variance metrics for a trip
   * This provides contextual, meaningful fuel variance analysis
   */
  calculateNormalizedVariance(
    predictedFuel: number,
    actualFuel: number,
    boatType: string,
    distanceKm: number,
    boatId?: string,
  ): NormalizedVarianceMetrics {
    // Get boat type profile
    const profile =
      this.BOAT_TYPE_PROFILES[boatType] || this.getDefaultProfile();

    // Raw variance (already calculated in TripMetricsService)
    const rawVarianceLiters = actualFuel - predictedFuel;
    const rawVariancePercent =
      predictedFuel > 0
        ? Math.abs((rawVarianceLiters / predictedFuel) * 100)
        : 0;

    // Expected fuel based on boat type baseline
    const expectedFuelForBoatType = this.calculateExpectedFuelForBoatType(
      boatType,
      distanceKm,
    );

    // Normalized variance - compare actual to boat type baseline
    const normalizedVarianceLiters = actualFuel - expectedFuelForBoatType;
    const normalizedVariancePercent =
      expectedFuelForBoatType > 0
        ? (normalizedVarianceLiters / expectedFuelForBoatType) * 100
        : 0;

    // Efficiency score (0-100)
    // Higher score = more efficient (using less fuel than expected)
    const efficiencyScore = this.calculateEfficiencyScore(
      actualFuel,
      expectedFuelForBoatType,
      profile.efficiencyVarianceThreshold,
    );

    // Contextual rating based on normalized variance
    const varianceRating = this.getVarianceRating(
      Math.abs(normalizedVariancePercent),
      profile.efficiencyVarianceThreshold,
    );

    // ML-adjusted expected fuel (placeholder for ML integration)
    // TODO: Integrate with adaptive learning from actual trip history
    const mlAdjustedExpectedFuel = this.getMLAdjustedExpectedFuel(
      boatId,
      predictedFuel,
      expectedFuelForBoatType,
    );

    const mlVariancePercent = mlAdjustedExpectedFuel
      ? ((actualFuel - mlAdjustedExpectedFuel) / mlAdjustedExpectedFuel) * 100
      : null;

    return {
      rawVarianceLiters,
      rawVariancePercent,
      expectedFuelForBoatType,
      normalizedVariancePercent,
      efficiencyScore,
      varianceRating,
      mlAdjustedExpectedFuel,
      mlVariancePercent,
      boatTypeUsed: profile.code,
      distanceKm,
    };
  }

  /**
   * Calculate expected fuel consumption based on boat type baseline
   */
  private calculateExpectedFuelForBoatType(
    boatType: string,
    distanceKm: number,
  ): number {
    const profile =
      this.BOAT_TYPE_PROFILES[boatType] || this.getDefaultProfile();

    // Base calculation: distance * fuel per km
    let expectedFuel = distanceKm * profile.baselineFuelPerKm;

    // Apply distance-based adjustments
    // Longer trips may have slightly better efficiency due to sustained cruising
    if (distanceKm > 200) {
      expectedFuel *= 0.95; // 5% efficiency bonus for long-distance cruising
    } else if (distanceKm < 20) {
      expectedFuel *= 1.1; // 10% efficiency penalty for short trips (startup/warmup)
    }

    return Math.max(0, expectedFuel);
  }

  /**
   * Calculate efficiency score (0-100)
   * 100 = perfect efficiency (using exactly boat type baseline)
   * >100 = better than expected (using less fuel)
   * <100 = worse than expected (using more fuel)
   */
  private calculateEfficiencyScore(
    actualFuel: number,
    expectedFuel: number,
    thresholdPercent: number,
  ): number {
    if (expectedFuel <= 0) return 50;

    const efficiency = (expectedFuel / actualFuel) * 100;

    // Cap at reasonable bounds
    return Math.max(0, Math.min(150, Math.round(efficiency)));
  }

  /**
   * Get contextual variance rating
   */
  private getVarianceRating(
    absNormalizedVariancePercent: number,
    thresholdPercent: number,
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (absNormalizedVariancePercent <= thresholdPercent * 0.5) {
      return 'excellent'; // Within 50% of threshold
    } else if (absNormalizedVariancePercent <= thresholdPercent) {
      return 'good'; // Within threshold
    } else if (absNormalizedVariancePercent <= thresholdPercent * 1.5) {
      return 'fair'; // Slightly over threshold
    } else {
      return 'poor'; // Significantly over threshold
    }
  }

  /**
   * Get ML-adjusted expected fuel
   * This would integrate with the boat's adaptive learning coefficients
   * For now, returns a weighted average of ML prediction and boat type baseline
   */
  private getMLAdjustedExpectedFuel(
    boatId: string | undefined,
    mlPredictedFuel: number,
    boatTypeExpectedFuel: number,
  ): number | null {
    if (!boatId) return null;

    // TODO: Query boat's learning coefficients from database
    // TODO: Use adaptive learning history to refine expected fuel

    // For now, blend ML prediction (70%) with boat type baseline (30%)
    // This provides a middle ground between learned patterns and type norms
    const blendedExpected = mlPredictedFuel * 0.7 + boatTypeExpectedFuel * 0.3;

    return blendedExpected > 0 ? blendedExpected : null;
  }

  /**
   * Get default profile for unknown boat types
   */
  private getDefaultProfile(): BoatTypeFuelProfile {
    return {
      name: 'Standard Vessel',
      code: 'UNKNOWN',
      baselineFuelPerKm: 1.5, // Conservative middle-ground estimate
      efficiencyVarianceThreshold: 20,
      category: 'medium',
      typicalDistanceRange: { min: 10, max: 200 },
      typicalFuelRange: { min: 20, max: 400 },
    };
  }

  /**
   * Get boat type profile for external use
   */
  getBoatTypeProfile(boatType: string): BoatTypeFuelProfile {
    return this.BOAT_TYPE_PROFILES[boatType] || this.getDefaultProfile();
  }

  /**
   * Get all boat type profiles
   */
  getAllBoatTypeProfiles(): Record<string, BoatTypeFuelProfile> {
    return { ...this.BOAT_TYPE_PROFILES };
  }
}
