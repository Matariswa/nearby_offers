export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Placeholder for Haversine distance calculation.
 * Returns 0 until geolocation search is implemented.
 */
export function calculateDistance(
  _from: Coordinates,
  _to: Coordinates,
): number {
  return 0;
}

/**
 * Placeholder for formatting distance in kilometers.
 */
export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}
