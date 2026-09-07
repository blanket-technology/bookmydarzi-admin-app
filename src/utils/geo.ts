// Haversine distance, mirrors app/core/geo.py's haversine_distance exactly
// (same formula, same Earth radius) - used client-side for the pickup/
// delivery broadcast feeds, which already carry exact lat/lng (staff-only,
// no customer-privacy concern once the job is offered to vetted staff).
// Tailor broadcasts are different: the backend computes distance_km itself
// (see BroadcastOffer.distance_km) since tailors never receive exact
// coordinates before accepting - format that value with formatDistanceKm
// below rather than recomputing it here.
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/** Uber/Ola-style short label: "800 m away" under 1 km, "5.2 km away" above. */
export function formatDistanceKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}
