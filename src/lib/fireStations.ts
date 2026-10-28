import { FIRE_STATIONS } from '../data/fireStations';
import { haversineKm } from './geo';
import type { FireStation, NearestFireStation, RegionId } from '../types';

/**
 * Average emergency road transit speed assumed for rural/forest road networks in India (40 km/h).
 * In mountainous terrain this naturally takes longer; this serves as an illustrative estimate.
 */
const ROAD_TRANSIT_SPEED_KMH = 40;

/**
 * Finds the nearest fire station to the given [lat, lon] coordinates.
 * Prefers stations in the same region, but falls back to all stations if necessary.
 */
export function findNearestFireStation(
  centroid: [number, number],
  regionId?: RegionId,
  stations: FireStation[] = FIRE_STATIONS,
): NearestFireStation | null {
  if (stations.length === 0) return null;

  // Prefer region-specific stations first if available
  const candidates =
    regionId && stations.some((s) => s.regionId === regionId)
      ? stations.filter((s) => s.regionId === regionId)
      : stations;

  let nearest: FireStation | null = null;
  let minDistance = Infinity;

  for (const station of candidates) {
    const d = haversineKm(centroid, station.location);
    if (d < minDistance) {
      minDistance = d;
      nearest = station;
    }
  }

  if (!nearest) return null;

  // Estimate transit time: minimum 5 minutes for dispatch readiness
  const estimatedMinutes = Math.max(5, Math.round((minDistance / ROAD_TRANSIT_SPEED_KMH) * 60));

  return {
    station: nearest,
    distanceKm: minDistance,
    estimatedMinutes,
  };
}
