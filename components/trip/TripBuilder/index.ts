/**
 * TripBuilder - Intelligent Trip Planning Experience
 *
 * A reimagined trip planner that integrates seamlessly with the
 * homepage's travel intelligence. Features:
 *
 * - TripDrawer: Bottom sheet interface with multiple views
 * - TripFloatingBar: Persistent trip access while browsing
 * - TripContextBadge: Smart suggestions on destination cards
 * - TripPanel: Full-featured side panel (legacy)
 *
 * @example
 * // Use the modern drawer interface
 * import { TripDrawer, TripFloatingBar } from '@/components/trip/TripBuilder';
 *
 * function App() {
 *   return (
 *     <>
 *       <TripFloatingBar />
 *       <TripDrawer />
 *     </>
 *   );
 * }
 *
 * // Add context badges to destination cards
 * import { TripContextBadge } from '@/components/trip/TripBuilder';
 *
 * <TripContextBadge destination={destination} />
 */

// Primary components (new intelligent interface)
export { default as TripDrawer } from './TripDrawer';
export { default as TripFloatingBar } from './TripFloatingBar';
export { default as TripContextBadge } from './TripContextBadge';

// Panel components (side panel architecture)
export { default as TripPanel } from './TripPanel';
export { default as TripHeader } from './TripHeader';
export { default as TripDayCard } from './TripDayCard';
export { default as TripItemRow } from './TripItemRow';
export { default as TripEmptyState } from './TripEmptyState';
export { default as TripActions } from './TripActions';

// Insight components
export {
  TripInsightsBar,
  TripHealthBadge,
  TripHealthCard,
} from './TripInsightsBar';

// Hooks
export {
  useExpandedDays,
  useDragDrop,
  useInlineEdit,
  useDropdown,
  useTripStats,
} from './hooks';

// Utilities
export {
  formatDuration,
  formatDate,
  formatTimeSlot,
  getCrowdColor,
  getHealthColor,
  getInsightColor,
  openDestination,
  copyToClipboard,
  isValidTimeSlot,
  isValidDate,
  moveArrayItem,
  getDayNumbers,
} from './utils';

// Types
export type {
  TripItem,
  TripDay,
  Trip,
  TripSummary,
  InsightType,
  InsightIcon,
  DayInsight,
  TripHealth,
  TripAction,
  TripPanelProps,
  TripHeaderProps,
  TripDayCardProps,
  TripItemRowProps,
  TripEmptyStateProps,
  TripActionsProps,
  TripInsightsBarProps,
} from './types';

// Default export (TripDrawer as main component)
export { default } from './TripDrawer';
