export function calculateBoatAge(manufacturedYear?: number): number {
  if (!manufacturedYear) return 5;
  return Math.max(0, new Date().getFullYear() - manufacturedYear);
}

export function categorizeCrewExperience(experienceYears: number): string {
  if (experienceYears < 2) return 'novice';
  if (experienceYears < 5) return 'intermediate';
  if (experienceYears < 10) return 'experienced';
  return 'expert';
}

export function categorizeBoatSize(lengthM: number): string {
  if (lengthM < 8) return 'small';
  if (lengthM < 15) return 'medium';
  if (lengthM < 25) return 'large';
  return 'commercial';
}

export function determineFishingZone(distance: number): string {
  if (distance < 12) return 'coastal';
  if (distance < 50) return 'territorial';
  if (distance < 200) return 'eez';
  return 'international';
}

export function calculateFallbackRisk(data: any): any {
  const weatherRisk = data.weatherData?.wsi || 0.3;
  
  // More realistic distance risk - only long distances are risky
  const distanceRisk = Math.min(data.distance / 300, 1.0) * 0.6;
  
  // Improved economic risk - consider profit margin not just loss
  const profitMargin = (data.expectedRevenue - data.predictedCost) / data.expectedRevenue;
  let economicRisk = 0.3; // Default moderate risk
  
  if (profitMargin < -0.2) {
    economicRisk = 0.85; // Significant loss expected
  } else if (profitMargin < 0) {
    economicRisk = 0.65; // Small loss expected
  } else if (profitMargin < 0.1) {
    economicRisk = 0.5; // Low margin
  } else if (profitMargin < 0.25) {
    economicRisk = 0.35; // Moderate margin
  } else {
    economicRisk = 0.2; // Good margin
  }

  // Weighted combination - prioritize weather and economic factors
  const overallRisk =
    weatherRisk * 0.45 + economicRisk * 0.35 + distanceRisk * 0.20;

  // More realistic risk category thresholds
  let riskCategory = 'low';
  let riskLevel = 'acceptable';
  
  if (overallRisk > 0.75) {
    riskCategory = 'critical';
    riskLevel = 'dangerous';
  } else if (overallRisk > 0.6) {
    riskCategory = 'high';
    riskLevel = 'concerning';
  } else if (overallRisk > 0.4) {
    riskCategory = 'medium';
    riskLevel = 'manageable';
  } else {
    riskCategory = 'low';
    riskLevel = 'acceptable';
  }

  return {
    overallRiskScore: Math.round(overallRisk * 1000) / 1000,
    riskCategory,
    riskLevel,
    confidenceScore: 0.65, // Moderate confidence for fallback
    detailedAssessment: {
      weatherRisk: {
        score: Math.round(weatherRisk * 1000) / 1000,
        category: weatherRisk > 0.7 ? 'high' : weatherRisk > 0.5 ? 'medium' : 'low',
      },
      economicRisk: {
        score: Math.round(economicRisk * 1000) / 1000,
        category: economicRisk > 0.65 ? 'high' : economicRisk > 0.45 ? 'medium' : 'low',
        profitMargin: Math.round(profitMargin * 1000) / 1000,
      },
      operationalRisk: {
        score: Math.round(distanceRisk * 1000) / 1000,
        category: distanceRisk > 0.5 ? 'high' : distanceRisk > 0.3 ? 'medium' : 'low',
      },
    },
    recommendedActions: [
      overallRisk > 0.75
        ? 'High risk detected - carefully review weather and economic factors before proceeding'
        : overallRisk > 0.6
          ? 'Moderate-high risk - proceed with enhanced monitoring and contingency plans'
          : overallRisk > 0.4
            ? 'Moderate risk - standard safety measures and monitoring recommended'
            : 'Low risk level - proceed with normal precautions',
    ],
    source: 'simplified_fallback',
  };
}