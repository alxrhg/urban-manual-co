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
 * // To open a destination:
 * import { useIntelligentDrawer } from '@/components/IntelligentDrawer';
 *
 * function DestinationCard({ destination }) {
 *   const { open } = useIntelligentDrawer();
 *
 *   return (
 *     <button onClick={() => open('destination', { destination })}>
 *       View
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

// Context and hooks
export {
  IntelligentDrawerProvider,
  useIntelligentDrawer,
  useDestinationDrawer,
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
} from './types';

// Default export
export { default } from './IntelligentDrawer';
