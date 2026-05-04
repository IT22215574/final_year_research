function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Normalization assumptions (tweak later):
 * - Wind 0..30 m/s
 * - Wave 0..4 m
 * - Rain 0..50 mm/h (optional; if missing use 0)
 */
export function calculateWSI(
  windSpeed: number,
  waveHeight: number,
  rainMmPerHour = 0,
) {
  const windN = clamp01(windSpeed / 30);
  const waveN = clamp01(waveHeight / 4);
  const rainN = clamp01(rainMmPerHour / 50);

  const wWind = 0.4;
  const wWave = 0.4;
  const wRain = 0.2;

  const wsi = clamp01(wWind * windN + wWave * waveN + wRain * rainN);

  return {
    wsi,
    normalized: { wind: windN, wave: waveN, rain: rainN },
    weights: { wind: wWind, wave: wWave, rain: wRain },
  };
}
