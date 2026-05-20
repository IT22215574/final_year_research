  export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  // Basic range validation
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) throw new Error('Invalid latitude');
  if (Math.abs(lon1) > 180 || Math.abs(lon2) > 180) throw new Error('Invalid longitude');

  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function effectiveDistanceKm(baseDistanceKm: number, drf = 0.05): number {
  const safeDrf = Number.isFinite(drf) ? drf : 0.05;
  return baseDistanceKm * (1 + safeDrf);
}