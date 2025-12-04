/**
 * Itinerary Components - Hybrid Card + Minimal Design System
 *
 * This module provides a modern, editorial-style itinerary view with:
 * - Full visual cards for major items (flights, hotels, restaurants, attractions)
 * - Minimal text rows for lightweight items (breakfast, coffee, activities)
 * - Clean travel connectors between items
 * - Smart gap suggestions for free time
 * - Editorial day headers
 */

// Main card component (handles routing to specialized cards)
export { default as ItineraryCard } from './ItineraryCard';

// Minimal row component (for lightweight items)
export {
  default as ItineraryMinimalRow,
  BreakfastRow,
  CheckoutRow,
  NightStayRow,
} from './ItineraryMinimalRow';

// Travel connectors
export {
  default as TravelConnector,
  InteractiveTravelConnector,
  CompactTravelConnector,
} from './TravelConnector';

// Gap suggestions
export {
  default as GapSuggestion,
  CompactGapIndicator,
  AISuggestionBanner,
} from './GapSuggestion';

// Day headers
export {
  default as DayHeader,
  CompactDayHeader,
  DayNavigation,
  DayDivider,
} from './DayHeader';

// Re-export the main view
export { default as ItineraryViewRedesign } from './ItineraryViewRedesign';
