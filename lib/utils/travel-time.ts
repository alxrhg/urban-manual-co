/**
 * Travel Time Calculation Utilities
 *
 * Provides estimated travel times between coordinates using:
 * 1. Haversine distance with mode-specific speed estimates
 * 2. Optional real-time API integration (Google Maps)
 */

export type TravelMode = 'walking' | 'driving' | 'transit';

export interface TravelTimeResult {
  durationMinutes: number;
  distanceKm: number;
  mode: TravelMode;
  isEstimate: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

// Average speeds in km/h for different modes
const SPEEDS: Record<TravelMode, number> = {
  walking: 5,    // 5 km/h average walking speed
  transit: 25,   // 25 km/h average transit (includes waiting)
  driving: 40,   // 40 km/h average urban driving (includes traffic)
};

// Multipliers for urban terrain (winding streets, traffic lights, etc.)
const URBAN_MULTIPLIERS: Record<TravelMode, number> = {
  walking: 1.3,  // Walking paths rarely direct
  transit: 1.5,  // Transit includes waiting + transfers
  driving: 1.4,  // Traffic lights, turns
};

/**
 * Calculate haversine distance between two points
 */
export function calculateHaversineDistance(
  from: Coordinates,
  to: Coordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate travel time based on haversine distance
 */
export function estimateTravelTime(
  from: Coordinates,
  to: Coordinates,
  mode: TravelMode = 'walking'
): TravelTimeResult {
  const distance = calculateHaversineDistance(from, to);

  // Apply urban multiplier to account for non-straight paths
  const adjustedDistance = distance * URBAN_MULTIPLIERS[mode];

  // Calculate duration in minutes
  const durationMinutes = Math.round((adjustedDistance / SPEEDS[mode]) * 60);

  return {
    durationMinutes: Math.max(1, durationMinutes), // Minimum 1 minute
    distanceKm: Math.round(distance * 10) / 10, // Round to 1 decimal
    mode,
    isEstimate: true,
  };
}

/**
 * Get suggested travel mode based on distance
 */
export function suggestTravelMode(distanceKm: number): TravelMode {
  if (distanceKm < 1.5) return 'walking';
  if (distanceKm < 10) return 'transit';
  return 'driving';
}

/**
 * Calculate travel times for all modes
 */
export function calculateAllModes(
  from: Coordinates,
  to: Coordinates
): Record<TravelMode, TravelTimeResult> {
  return {
    walking: estimateTravelTime(from, to, 'walking'),
    transit: estimateTravelTime(from, to, 'transit'),
    driving: estimateTravelTime(from, to, 'driving'),
  };
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Check if two coordinates are the same (within threshold)
 */
export function isSameLocation(
  a: Coordinates,
  b: Coordinates,
  thresholdMeters: number = 50
): boolean {
  const distance = calculateHaversineDistance(a, b);
  return distance * 1000 < thresholdMeters;
}

/**
 * Get walking distance category for UI hints
 */
export function getWalkingCategory(
  distanceKm: number
): 'short' | 'medium' | 'long' | 'far' {
  if (distanceKm < 0.5) return 'short';   // < 5 min walk
  if (distanceKm < 1.5) return 'medium';  // 5-20 min walk
  if (distanceKm < 3) return 'long';      // 20-40 min walk
  return 'far';                           // Consider other transport
}

/**
 * Calculate time buffer for activities
 * Returns suggested buffer time in minutes based on activity type
 */
export function getActivityBuffer(
  activityType: string
): { before: number; after: number } {
  switch (activityType) {
    case 'restaurant':
      return { before: 10, after: 15 }; // Time to be seated, pay bill
    case 'hotel':
      return { before: 0, after: 0 };   // No buffer needed
    case 'flight':
      return { before: 120, after: 30 }; // Airport security, baggage
    case 'museum':
    case 'attraction':
      return { before: 10, after: 5 };  // Queue, exit
    case 'cafe':
      return { before: 5, after: 5 };   // Quick service
    default:
      return { before: 5, after: 5 };   // Default buffer
  }
}

/**
 * Check if travel between items is realistic given their times
 */
export function isTravelFeasible(
  departureTime: string,
  arrivalTime: string,
  travelMinutes: number
): { feasible: boolean; buffer: number } {
  const depMins = timeToMinutes(departureTime);
  const arrMins = timeToMinutes(arrivalTime);

  if (depMins === null || arrMins === null) {
    return { feasible: true, buffer: 0 }; // Can't determine, assume OK
  }

  const available = arrMins - depMins;
  const buffer = available - travelMinutes;

  return {
    feasible: buffer >= 0,
    buffer,
  };
}

function timeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}
