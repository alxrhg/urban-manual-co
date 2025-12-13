/**
 * Trip utilities and domain model
 */

export { getTripState, getTotalItems } from './get-trip-state';
export type { TripState, TripStats } from './get-trip-state';

export { getTimeLabel, getDaysUntil } from './get-time-label';

export { getActionCTA } from './get-action-cta';

// Domain model re-exports
export * from './domain';
