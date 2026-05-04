// Backend/src/cost-engine/utils/mode-calculator.util.ts

/**
 * Island vs International Mode Calculator
 * Implements different cost calculation logic for local fishing vs deep-sea international operations
 */

export interface ModeAdjustmentFactors {
  fuelMultiplier: number;
  crewMultiplier: number;
  equipmentCost: number;
  riskMultiplier: number;
  permitCost: number;
  communicationCost: number;
  insuranceMultiplier: number;
}

export interface DistanceBasedCosts {
  extraFuelReserve: number;
  navigationEquipment: number;
  emergencySupplies: number;
  vesselTracking: number;
}

/**
 * Calculate mode-specific adjustments for trip costs
 */
export function calculateModeAdjustments(
  mode: 'island' | 'international',
  distanceKm: number,
  tripDurationHours: number,
  crewCount: number,
): ModeAdjustmentFactors {
  const baseFactors: ModeAdjustmentFactors = {
    fuelMultiplier: 1.0,
    crewMultiplier: 1.0,
    equipmentCost: 0,
    riskMultiplier: 1.0,
    permitCost: 0,
    communicationCost: 0,
    insuranceMultiplier: 1.0,
  };

  if (mode === 'island') {
    // Island fishing: shorter distances, familiar waters, lower costs
    return {
      fuelMultiplier: 1.0, // No extra fuel buffer needed
      crewMultiplier: 1.0, // Standard crew rates
      equipmentCost: 500, // Basic equipment: ice, food
      riskMultiplier: 1.0, // Lower risk in familiar waters
      permitCost: 1000, // Basic fishing permit
      communicationCost: 200, // Basic radio communication
      insuranceMultiplier: 1.0, // Standard insurance
    };
  }

  // International fishing: longer distances, unknown waters, higher costs
  const distanceMultiplier = Math.min(distanceKm / 100, 3.0); // Cap at 3x for very long trips
  const durationMultiplier = Math.min(tripDurationHours / 24, 2.0); // Cap at 2x for >24h trips

  return {
    fuelMultiplier: 1.15 + distanceMultiplier * 0.1, // 15-45% more fuel for safety buffer
    crewMultiplier: 1.3 + durationMultiplier * 0.2, // 30-70% higher crew costs for international
    equipmentCost: 2500 + distanceMultiplier * 1000, // Advanced equipment for international waters
    riskMultiplier: 1.2 + distanceMultiplier * 0.15, // 20-65% higher for weather/navigation risks
    permitCost: 5000 + (distanceKm > 200 ? 5000 : 0), // International permits + EEZ fees
    communicationCost: 800 + tripDurationHours * 50, // Satellite communication costs
    insuranceMultiplier: 1.5 + distanceMultiplier * 0.1, // 50-80% higher insurance for international
  };
}

/**
 * Calculate additional costs specific to international fishing
 */
export function calculateInternationalAdditionalCosts(
  distanceKm: number,
  tripDurationHours: number,
  crewCount: number,
): DistanceBasedCosts {
  const distanceMultiplier = Math.min(distanceKm / 100, 3.0);

  return {
    extraFuelReserve: distanceKm * 2.5 * 350, // 2.5L per km reserve @ 350 LKR/L
    navigationEquipment: Math.min(distanceKm * 50, 15000), // GPS, sonar, etc. (cap at 15k)
    emergencySupplies: crewCount * tripDurationHours * 25, // Emergency food, water, medical
    vesselTracking: tripDurationHours * 100, // Satellite tracking per hour
  };
}

/**
 * Get mode-specific recommendation messages
 */
export function getModeRecommendations(
  mode: 'island' | 'international',
  distanceKm: number,
  weatherSeverityIndex: number,
): string[] {
  const recommendations: string[] = [];

  if (mode === 'island') {
    if (weatherSeverityIndex > 0.6) {
      recommendations.push(
        'Island mode: Consider staying close to shore due to weather conditions.',
      );
    }
    if (distanceKm > 50) {
      recommendations.push(
        'Island mode: Check local coast guard advisories for distant island waters.',
      );
    }
    recommendations.push(
      'Island mode: Ensure VHF radio communication with shore base.',
    );
  } else {
    // International mode
    if (weatherSeverityIndex > 0.4) {
      recommendations.push(
        'International: High weather risk - consider postponing or taking alternate route.',
      );
    }
    if (distanceKm > 200) {
      recommendations.push(
        'International: Long distance detected - ensure satellite communication and emergency beacons.',
      );
    }
    recommendations.push(
      'International: Verify EEZ permissions and international fishing licenses.',
    );
    recommendations.push(
      'International: Check emergency response protocols for deep-sea operations.',
    );

    if (distanceKm > 300) {
      recommendations.push(
        'International: Consider multi-day trip planning with extended crew provisions.',
      );
    }
  }

  return recommendations;
}
