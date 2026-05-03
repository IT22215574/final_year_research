function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Weather Severity Index for fish-trip cost prediction.
 *
 * Input units:
 * - windSpeedKmh: km/h from mobile weather service or manual input
 * - waveHeight: meters from marine forecast
 * - rainMmPerHour: mm/hour from weather forecast, optional
 *
 * This app uses Open-Meteo with wind_speed_unit=kmh, so do not normalize wind
 * as m/s here.
 */
export function calculateWSI(
  windSpeedKmh: number,
  waveHeight: number,
  rainMmPerHour = 0,
) {
  const windN = clamp01(windSpeedKmh / 60);
  const waveN = clamp01(waveHeight / 4);
  const rainN = clamp01(rainMmPerHour / 25);

  const wWind = 0.4;
  const wWave = 0.45;
  const wRain = 0.15;

  const wsi = clamp01(wWind * windN + wWave * waveN + wRain * rainN);

  return {
    wsi,
    normalized: { wind: windN, wave: waveN, rain: rainN },
    weights: { wind: wWind, wave: wWave, rain: wRain },
  };
}
