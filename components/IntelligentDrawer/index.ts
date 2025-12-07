/**
 * IntelligentDrawer - Universal Intelligent Drawer System
 *
 * A unified drawer that integrates with the homepage travel intelligence.
 * Provides a consistent, smart drawer experience across all features.
 *
 * @example
 * // In your app layout:
 * import { IntelligentDrawerProvider, IntelligentDrawer } from '@/components/IntelligentDrawer';
 *
 * function Layout({ children }) {
 *   return (
 *     <IntelligentDrawerProvider>
 *       {children}
 *       <IntelligentDrawer />
 *     </IntelligentDrawerProvider>
 *   );
 * }
 *
 * // To open a destination with trip awareness:
 * import { useDestinationDrawer } from '@/components/IntelligentDrawer';
 *
 * function DestinationCard({ destination }) {
 *   const { openDestination, addToTripQuick, activeTripInfo } = useDestinationDrawer();
 *
 *   return (
 *     <div>
 *       <button onClick={() => openDestination(destination)}>View</button>
 *       {activeTripInfo && (
 *         <TripContextBadge destination={destination} />
 *       )}
 *     </div>
 *   );
 * }
 *
 * // To open trip editor:
 * import { useTripDrawer } from '@/components/IntelligentDrawer';
 *
 * function TripButton() {
 *   const { openTrip, openTripSelector, activeTripInfo } = useTripDrawer();
 *
 *   return (
 *     <button onClick={() => activeTripInfo ? openTrip() : openTripSelector()}>
 *       Trip
 *     </button>
 *   );
 * }
 */

// Main components
export { default as IntelligentDrawer } from './IntelligentDrawer';
export { default as DrawerShell } from './DrawerShell';

// Content modules
export { default as DestinationContent } from './DestinationContent';
export { default as SimilarContent } from './SimilarContent';
export { default as WhyThisContent } from './WhyThisContent';
export { default as TripContent } from './TripContent';
export { default as TripSelectorContent } from './TripSelectorContent';
export { default as AddToTripContent } from './AddToTripContent';

// Trip context badge for cards
export { default as TripContextBadge, TripContextBadgeFloating } from './TripContextBadge';

// Context and hooks
export {
  IntelligentDrawerProvider,
  useIntelligentDrawer,
  useDestinationDrawer,
  useTripDrawer,
} from './IntelligentDrawerContext';

// Types
export type {
  DrawerMode,
  DrawerSize,
  DrawerPosition,
  DrawerSuggestion,
  DrawerContext,
  DrawerState,
  DrawerHistoryItem,
  IntelligentDrawerProps,
  DrawerShellProps,
  DrawerHeaderProps,
  DrawerContentProps,
  DestinationContentProps,
  SuggestionsBarProps,
  QuickActionsProps,
  IntelligentDrawerContextType,
  TripFitAnalysis,
  TripContextInfo,
} from './types';

// Default export
export { default } from './IntelligentDrawer';
