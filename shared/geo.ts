const EARTH_RADIUS_KM = 6371;

export interface LatLng {
  latitude: number;
  longitude: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Snap a coordinate to a coarse grid (~1.1 km at 0.01°). Used whenever a
 * location is stored or displayed publicly so it can never reveal a home.
 */
export function approximateCoordinate(point: LatLng, precisionDegrees = 0.01): LatLng {
  const snap = (value: number) => Math.round(value / precisionDegrees) * precisionDegrees;
  return {
    latitude: Number(snap(point.latitude).toFixed(4)),
    longitude: Number(snap(point.longitude).toFixed(4)),
  };
}

/** Distance rounded to a privacy-preserving, human-friendly value. */
export function roundedDistanceKm(km: number): number {
  if (km < 1) return 1;
  if (km < 10) return Math.round(km);
  return Math.round(km / 5) * 5;
}

/** Greater Tunis bounding box, used to sanity-check coordinates. */
export const GREATER_TUNIS_BOUNDS = {
  minLat: 36.6,
  maxLat: 37.1,
  minLng: 9.8,
  maxLng: 10.45,
} as const;

export const GREATER_TUNIS_CENTER: LatLng = { latitude: 36.8065, longitude: 10.1815 };

export function isWithinTunisia(point: LatLng): boolean {
  return point.latitude >= 30 && point.latitude <= 37.6 && point.longitude >= 7.4 && point.longitude <= 11.7;
}
