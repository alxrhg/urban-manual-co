/**
 * Trip Panel Components
 *
 * These components are used to display and edit item details
 * in a side panel within the trip planner.
 */

// Main container
export { default as ItemDetailPanel } from './ItemDetailPanel';

// Shared components
export { default as PanelHeader } from './PanelHeader';

// Content components
export { default as FlightPanelContent } from './FlightPanelContent';
export { default as HotelPanelContent } from './HotelPanelContent';
export { default as RestaurantPanelContent } from './RestaurantPanelContent';
export { default as AttractionPanelContent } from './AttractionPanelContent';

// Types
export type {
  TripSettings,
  Flight,
  HotelBooking,
  EnrichedItem,
  ItemCategory,
} from './types';
export { getItemCategory } from './types';
