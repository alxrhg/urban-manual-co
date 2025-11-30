/**
 * Transit Estimator
 * Estimates travel time and mode between coordinates
 */

import { haversineDistance } from './utils';

export type TransitMode = 'walk' | 'drive' | 'transit' | 'bike';

export interface TransitEstimate {
  durationMinutes: number;
  mode: TransitMode;
  distanceKm: number;
  /** Human-readable summary */
  summary: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

// Transit speed assumptions (km/h)
const SPEEDS = {
  walk: 4.5,      // Average walking speed
  bike: 15,       // City cycling
  transit: 25,    // Public transit avg including waits
  drive: 30,      // City driving with traffic
} as const;

/**
 * Estimate transit time and mode between two points
 * Automatically selects optimal mode based on distance
 */
export function estimateTransit(
  from: Coordinates,
  to: Coordinates,
  preferredMode?: TransitMode
): TransitEstimate {
  const dist = haversineDistance(from.lat, from.lng, to.lat, to.lng);

  // Auto-select mode based on distance if not specified
  const mode = preferredMode || selectOptimalMode(dist);
  const durationMinutes = calculateDuration(dist, mode);

  return {
    durationMinutes,
    mode,
    distanceKm: Math.round(dist * 100) / 100,
    summary: formatSummary(durationMinutes, mode, dist),
  };
}

/**
 * Select optimal transit mode based on distance
 */
function selectOptimalMode(distanceKm: number): TransitMode {
  if (distanceKm < 0.8) {
    return 'walk';
  } else if (distanceKm < 2.5) {
    // Walking is still viable but biking is faster
    return 'walk';
  } else if (distanceKm < 8) {
    // Good range for transit or bike
    return 'transit';
  } else {
    // Longer distances favor driving
    return 'drive';
  }
}

/**
 * Calculate travel duration in minutes
 */
function calculateDuration(distanceKm: number, mode: TransitMode): number {
  const speed = SPEEDS[mode];
  const baseDuration = (distanceKm / speed) * 60;

  // Add buffer time based on mode
  let buffer = 0;
  switch (mode) {
    case 'walk':
      buffer = 2; // Minimal buffer
      break;
    case 'bike':
      buffer = 3; // Lock/unlock time
      break;
    case 'transit':
      buffer = 8; // Wait time, transfers
      break;
    case 'drive':
      buffer = 5; // Parking, traffic lights
      break;
  }

  return Math.ceil(baseDuration + buffer);
}

/**
 * Format a human-readable summary
 */
function formatSummary(durationMinutes: number, mode: TransitMode, distanceKm: number): string {
  const modeEmoji = {
    walk: '🚶',
    bike: '🚴',
    transit: '🚇',
    drive: '🚗',
  };

  if (durationMinutes < 60) {
    return `${modeEmoji[mode]} ${durationMinutes}min ${mode}`;
  }
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return `${modeEmoji[mode]} ${hours}h ${mins}min ${mode}`;
}

/**
 * Estimate transit between multiple waypoints (for TSP calculations)
 */
export function estimateRouteTransit(
  waypoints: Coordinates[]
): { totalMinutes: number; segments: TransitEstimate[] } {
  if (waypoints.length < 2) {
    return { totalMinutes: 0, segments: [] };
  }

  const segments: TransitEstimate[] = [];
  let totalMinutes = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const estimate = estimateTransit(waypoints[i], waypoints[i + 1]);
    segments.push(estimate);
    totalMinutes += estimate.durationMinutes;
  }

  return { totalMinutes, segments };
}

/**
 * Calculate total route distance
 */
export function calculateRouteDistance(waypoints: Coordinates[]): number {
  if (waypoints.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += haversineDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
  }

  return total;
}
