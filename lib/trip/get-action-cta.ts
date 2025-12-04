/**
 * Generate action CTAs for trip cards
 */

import type { TripStats } from './get-trip-state';

/**
 * Get an action CTA based on trip planning state
 * Returns null if the trip has sufficient plans
 */
export function getActionCTA(stats: TripStats): string | null {
  const total = stats.flights + stats.hotels + stats.restaurants + stats.places;

  // Empty trip - encourage starting
  if (total === 0) {
    return 'Start planning \u2192';
  }

  // Has some items but missing key logistics
  if (stats.flights === 0 && stats.hotels === 0) {
    return 'Add flights or hotel \u2192';
  }

  if (stats.flights === 0) {
    return 'Add flights \u2192';
  }

  if (stats.hotels === 0) {
    return 'Add hotel \u2192';
  }

  // Has logistics but very few activities
  if (stats.restaurants + stats.places < 2) {
    return 'Add more plans \u2192';
  }

  // Well-planned trip
  return null;
}
