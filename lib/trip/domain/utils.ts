/**
 * Utility functions for Trip Domain Model
 *
 * Helpers for querying, filtering, and manipulating trip data.
 */

import type {
  Trip,
  TripAggregate,
  TripDestination,
  Stay,
  FlightLeg,
  TrainLeg,
  PlaceVisit,
  FreeTimeBlock,
  ISODate,
  TimeString,
  PlaceCategory,
} from "./types";
import type { TripDay, DayEvent } from "./derived";
import { getDateRange, deriveTripDays, timeToMinutes } from "./derived";

// =============================================================================
// Trip Queries
// =============================================================================

/**
 * Get total number of nights in a trip
 */
export function getTripNights(trip: Trip): number {
  const dates = getDateRange(trip.startDate, trip.endDate);
  return dates.length - 1; // Nights = days - 1
}

/**
 * Get all cities in a trip (from destinations)
 */
export function getTripCities(destinations: TripDestination[]): string[] {
  return destinations.map((d) => d.city);
}

/**
 * Check if a trip is multi-city
 */
export function isMultiCityTrip(destinations: TripDestination[]): boolean {
  const uniqueCities = new Set(destinations.map((d) => d.city));
  return uniqueCities.size > 1;
}

/**
 * Get the current destination for a given date
 */
export function getCurrentDestination(
  date: ISODate,
  destinations: TripDestination[]
): TripDestination | undefined {
  return destinations.find((d) => date >= d.arrivalDate && date <= d.departureDate);
}

// =============================================================================
// Stay Queries
// =============================================================================

/**
 * Get total nights covered by stays
 */
export function getCoveredNights(stays: Stay[], trip: Trip): number {
  const dates = getDateRange(trip.startDate, trip.endDate).slice(0, -1);
  return dates.filter((date) =>
    stays.some((s) => s.checkIn.date <= date && s.checkOut.date > date)
  ).length;
}

/**
 * Get nights without a hotel booked
 */
export function getUncoveredNights(stays: Stay[], trip: Trip): ISODate[] {
  const dates = getDateRange(trip.startDate, trip.endDate).slice(0, -1);
  return dates.filter(
    (date) => !stays.some((s) => s.checkIn.date <= date && s.checkOut.date > date)
  );
}

/**
 * Check if a specific night has a stay booked
 */
export function hasStayForNight(date: ISODate, stays: Stay[]): boolean {
  return stays.some((s) => s.checkIn.date <= date && s.checkOut.date > date);
}

/**
 * Get total hotel cost for a trip
 */
export function getTotalHotelCost(stays: Stay[]): { amount: number; currency: string }[] {
  const costsByCurrency = new Map<string, number>();

  for (const stay of stays) {
    if (stay.pricePerNight && stay.currency) {
      const nights = getDateRange(stay.checkIn.date, stay.checkOut.date).length - 1;
      const current = costsByCurrency.get(stay.currency) ?? 0;
      costsByCurrency.set(stay.currency, current + stay.pricePerNight * nights);
    }
  }

  return Array.from(costsByCurrency.entries()).map(([currency, amount]) => ({
    amount,
    currency,
  }));
}

/**
 * Get stays with specific amenity
 */
export function getStaysWithAmenity(
  stays: Stay[],
  amenity: keyof Stay["amenities"]
): Stay[] {
  return stays.filter((s) => s.amenities[amenity]);
}

// =============================================================================
// Flight Queries
// =============================================================================

/**
 * Get flights grouped by connection (same connectionGroupId)
 */
export function getFlightConnections(
  flights: FlightLeg[]
): Map<string, FlightLeg[]> {
  const connections = new Map<string, FlightLeg[]>();

  for (const flight of flights) {
    const groupId = flight.connectionGroupId ?? flight.id;
    const existing = connections.get(groupId) ?? [];
    connections.set(groupId, [...existing, flight]);
  }

  // Sort each group by leg order
  for (const [groupId, legs] of connections) {
    connections.set(
      groupId,
      legs.sort((a, b) => (a.legOrder ?? 0) - (b.legOrder ?? 0))
    );
  }

  return connections;
}

/**
 * Get all flights with lounge access
 */
export function getFlightsWithLounge(flights: FlightLeg[]): FlightLeg[] {
  return flights.filter((f) => f.loungeAccess);
}

/**
 * Get total flight cost
 */
export function getTotalFlightCost(flights: FlightLeg[]): { amount: number; currency: string }[] {
  const costsByCurrency = new Map<string, number>();

  for (const flight of flights) {
    if (flight.price && flight.currency) {
      const current = costsByCurrency.get(flight.currency) ?? 0;
      costsByCurrency.set(flight.currency, current + flight.price);
    }
  }

  return Array.from(costsByCurrency.entries()).map(([currency, amount]) => ({
    amount,
    currency,
  }));
}

// =============================================================================
// Place Queries
// =============================================================================

/**
 * Get places by category
 */
export function getPlacesByCategory(
  places: PlaceVisit[],
  category: PlaceCategory
): PlaceVisit[] {
  return places.filter((p) => p.category === category);
}

/**
 * Get places with reservations
 */
export function getPlacesWithReservations(places: PlaceVisit[]): PlaceVisit[] {
  return places.filter((p) => p.reservation != null);
}

/**
 * Get places for a specific date
 */
export function getPlacesForDate(places: PlaceVisit[], date: ISODate): PlaceVisit[] {
  return places.filter((p) => p.date === date);
}

/**
 * Get unscheduled places (no time set)
 */
export function getUnscheduledPlaces(places: PlaceVisit[]): PlaceVisit[] {
  return places.filter((p) => !p.startTime && !p.reservation?.time);
}

/**
 * Get flexible places that can be moved
 */
export function getFlexiblePlaces(places: PlaceVisit[]): PlaceVisit[] {
  return places.filter((p) => p.isFlexible);
}

// =============================================================================
// Day Queries
// =============================================================================

/**
 * Get days with warnings
 */
export function getDaysWithWarnings(days: TripDay[]): TripDay[] {
  return days.filter((d) => d.metrics.warnings.length > 0);
}

/**
 * Get overstuffed days
 */
export function getOverstuffedDays(days: TripDay[]): TripDay[] {
  return days.filter((d) => d.metrics.isOverstuffed);
}

/**
 * Get days with time conflicts
 */
export function getDaysWithConflicts(days: TripDay[]): TripDay[] {
  return days.filter((d) =>
    d.metrics.warnings.some((w) => w.type === "time_conflict")
  );
}

/**
 * Get busiest day (most scheduled minutes)
 */
export function getBusiestDay(days: TripDay[]): TripDay | undefined {
  if (days.length === 0) return undefined;
  return days.reduce((busiest, day) =>
    day.metrics.scheduledMinutes > busiest.metrics.scheduledMinutes ? day : busiest
  );
}

/**
 * Get lightest day (fewest scheduled minutes)
 */
export function getLightestDay(days: TripDay[]): TripDay | undefined {
  if (days.length === 0) return undefined;
  return days.reduce((lightest, day) =>
    day.metrics.scheduledMinutes < lightest.metrics.scheduledMinutes ? day : lightest
  );
}

// =============================================================================
// Event Filtering
// =============================================================================

/**
 * Filter events by type
 */
export function filterEventsByType<T extends DayEvent["type"]>(
  events: DayEvent[],
  type: T
): Extract<DayEvent, { type: T }>[] {
  return events.filter((e) => e.type === type) as Extract<DayEvent, { type: T }>[];
}

/**
 * Get fixed events only
 */
export function getFixedEvents(events: DayEvent[]): DayEvent[] {
  return events.filter((e) => e.isFixed);
}

/**
 * Get flexible events only
 */
export function getFlexibleEvents(events: DayEvent[]): DayEvent[] {
  return events.filter((e) => !e.isFixed);
}

/**
 * Get events within a time range
 */
export function getEventsInTimeRange(
  events: DayEvent[],
  startTime: TimeString,
  endTime: TimeString
): DayEvent[] {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  return events.filter((e) => {
    const eventStart = timeToMinutes(e.startTime);
    const eventEnd = timeToMinutes(e.endTime);
    // Event overlaps with range if event doesn't end before range starts
    // and doesn't start after range ends
    return eventEnd > start && eventStart < end;
  });
}

// =============================================================================
// Validation
// =============================================================================

export interface ValidationError {
  type: string;
  message: string;
  entityId?: string;
  field?: string;
}

/**
 * Validate a trip aggregate for common issues
 */
export function validateTripAggregate(aggregate: TripAggregate): ValidationError[] {
  const errors: ValidationError[] = [];

  // Trip dates
  if (aggregate.trip.startDate > aggregate.trip.endDate) {
    errors.push({
      type: "invalid_dates",
      message: "Trip end date must be after start date",
      field: "endDate",
    });
  }

  // Destinations coverage
  const tripDates = getDateRange(aggregate.trip.startDate, aggregate.trip.endDate);
  for (const date of tripDates) {
    const destination = aggregate.destinations.find(
      (d) => date >= d.arrivalDate && date <= d.departureDate
    );
    if (!destination) {
      errors.push({
        type: "uncovered_date",
        message: `No destination assigned for ${date}`,
        field: "destinations",
      });
    }
  }

  // Stay validation
  for (const stay of aggregate.stays) {
    if (stay.checkIn.date > stay.checkOut.date) {
      errors.push({
        type: "invalid_stay_dates",
        message: `Stay "${stay.name}" has check-out before check-in`,
        entityId: stay.id,
      });
    }
    if (stay.checkIn.date < aggregate.trip.startDate) {
      errors.push({
        type: "stay_outside_trip",
        message: `Stay "${stay.name}" check-in is before trip starts`,
        entityId: stay.id,
      });
    }
    if (stay.checkOut.date > aggregate.trip.endDate) {
      errors.push({
        type: "stay_outside_trip",
        message: `Stay "${stay.name}" check-out is after trip ends`,
        entityId: stay.id,
      });
    }
  }

  // Flight validation
  for (const flight of aggregate.flights) {
    const depDate = flight.departure.dateTime.date;
    const arrDate = flight.arrival.dateTime.date;
    if (depDate < aggregate.trip.startDate || arrDate > aggregate.trip.endDate) {
      errors.push({
        type: "flight_outside_trip",
        message: `Flight ${flight.flightNumber} is outside trip dates`,
        entityId: flight.id,
      });
    }
  }

  // Place validation
  for (const place of aggregate.places) {
    if (place.date < aggregate.trip.startDate || place.date > aggregate.trip.endDate) {
      errors.push({
        type: "place_outside_trip",
        message: `Place "${place.title}" is scheduled outside trip dates`,
        entityId: place.id,
      });
    }
  }

  return errors;
}

/**
 * Check if a trip aggregate is valid
 */
export function isValidTripAggregate(aggregate: TripAggregate): boolean {
  return validateTripAggregate(aggregate).length === 0;
}

// =============================================================================
// Trip Manipulation
// =============================================================================

/**
 * Add a place to a trip aggregate (immutable)
 */
export function addPlace(
  aggregate: TripAggregate,
  place: PlaceVisit
): TripAggregate {
  return {
    ...aggregate,
    places: [...aggregate.places, place],
  };
}

/**
 * Remove a place from a trip aggregate (immutable)
 */
export function removePlace(
  aggregate: TripAggregate,
  placeId: string
): TripAggregate {
  return {
    ...aggregate,
    places: aggregate.places.filter((p) => p.id !== placeId),
  };
}

/**
 * Update a place in a trip aggregate (immutable)
 */
export function updatePlace(
  aggregate: TripAggregate,
  placeId: string,
  updates: Partial<PlaceVisit>
): TripAggregate {
  return {
    ...aggregate,
    places: aggregate.places.map((p) =>
      p.id === placeId ? { ...p, ...updates } : p
    ),
  };
}

/**
 * Move a place to a different day
 */
export function movePlaceToDay(
  aggregate: TripAggregate,
  placeId: string,
  newDate: ISODate,
  newStartTime?: TimeString
): TripAggregate {
  return updatePlace(aggregate, placeId, {
    date: newDate,
    startTime: newStartTime,
  });
}

/**
 * Add a stay to a trip aggregate (immutable)
 */
export function addStay(aggregate: TripAggregate, stay: Stay): TripAggregate {
  return {
    ...aggregate,
    stays: [...aggregate.stays, stay],
  };
}

/**
 * Remove a stay from a trip aggregate (immutable)
 */
export function removeStay(
  aggregate: TripAggregate,
  stayId: string
): TripAggregate {
  return {
    ...aggregate,
    stays: aggregate.stays.filter((s) => s.id !== stayId),
  };
}

/**
 * Add a flight to a trip aggregate (immutable)
 */
export function addFlight(
  aggregate: TripAggregate,
  flight: FlightLeg
): TripAggregate {
  return {
    ...aggregate,
    flights: [...aggregate.flights, flight],
  };
}

/**
 * Remove a flight from a trip aggregate (immutable)
 */
export function removeFlight(
  aggregate: TripAggregate,
  flightId: string
): TripAggregate {
  return {
    ...aggregate,
    flights: aggregate.flights.filter((f) => f.id !== flightId),
  };
}

// =============================================================================
// Summary Generation
// =============================================================================

export interface TripSummary {
  title: string;
  cities: string[];
  dateRange: { start: ISODate; end: ISODate };
  duration: { days: number; nights: number };
  totalFlights: number;
  totalTrains: number;
  totalStays: number;
  totalPlaces: number;
  placesWithReservations: number;
  hasUncoveredNights: boolean;
  uncoveredNightCount: number;
  hasWarnings: boolean;
  warningCount: number;
}

/**
 * Generate a summary of a trip
 */
export function generateTripSummary(aggregate: TripAggregate): TripSummary {
  const days = deriveTripDays(aggregate);
  const uncoveredNights = getUncoveredNights(aggregate.stays, aggregate.trip);
  const daysWithWarnings = getDaysWithWarnings(days);

  return {
    title: aggregate.trip.title,
    cities: getTripCities(aggregate.destinations),
    dateRange: {
      start: aggregate.trip.startDate,
      end: aggregate.trip.endDate,
    },
    duration: {
      days: days.length,
      nights: getTripNights(aggregate.trip),
    },
    totalFlights: aggregate.flights.length,
    totalTrains: aggregate.trains.length,
    totalStays: aggregate.stays.length,
    totalPlaces: aggregate.places.length,
    placesWithReservations: getPlacesWithReservations(aggregate.places).length,
    hasUncoveredNights: uncoveredNights.length > 0,
    uncoveredNightCount: uncoveredNights.length,
    hasWarnings: daysWithWarnings.length > 0,
    warningCount: daysWithWarnings.reduce(
      (sum, d) => sum + d.metrics.warnings.length,
      0
    ),
  };
}
