/**
 * Trip Domain Model
 *
 * A clean domain model for trip planning with:
 * - Multi-city trips with explicit city-to-date mapping
 * - Hotel "stays" spanning date ranges (not individual nights)
 * - Flight and train legs as explicit segments
 * - Per-day events derived from underlying data (not stored as rows)
 *
 * @example
 * ```typescript
 * import {
 *   Trip,
 *   TripAggregate,
 *   deriveTripDays,
 *   deriveTripDayView,
 *   createStay,
 *   isPlaceEvent,
 * } from '@/lib/trip/domain';
 *
 * // Derive daily views from a trip aggregate
 * const days = deriveTripDays(tripAggregate);
 *
 * // Filter events by type
 * for (const day of days) {
 *   for (const event of day.events) {
 *     if (isPlaceEvent(event)) {
 *       console.log(event.place.title);
 *     }
 *   }
 * }
 * ```
 */

// =============================================================================
// Core Domain Types
// =============================================================================

export type {
  // Identifiers
  TripId,
  StayId,
  FlightLegId,
  PlaceVisitId,
  TripDestinationId,
  // Value Objects
  ISODate,
  TimeString,
  Minutes,
  TimeRange,
  DateTimePoint,
  GeoLocation,
  // Enums/Status
  TripStatus,
  TripSettings,
  SeatClass,
  PlaceCategory,
  FreeTimeType,
  // Core Entities
  Traveler,
  Trip,
  TripDestination,
  Stay,
  StayAmenities,
  FlightLeg,
  Airport,
  TrainLeg,
  PlaceVisit,
  Reservation,
  FreeTimeBlock,
  // Aggregates
  TripAggregate,
} from "./types";

export {
  DEFAULT_TRIP_SETTINGS,
  DEFAULT_STAY_AMENITIES,
  // Factory functions
  createTrip,
  createTripDestination,
  createStay,
  createFlightLeg,
  createPlaceVisit,
  createFreeTimeBlock,
} from "./types";

// =============================================================================
// Derived View Types
// =============================================================================

export type {
  // Event types
  DayEvent,
  FlightDepartureEvent,
  FlightArrivalEvent,
  TrainDepartureEvent,
  TrainArrivalEvent,
  CheckInEvent,
  CheckOutEvent,
  BreakfastEvent,
  LoungeEvent,
  PlaceEvent,
  FreeTimeEvent,
  TransitEvent,
  // Day types
  TripDay,
  TripDayView,
  DayMetrics,
  DayWarning,
} from "./derived";

export {
  // Time utilities
  timeToMinutes,
  minutesToTime,
  calculateDuration,
  addMinutesToTime,
  subtractMinutesFromTime,
  getDateRange,
  getDayNumber,
  // Derivation functions
  deriveTripDays,
  deriveTripDayView,
  getEventsForDay,
  deriveNightStays,
  // Type guards for events
  isFlightDepartureEvent,
  isFlightArrivalEvent,
  isTrainDepartureEvent,
  isTrainArrivalEvent,
  isCheckInEvent,
  isCheckOutEvent,
  isBreakfastEvent,
  isLoungeEvent,
  isPlaceEvent,
  isFreeTimeEvent,
  isTransitEvent,
  isTransportEvent,
  isStayEvent,
} from "./derived";

// =============================================================================
// Utility Functions
// =============================================================================

export type { ValidationError, TripSummary } from "./utils";

export {
  // Trip queries
  getTripNights,
  getTripCities,
  isMultiCityTrip,
  getCurrentDestination,
  // Stay queries
  getCoveredNights,
  getUncoveredNights,
  hasStayForNight,
  getTotalHotelCost,
  getStaysWithAmenity,
  // Flight queries
  getFlightConnections,
  getFlightsWithLounge,
  getTotalFlightCost,
  // Place queries
  getPlacesByCategory,
  getPlacesWithReservations,
  getPlacesForDate,
  getUnscheduledPlaces,
  getFlexiblePlaces,
  // Day queries
  getDaysWithWarnings,
  getOverstuffedDays,
  getDaysWithConflicts,
  getBusiestDay,
  getLightestDay,
  // Event filtering
  filterEventsByType,
  getFixedEvents,
  getFlexibleEvents,
  getEventsInTimeRange,
  // Validation
  validateTripAggregate,
  isValidTripAggregate,
  // Trip manipulation (immutable)
  addPlace,
  removePlace,
  updatePlace,
  movePlaceToDay,
  addStay,
  removeStay,
  addFlight,
  removeFlight,
  // Summary
  generateTripSummary,
} from "./utils";
