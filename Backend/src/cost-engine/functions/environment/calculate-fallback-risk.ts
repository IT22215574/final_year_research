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
  const weatherRisk = data.weatherData?.wsi || 0.5;
  const distanceRisk = Math.min(data.distance / 200, 1.0);
  const economicRisk =
    data.predictedCost > data.expectedRevenue ? 0.8 : 0.3;

  const overallRisk =
    weatherRisk * 0.4 + distanceRisk * 0.3 + economicRisk * 0.3;

  let riskCategory = 'low';
  if (overallRisk > 0.7) riskCategory = 'high';
  else if (overallRisk > 0.4) riskCategory = 'medium';

  return {
    overallRiskScore: Math.round(overallRisk * 1000) / 1000,
    riskCategory,
    riskLevel: riskCategory === 'high' ? 'concerning' : 'manageable',
    detailedAssessment: {
      weatherRisk: {
        score: weatherRisk,
        category: weatherRisk > 0.6 ? 'high' : 'medium',
      },
      economicRisk: {
        score: economicRisk,
        category: economicRisk > 0.6 ? 'high' : 'low',
      },
      operationalRisk: {
        score: distanceRisk,
        category: distanceRisk > 0.5 ? 'high' : 'medium',
      },
    },
    recommendedActions: [
      overallRisk > 0.7
        ? 'Consider postponing trip due to high risk factors'
        : overallRisk > 0.4
          ? 'Proceed with enhanced monitoring and safety measures'
          : 'Acceptable risk level for proceeding with standard precautions',
    ],
    source: 'simplified_fallback',
  };
}