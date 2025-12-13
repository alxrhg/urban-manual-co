/**
 * Trip Components - Barrel Export
 *
 * All trip-related UI components in one place.
 * Import from '@/features/trips/components' for cleaner imports.
 */

// Card components
export { FlightCard } from './FlightCard';
export { TripStats } from './TripStats';
export { TripItemRow } from './TripItemRow';

// Re-export types for convenience
export type { TripItem, PlaceItem, FlightItem, TrainItem, HotelItem, ActivityItem } from '../types';
