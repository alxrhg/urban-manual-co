/**
 * Determine the state of a trip based on dates and planning status
 */

export type TripState = 'upcoming' | 'planning' | 'past';

export interface TripStats {
  flights: number;
  hotels: number;
  restaurants: number;
  places: number;
}

/**
 * Get the current state of a trip
 * - 'past': Trip end date has passed
 * - 'planning': Future trip with no or minimal plans
 * - 'upcoming': Future trip with meaningful plans
 */
export function getTripState(
  endDate: string | null | undefined,
  startDate: string | null | undefined,
  stats: TripStats
): TripState {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if trip has ended
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (end < today) {
      return 'past';
    }
  }

  // Check if trip has meaningful plans
  const totalItems = stats.flights + stats.hotels + stats.restaurants + stats.places;

  if (totalItems === 0) {
    return 'planning';
  }

  return 'upcoming';
}

/**
 * Get total item count from stats
 */
export function getTotalItems(stats: TripStats): number {
  return stats.flights + stats.hotels + stats.restaurants + stats.places;
}
