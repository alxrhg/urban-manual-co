/**
 * Trips Feature Module
 *
 * Unified trip planning functionality including:
 * - TripContext: Consolidated state management for builder and editor modes
 * - Components: Shared UI components (cards, rows, stats)
 * - Types: Unified type definitions
 *
 * Usage:
 * ```tsx
 * // Import context and hook
 * import { TripProvider, useTrip } from '@/features/trips';
 *
 * // Import components
 * import { FlightCard, TripStats, TripItemRow } from '@/features/trips/components';
 *
 * // Import types
 * import type { TripItem, TripDay, ActiveTrip } from '@/features/trips/types';
 * ```
 */

// Context
export { TripProvider, useTrip } from './context';
export type { TripContextType } from './context';

// Components
export { FlightCard, TripStats, TripItemRow } from './components';

// Types
export * from './types';
