/**
 * src/features/trips - Consolidated Trip UI Module
 *
 * This module unifies trip-related components from:
 * - components/trip/ (builder, editor, timeline)
 * - components/trips/ (cards, widgets, displays)
 * - components/drawers/ (trip-specific drawers)
 *
 * Organization:
 * - Builder: Trip creation and editing workflow
 * - Cards: Itinerary item display cards
 * - Timeline: Timeline and canvas visualization
 * - Drawers: Trip-related drawers and editors
 * - Widgets: Trip stats and indicators
 *
 * Usage:
 *   import { TripPanel, FlightCard, TripStats } from '@/src/features/trips'
 */

// ============================================================================
// BUILDER COMPONENTS
// Main trip building interface
// ============================================================================
export { default as TripHeader } from "@/components/trip/TripHeader";
export { default as AIPlannerBar } from "@/components/trip/AIPlannerBar";
export { default as FloatingActionBar } from "@/components/trip/FloatingActionBar";
export { default as DayTimeline } from "@/components/trip/DayTimeline";
export { default as DayHeader } from "@/components/trip/DayHeader";
export { default as QuickActions } from "@/components/trip/QuickActions";
export { default as TripBuilderPanel } from "@/components/trip/TripBuilderPanel";

// TripBuilder subcomponents (from TripBuilder directory)
export {
  TripDrawer,
  TripFloatingBar,
  TripPanel,
  TripDayCard,
  TripItemRow,
  TripEmptyState,
  TripActions,
  ResponsiveTripUI,
  MobileTripSheet,
  MobileTripCard,
  MobileTripFloatingBar,
} from "@/components/trip/TripBuilder";
export { default as DestinationPalette } from "@/components/trip/TripBuilder/DestinationPalette";

// ============================================================================
// ITINERARY CARDS
// Display cards for different itinerary item types
// Use trips/ versions as canonical (more detailed, premium design)
// ============================================================================

// Flight cards
export { default as FlightCard } from "@/components/trips/FlightCard";
export { default as FlightStatusCard } from "@/components/trips/FlightStatusCard";

// Accommodation cards
export { default as HotelCard } from "@/components/trips/HotelCard";
export { default as HotelNightCard } from "@/components/trips/HotelNightCard";
export { default as HotelCheckInCard } from "@/components/trips/HotelCheckInCard";
export { default as HotelCheckOutCard } from "@/components/trips/HotelCheckOutCard";
export { default as HotelBreakfastCard } from "@/components/trips/HotelBreakfastCard";
export { default as LodgingCard } from "@/components/trips/LodgingCard";

// Activity and place cards
export { default as ActivityCard } from "@/components/trips/ActivityCard";
export { default as PlaceCard } from "@/components/trips/PlaceCard";
export { default as EventCard } from "@/components/trips/EventCard";
export { default as MealCard } from "@/components/trips/MealCard";

// Transport cards
export { default as TransportCard } from "@/components/trips/TransportCard";
export { default as TransitOptions } from "@/components/trips/TransitOptions";
export { default as AirlineLogoBadge } from "@/components/trips/AirlineLogoBadge";

// Trip display cards
export { default as TripCard } from "@/components/trips/TripCard";
export { default as TripItemCard } from "@/components/trips/TripItemCard";
export { default as TripCoverImage } from "@/components/trips/TripCoverImage";

// ============================================================================
// LEGACY CARDS (from trip/cards/)
// Some components wrap trips/ or provide alternative designs
// ============================================================================
export { default as AttractionCard } from "@/components/trip/cards/AttractionCard";
export { default as RestaurantCard } from "@/components/trip/cards/RestaurantCard";
export { default as OvernightCard } from "@/components/trip/cards/OvernightCard";
export { default as CustomCard } from "@/components/trip/cards/CustomCard";
export { default as FreeTimeGap } from "@/components/trip/cards/FreeTimeGap";
export { default as MinimalActivityCard } from "@/components/trip/cards/MinimalActivityCard";
export { default as ItineraryCard } from "@/components/trip/cards/ItineraryCard";

// ============================================================================
// TIMELINE & CANVAS
// Visual timeline and canvas-based trip displays
// ============================================================================
export { default as TripCanvas } from "@/components/trip/canvas/TripCanvas";
export { default as CanvasTimeline } from "@/components/trip/canvas/CanvasTimeline";
export { default as StudioPanel } from "@/components/trip/canvas/StudioPanel";

export { default as TimelineCard } from "@/components/trip/timeline/TimelineCard";
export { default as TimeGrid } from "@/components/trip/timeline/TimeGrid";
export { default as ConnectorLine } from "@/components/trip/timeline/ConnectorLine";
export { default as CurrentTimeIndicator } from "@/components/trip/timeline/CurrentTimeIndicator";

// Itinerary views
export { default as ItineraryView } from "@/components/trip/ItineraryView";
export { default as ItineraryViewRedesign } from "@/components/trip/itinerary/ItineraryViewRedesign";

// ============================================================================
// WIDGETS & INDICATORS
// Stats, health, and status displays
// Use trips/ versions as canonical (AI-powered, more sophisticated)
// ============================================================================
export { default as TripStats } from "@/components/trips/TripStats";
export { default as TripHealthIndicator } from "@/components/trips/TripHealthIndicator";
export { default as CrowdIndicator } from "@/components/trips/CrowdIndicator";
export { default as OpeningHoursIndicator } from "@/components/trips/OpeningHoursIndicator";
export { default as BestTimeToVisitWidget } from "@/components/trips/BestTimeToVisitWidget";
export { default as TripWeatherForecast } from "@/components/trips/TripWeatherForecast";
export { default as WeatherSwapAlert } from "@/components/trips/WeatherSwapAlert";
export { default as AvailabilityAlert } from "@/components/trips/AvailabilityAlert";
export { default as DayTimelineAnalysis } from "@/components/trips/DayTimelineAnalysis";

// ============================================================================
// BUCKET LIST & DISCOVERIES
// Auxiliary trip features
// ============================================================================
export { default as TripBucketList } from "@/components/trips/TripBucketList";
export { default as NearbyDiscoveries } from "@/components/trips/NearbyDiscoveries";
export { default as TripMapView } from "@/components/trips/TripMapView";

// ============================================================================
// EDITORS & NOTES
// Item editing components
// ============================================================================
export { default as ItemNotesEditor } from "@/components/trips/ItemNotesEditor";
export { default as TripNotesEditor } from "@/components/trips/TripNotesEditor";
export { default as TripEditorHeader } from "@/components/trip/editor/TripEditorHeader";
export { default as TripChecklist } from "@/components/trip/editor/TripChecklist";

// ============================================================================
// TRIP-SPECIFIC UI PRIMITIVES
// ============================================================================
export { TripButton, tripButtonVariants } from "@/components/trip/ui/trip-button";
export { TripCard as TripCardBase, TripCardHeader, TripCardContent, TripCardFooter } from "@/components/trip/ui/trip-card";
export { TripInput } from "@/components/trip/ui/trip-input";
export { TripTabs, TripTabsList, TripTabsTrigger, TripTabsContent } from "@/components/trip/ui/trip-tabs";

// ============================================================================
// DRAWERS (Trip-specific)
// Re-export trip-related drawers
// ============================================================================
export { default as TripOverviewDrawer } from "@/components/drawers/TripOverviewDrawer";
export { default as TripOverviewQuickDrawer } from "@/components/drawers/TripOverviewQuickDrawer";
export { default as TripListDrawer } from "@/components/drawers/TripListDrawer";
export { default as TripSettingsDrawer } from "@/components/drawers/TripSettingsDrawer";
export { default as AddFlightDrawer } from "@/components/drawers/AddFlightDrawer";
export { default as AddHotelDrawer } from "@/components/drawers/AddHotelDrawer";
export { default as POIEditorDrawer } from "@/components/drawers/POIEditorDrawer";
export { default as PlaceSelectorDrawer } from "@/components/drawers/PlaceSelectorDrawer";
export { default as EventDetailDrawer } from "@/components/drawers/EventDetailDrawer";
export { default as AISuggestionsDrawer } from "@/components/drawers/AISuggestionsDrawer";

// ============================================================================
// UTILITIES
// ============================================================================
export * from "@/components/trips/flight-utils";
