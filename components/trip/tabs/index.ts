/**
 * Trip tab components
 *
 * These components provide the main content areas for the trip planning interface.
 */

// Main tabs
export { default as ItineraryTab } from './ItineraryTab';
export { default as FlightsTab } from './FlightsTab';
export { default as HotelsTab } from './HotelsTab';
export { default as NotesTab } from './NotesTab';

// Types re-exported for convenience
export type { Flight, HotelBooking, DayWeather } from './ItineraryTab';
export type { TripNote, TripNoteChecklistItem, TripAttachment } from './NotesTab';
