/**
 * Trip Domain Model
 *
 * Stored entities:
 * - Trip, City, Stay, Leg, PlaceStop, FreeTime
 *
 * Derived events (computed, not stored):
 * - check-in, check-out, breakfast, departure, arrival, place, lounge, free-time
 *
 * @example
 * ```typescript
 * import { TripData, deriveDays, isPlaceEvent } from '@/lib/trip/domain';
 *
 * const days = deriveDays(tripData);
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
// Core Types (Stored Entities)
// =============================================================================

export type {
  ISODate,
  Time,
  Minutes,
  DateAndTime,
  Coords,
  TripStatus,
  Trip,
  City,
  StayAmenities,
  Stay,
  SeatClass,
  FlightLeg,
  TrainLeg,
  Leg,
  PlaceCategory,
  Reservation,
  PlaceStop,
  FreeTimeKind,
  FreeTime,
  TripData,
} from "./types";

export {
  createTrip,
  createCity,
  createStay,
  createFlightLeg,
  createTrainLeg,
  createPlaceStop,
  createFreeTime,
  isFlightLeg,
  isTrainLeg,
} from "./types";

// =============================================================================
// Derived Types (Computed Views)
// =============================================================================

export type {
  CheckInEvent,
  CheckOutEvent,
  BreakfastEvent,
  LoungeEvent,
  DepartureEvent,
  ArrivalEvent,
  PlaceEvent,
  FreeTimeEvent,
  DayEvent,
  DayWarning,
  DayMetrics,
  TripDay,
} from "./derived";

export {
  // Time utilities
  timeToMins,
  minsToTime,
  addMins,
  subMins,
  durationMins,
  getDateRange,
  dayNumber,
  // Derivation
  deriveDays,
  getEventsForDate,
  getNightStays,
  // Type guards
  isCheckInEvent,
  isCheckOutEvent,
  isBreakfastEvent,
  isLoungeEvent,
  isDepartureEvent,
  isArrivalEvent,
  isPlaceEvent,
  isFreeTimeEvent,
} from "./derived";

// =============================================================================
// Utilities
// =============================================================================

export type { ValidationError, TripSummary } from "./utils";

export {
  // Trip queries
  tripNights,
  tripCities,
  isMultiCity,
  cityForDate,
  // Stay queries
  coveredNights,
  uncoveredNights,
  hasStay,
  totalStayCost,
  staysWithAmenity,
  // Leg queries
  totalLegCost,
  flightsWithLounge,
  // Place queries
  placesByCategory,
  placesWithReservation,
  placesForDate,
  unscheduledPlaces,
  flexiblePlaces,
  // Day queries
  daysWithWarnings,
  overstuffedDays,
  conflictDays,
  busiestDay,
  lightestDay,
  // Event filtering
  eventsByType,
  fixedEvents,
  flexibleEvents,
  eventsInRange,
  // Validation
  validate,
  isValid,
  // Mutations (immutable)
  addPlace,
  removePlace,
  updatePlace,
  movePlace,
  addStay,
  removeStay,
  addLeg,
  removeLeg,
  // Summary
  summarize,
} from "./utils";
