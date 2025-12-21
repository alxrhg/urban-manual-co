/**
 * TripBuilder - Intelligent Trip Planning Experience
 *
 * A reimagined trip planner that integrates seamlessly with the
 * homepage's travel intelligence. Features:
 *
 * - TripDrawer: Bottom sheet interface with multiple views
 * - TripFloatingBar: Persistent trip access while browsing
 * - TripPanel: Full-featured side panel (legacy)
 *
 * @example
 * // Use the modern drawer interface
 * import { TripDrawer, TripFloatingBar } from '@/features/trip/components/builder';
 *
 * function App() {
 *   return (
 *     <>
 *       <TripFloatingBar />
 *       <TripDrawer />
 *     </>
 *   );
 * }
 */

// Primary components (new intelligent interface)
export { default as TripDrawer } from './TripDrawer';
export { default as TripFloatingBar } from './TripFloatingBar';

// Mobile-optimized components (redesigned)
export { default as MobileTripSheet } from './MobileTripSheet';
export { default as MobileTripCard } from './MobileTripCard';
export { default as MobileTripFloatingBar } from './MobileTripFloatingBar';

// Responsive wrapper (auto-switches between mobile/desktop)
export { default as ResponsiveTripUI } from './ResponsiveTripUI';

// Unified Trip Planner Modal
export { default as TripPlannerModal } from '../TripPlannerModal';

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
