function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function stdev(arr: number[]) {
  const xs = arr.filter((n) => Number.isFinite(n));
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const varr = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(varr);
}

/**
 * FESI = weighted volatility index (0..1)
 * Inputs can be small arrays of recent values, or single values (handled as 0 volatility)
 */
export function calculateFESI(opts: {
  recentFuelPrices?: number[];
  recentMarketPrices?: number[];
  recentWSI?: number[];
}) {
  const fuelVol = stdev(opts.recentFuelPrices || []);
  const marketVol = stdev(opts.recentMarketPrices || []);
  const weatherVol = stdev(opts.recentWSI || []);

  // Normalize volatilities into 0..1 ranges (tweak later)
  const fuelN = clamp01(fuelVol / 50);     // LKR-ish scale guess
  const marketN = clamp01(marketVol / 200);
  const weatherN = clamp01(weatherVol / 0.3);

  const wFuel = 0.4;
  const wMarket = 0.3;
  const wWeather = 0.3;

  const fesi = clamp01(wFuel * fuelN + wMarket * marketN + wWeather * weatherN);

  return {
    fesi,
    components: { fuelN, marketN, weatherN },
    weights: { fuel: wFuel, market: wMarket, weather: wWeather },
  };
}