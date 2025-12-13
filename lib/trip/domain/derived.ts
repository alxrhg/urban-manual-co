/**
 * Derived Views for Trip Domain
 *
 * This module provides computed/derived views of trip data.
 * Daily events are NOT stored - they are computed from the underlying
 * entities (stays, flights, places, etc.)
 *
 * Key principle: The source of truth is the domain entities.
 * Daily views are projections/transformations of that data.
 */

import type {
  ISODate,
  TimeString,
  Minutes,
  Trip,
  TripDestination,
  Stay,
  FlightLeg,
  TrainLeg,
  PlaceVisit,
  FreeTimeBlock,
  TripAggregate,
  GeoLocation,
} from "./types";

// =============================================================================
// Day Event Types (Discriminated Union)
// =============================================================================

interface BaseEvent {
  /** Unique ID for this event instance */
  id: string;
  /** Start time of the event */
  startTime: TimeString;
  /** End time of the event */
  endTime: TimeString;
  /** Duration in minutes */
  duration: Minutes;
  /** Whether this event has a fixed time (reservation, flight, etc.) */
  isFixed: boolean;
}

export interface FlightDepartureEvent extends BaseEvent {
  type: "flight_departure";
  flight: FlightLeg;
  /** Suggested arrival time at airport (includes buffer) */
  airportArrivalTime: TimeString;
}

export interface FlightArrivalEvent extends BaseEvent {
  type: "flight_arrival";
  flight: FlightLeg;
}

export interface TrainDepartureEvent extends BaseEvent {
  type: "train_departure";
  train: TrainLeg;
  /** Suggested arrival time at station */
  stationArrivalTime: TimeString;
}

export interface TrainArrivalEvent extends BaseEvent {
  type: "train_arrival";
  train: TrainLeg;
}

export interface CheckInEvent extends BaseEvent {
  type: "check_in";
  stay: Stay;
}

export interface CheckOutEvent extends BaseEvent {
  type: "check_out";
  stay: Stay;
}

export interface BreakfastEvent extends BaseEvent {
  type: "breakfast";
  stay: Stay;
}

export interface LoungeEvent extends BaseEvent {
  type: "lounge";
  /** Either hotel lounge or airport lounge */
  source: "hotel" | "airport";
  stay?: Stay;
  flight?: FlightLeg;
  loungeName?: string;
}

export interface PlaceEvent extends BaseEvent {
  type: "place";
  place: PlaceVisit;
  hasReservation: boolean;
}

export interface FreeTimeEvent extends BaseEvent {
  type: "free_time";
  freeTime: FreeTimeBlock;
}

export interface TransitEvent extends BaseEvent {
  type: "transit";
  from: {
    name: string;
    location?: GeoLocation;
  };
  to: {
    name: string;
    location?: GeoLocation;
  };
  /** Estimated travel time in minutes */
  travelTime: Minutes;
  /** Mode of transport */
  mode: "walk" | "transit" | "drive" | "unknown";
}

/**
 * Union of all possible day events.
 * Use the `type` discriminant for narrowing.
 */
export type DayEvent =
  | FlightDepartureEvent
  | FlightArrivalEvent
  | TrainDepartureEvent
  | TrainArrivalEvent
  | CheckInEvent
  | CheckOutEvent
  | BreakfastEvent
  | LoungeEvent
  | PlaceEvent
  | FreeTimeEvent
  | TransitEvent;

// =============================================================================
// Day Metrics
// =============================================================================

export interface DayMetrics {
  /** Total scheduled time in minutes */
  scheduledMinutes: Minutes;
  /** Total free/unscheduled time in minutes */
  freeMinutes: Minutes;
  /** Total transit time in minutes */
  transitMinutes: Minutes;
  /** Number of fixed events (reservations, flights) */
  fixedEventCount: number;
  /** Number of flexible events */
  flexibleEventCount: number;
  /** Day is potentially overscheduled */
  isOverstuffed: boolean;
  /** Warnings about the day's schedule */
  warnings: DayWarning[];
}

export interface DayWarning {
  type: "time_conflict" | "tight_transit" | "late_night" | "early_morning" | "overstuffed";
  message: string;
  /** Event IDs involved */
  eventIds: string[];
}

// =============================================================================
// Trip Day (Derived View)
// =============================================================================

/**
 * A single day's view of the trip.
 * This is a computed projection, not stored data.
 */
export interface TripDay {
  /** ISO date for this day */
  date: ISODate;
  /** Day number within the trip (1-indexed) */
  dayNumber: number;
  /** Which destination/city this day is in */
  destination?: TripDestination;
  /** Hotel stay for this night (if any) */
  stayingAt?: Stay;
  /** All events for this day, sorted by start time */
  events: DayEvent[];
  /** Computed metrics for the day */
  metrics: DayMetrics;
}

/**
 * Complete derived view of a trip organized by days.
 */
export interface TripDayView {
  trip: Trip;
  days: TripDay[];
  /** Total trip metrics */
  totalMetrics: {
    totalDays: number;
    totalFlights: number;
    totalTrains: number;
    totalStays: number;
    totalPlaces: number;
  };
}

// =============================================================================
// Time Utilities
// =============================================================================

/**
 * Parse a time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: TimeString): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): TimeString {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440; // Handle negative and overflow
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Calculate duration between two times in minutes
 */
export function calculateDuration(start: TimeString, end: TimeString): Minutes {
  const startMins = timeToMinutes(start);
  const endMins = timeToMinutes(end);
  // Handle overnight spans
  if (endMins < startMins) {
    return 1440 - startMins + endMins;
  }
  return endMins - startMins;
}

/**
 * Add minutes to a time string
 */
export function addMinutesToTime(time: TimeString, minutes: number): TimeString {
  const totalMinutes = timeToMinutes(time) + minutes;
  return minutesToTime(totalMinutes);
}

/**
 * Subtract minutes from a time string
 */
export function subtractMinutesFromTime(time: TimeString, minutes: number): TimeString {
  return addMinutesToTime(time, -minutes);
}

/**
 * Get all dates between start and end (inclusive)
 */
export function getDateRange(startDate: ISODate, endDate: ISODate): ISODate[] {
  const dates: ISODate[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Calculate day number from trip start date
 */
export function getDayNumber(tripStartDate: ISODate, currentDate: ISODate): number {
  const start = new Date(tripStartDate);
  const current = new Date(currentDate);
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 1-indexed
}

// =============================================================================
// Event Derivation Functions
// =============================================================================

const AIRPORT_BUFFER_MINUTES = 120; // 2 hours before departure
const TRAIN_BUFFER_MINUTES = 30; // 30 minutes before departure
const DEFAULT_CHECKIN_DURATION = 30;
const DEFAULT_CHECKOUT_DURATION = 30;
const DEFAULT_BREAKFAST_DURATION = 45;
const DEFAULT_LOUNGE_DURATION = 60;

/**
 * Find which destination a date falls within
 */
function findDestinationForDate(
  date: ISODate,
  destinations: TripDestination[]
): TripDestination | undefined {
  return destinations.find((d) => date >= d.arrivalDate && date <= d.departureDate);
}

/**
 * Find which stay covers a given night
 */
function findStayForNight(date: ISODate, stays: Stay[]): Stay | undefined {
  // A stay covers a night if:
  // - check-in date <= date
  // - check-out date > date (you're there for the night)
  return stays.find((s) => s.checkIn.date <= date && s.checkOut.date > date);
}

/**
 * Derive flight events for a specific date
 */
function deriveFlightEvents(date: ISODate, flights: FlightLeg[]): DayEvent[] {
  const events: DayEvent[] = [];

  for (const flight of flights) {
    // Departure on this date
    if (flight.departure.dateTime.date === date) {
      const airportArrivalTime = subtractMinutesFromTime(
        flight.departure.dateTime.time,
        AIRPORT_BUFFER_MINUTES
      );

      // Add lounge event if has lounge access
      if (flight.loungeAccess) {
        const loungeStart = airportArrivalTime;
        const loungeEnd = subtractMinutesFromTime(flight.departure.dateTime.time, 30);
        events.push({
          id: `lounge-${flight.id}-${date}`,
          type: "lounge",
          source: "airport",
          flight,
          loungeName: flight.loungeName,
          startTime: loungeStart,
          endTime: loungeEnd,
          duration: calculateDuration(loungeStart, loungeEnd),
          isFixed: false,
        });
      }

      events.push({
        id: `flight-dep-${flight.id}`,
        type: "flight_departure",
        flight,
        startTime: flight.departure.dateTime.time,
        endTime: flight.departure.dateTime.time, // Departure is a point in time
        duration: 0,
        isFixed: true,
        airportArrivalTime,
      });
    }

    // Arrival on this date
    if (flight.arrival.dateTime.date === date) {
      events.push({
        id: `flight-arr-${flight.id}`,
        type: "flight_arrival",
        flight,
        startTime: flight.arrival.dateTime.time,
        endTime: flight.arrival.dateTime.time,
        duration: 0,
        isFixed: true,
      });
    }
  }

  return events;
}

/**
 * Derive train events for a specific date
 */
function deriveTrainEvents(date: ISODate, trains: TrainLeg[]): DayEvent[] {
  const events: DayEvent[] = [];

  for (const train of trains) {
    // Departure on this date
    if (train.departure.dateTime.date === date) {
      events.push({
        id: `train-dep-${train.id}`,
        type: "train_departure",
        train,
        startTime: train.departure.dateTime.time,
        endTime: train.departure.dateTime.time,
        duration: 0,
        isFixed: true,
        stationArrivalTime: subtractMinutesFromTime(
          train.departure.dateTime.time,
          TRAIN_BUFFER_MINUTES
        ),
      });
    }

    // Arrival on this date
    if (train.arrival.dateTime.date === date) {
      events.push({
        id: `train-arr-${train.id}`,
        type: "train_arrival",
        train,
        startTime: train.arrival.dateTime.time,
        endTime: train.arrival.dateTime.time,
        duration: 0,
        isFixed: true,
      });
    }
  }

  return events;
}

/**
 * Derive stay-related events for a specific date
 */
function deriveStayEvents(date: ISODate, stays: Stay[]): DayEvent[] {
  const events: DayEvent[] = [];

  for (const stay of stays) {
    // Check-in on this date
    if (stay.checkIn.date === date) {
      events.push({
        id: `checkin-${stay.id}`,
        type: "check_in",
        stay,
        startTime: stay.checkIn.time,
        endTime: addMinutesToTime(stay.checkIn.time, DEFAULT_CHECKIN_DURATION),
        duration: DEFAULT_CHECKIN_DURATION,
        isFixed: true,
      });
    }

    // Check-out on this date
    if (stay.checkOut.date === date) {
      const checkoutStart = subtractMinutesFromTime(stay.checkOut.time, DEFAULT_CHECKOUT_DURATION);
      events.push({
        id: `checkout-${stay.id}`,
        type: "check_out",
        stay,
        startTime: checkoutStart,
        endTime: stay.checkOut.time,
        duration: DEFAULT_CHECKOUT_DURATION,
        isFixed: true,
      });
    }

    // Breakfast if staying this night or checking out today
    const isStayingNight = stay.checkIn.date <= date && stay.checkOut.date > date;
    const isCheckoutDay = stay.checkOut.date === date;

    if (stay.amenities.breakfast && (isStayingNight || isCheckoutDay)) {
      const breakfastStart = stay.amenities.breakfastTime?.start ?? "07:30";
      const breakfastEnd = addMinutesToTime(breakfastStart, DEFAULT_BREAKFAST_DURATION);
      events.push({
        id: `breakfast-${stay.id}-${date}`,
        type: "breakfast",
        stay,
        startTime: breakfastStart,
        endTime: breakfastEnd,
        duration: DEFAULT_BREAKFAST_DURATION,
        isFixed: false,
      });
    }

    // Hotel lounge access (if staying and has lounge)
    if (stay.amenities.lounge && isStayingNight) {
      const loungeStart = stay.amenities.loungeHours?.start ?? "17:00";
      const loungeEnd = stay.amenities.loungeHours?.end ?? "20:00";
      events.push({
        id: `lounge-hotel-${stay.id}-${date}`,
        type: "lounge",
        source: "hotel",
        stay,
        loungeName: `${stay.name} Lounge`,
        startTime: loungeStart,
        endTime: loungeEnd,
        duration: calculateDuration(loungeStart, loungeEnd),
        isFixed: false,
      });
    }
  }

  return events;
}

/**
 * Derive place events for a specific date
 */
function derivePlaceEvents(date: ISODate, places: PlaceVisit[]): DayEvent[] {
  return places
    .filter((p) => p.date === date)
    .map((place) => {
      const startTime = place.startTime ?? place.reservation?.time ?? "12:00";
      const duration = place.duration ?? 90;
      return {
        id: `place-${place.id}`,
        type: "place" as const,
        place,
        startTime,
        endTime: addMinutesToTime(startTime, duration),
        duration,
        isFixed: place.reservation != null,
        hasReservation: place.reservation != null,
      };
    });
}

/**
 * Derive free time events for a specific date
 */
function deriveFreeTimeEvents(date: ISODate, freeTime: FreeTimeBlock[]): DayEvent[] {
  return freeTime
    .filter((f) => f.date === date)
    .map((ft) => ({
      id: `freetime-${ft.id}`,
      type: "free_time" as const,
      freeTime: ft,
      startTime: ft.startTime,
      endTime: ft.endTime,
      duration: calculateDuration(ft.startTime, ft.endTime),
      isFixed: false,
    }));
}

/**
 * Sort events by start time
 */
function sortEventsByTime(events: DayEvent[]): DayEvent[] {
  return [...events].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/**
 * Calculate metrics for a day's events
 */
function calculateDayMetrics(events: DayEvent[]): DayMetrics {
  let scheduledMinutes = 0;
  let transitMinutes = 0;
  let fixedEventCount = 0;
  let flexibleEventCount = 0;
  const warnings: DayWarning[] = [];

  for (const event of events) {
    if (event.type === "transit") {
      transitMinutes += event.duration;
    } else if (event.type !== "free_time") {
      scheduledMinutes += event.duration;
    }

    if (event.isFixed) {
      fixedEventCount++;
    } else {
      flexibleEventCount++;
    }
  }

  // Check for time conflicts
  const sortedEvents = sortEventsByTime(events);
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const current = sortedEvents[i];
    const next = sortedEvents[i + 1];
    const currentEnd = timeToMinutes(current.endTime);
    const nextStart = timeToMinutes(next.startTime);

    if (currentEnd > nextStart && current.type !== "lounge" && next.type !== "lounge") {
      warnings.push({
        type: "time_conflict",
        message: `Time conflict between events`,
        eventIds: [current.id, next.id],
      });
    }
  }

  // Check for early morning
  const earlyEvents = events.filter((e) => timeToMinutes(e.startTime) < timeToMinutes("06:00"));
  if (earlyEvents.length > 0) {
    warnings.push({
      type: "early_morning",
      message: "Events scheduled before 6 AM",
      eventIds: earlyEvents.map((e) => e.id),
    });
  }

  // Check for late night
  const lateEvents = events.filter((e) => timeToMinutes(e.endTime) > timeToMinutes("23:00"));
  if (lateEvents.length > 0) {
    warnings.push({
      type: "late_night",
      message: "Events extending past 11 PM",
      eventIds: lateEvents.map((e) => e.id),
    });
  }

  // Calculate free time (assuming 8 AM - 10 PM day)
  const dayLength = 14 * 60; // 14 hours in minutes
  const freeMinutes = Math.max(0, dayLength - scheduledMinutes - transitMinutes);
  const isOverstuffed = freeMinutes < 60; // Less than 1 hour free

  if (isOverstuffed) {
    warnings.push({
      type: "overstuffed",
      message: "Day may be overscheduled",
      eventIds: [],
    });
  }

  return {
    scheduledMinutes,
    freeMinutes,
    transitMinutes,
    fixedEventCount,
    flexibleEventCount,
    isOverstuffed,
    warnings,
  };
}

// =============================================================================
// Main Derivation Function
// =============================================================================

/**
 * Derive all trip days from the trip aggregate.
 * This is the main function that transforms stored entities into daily views.
 */
export function deriveTripDays(aggregate: TripAggregate): TripDay[] {
  const { trip, destinations, stays, flights, trains, places, freeTime } = aggregate;

  // Get all dates in the trip
  const dates = getDateRange(trip.startDate, trip.endDate);

  return dates.map((date) => {
    // Collect all events for this date
    const allEvents: DayEvent[] = [
      ...deriveFlightEvents(date, flights),
      ...deriveTrainEvents(date, trains),
      ...deriveStayEvents(date, stays),
      ...derivePlaceEvents(date, places),
      ...deriveFreeTimeEvents(date, freeTime),
    ];

    // Sort by time
    const sortedEvents = sortEventsByTime(allEvents);

    return {
      date,
      dayNumber: getDayNumber(trip.startDate, date),
      destination: findDestinationForDate(date, destinations),
      stayingAt: findStayForNight(date, stays),
      events: sortedEvents,
      metrics: calculateDayMetrics(sortedEvents),
    };
  });
}

/**
 * Derive complete trip day view
 */
export function deriveTripDayView(aggregate: TripAggregate): TripDayView {
  return {
    trip: aggregate.trip,
    days: deriveTripDays(aggregate),
    totalMetrics: {
      totalDays: getDateRange(aggregate.trip.startDate, aggregate.trip.endDate).length,
      totalFlights: aggregate.flights.length,
      totalTrains: aggregate.trains.length,
      totalStays: aggregate.stays.length,
      totalPlaces: aggregate.places.length,
    },
  };
}

/**
 * Get events for a specific day from an aggregate
 */
export function getEventsForDay(aggregate: TripAggregate, date: ISODate): DayEvent[] {
  const allEvents: DayEvent[] = [
    ...deriveFlightEvents(date, aggregate.flights),
    ...deriveTrainEvents(date, aggregate.trains),
    ...deriveStayEvents(date, aggregate.stays),
    ...derivePlaceEvents(date, aggregate.places),
    ...deriveFreeTimeEvents(date, aggregate.freeTime),
  ];

  return sortEventsByTime(allEvents);
}

/**
 * Get all nights with their stays for a trip
 */
export function deriveNightStays(
  aggregate: TripAggregate
): Array<{ date: ISODate; stay: Stay | null }> {
  const dates = getDateRange(aggregate.trip.startDate, aggregate.trip.endDate);
  // Exclude last day (no night stay on checkout day)
  const nights = dates.slice(0, -1);

  return nights.map((date) => ({
    date,
    stay: findStayForNight(date, aggregate.stays) ?? null,
  }));
}

// =============================================================================
// Type Guards for Events
// =============================================================================

export function isFlightDepartureEvent(event: DayEvent): event is FlightDepartureEvent {
  return event.type === "flight_departure";
}

export function isFlightArrivalEvent(event: DayEvent): event is FlightArrivalEvent {
  return event.type === "flight_arrival";
}

export function isTrainDepartureEvent(event: DayEvent): event is TrainDepartureEvent {
  return event.type === "train_departure";
}

export function isTrainArrivalEvent(event: DayEvent): event is TrainArrivalEvent {
  return event.type === "train_arrival";
}

export function isCheckInEvent(event: DayEvent): event is CheckInEvent {
  return event.type === "check_in";
}

export function isCheckOutEvent(event: DayEvent): event is CheckOutEvent {
  return event.type === "check_out";
}

export function isBreakfastEvent(event: DayEvent): event is BreakfastEvent {
  return event.type === "breakfast";
}

export function isLoungeEvent(event: DayEvent): event is LoungeEvent {
  return event.type === "lounge";
}

export function isPlaceEvent(event: DayEvent): event is PlaceEvent {
  return event.type === "place";
}

export function isFreeTimeEvent(event: DayEvent): event is FreeTimeEvent {
  return event.type === "free_time";
}

export function isTransitEvent(event: DayEvent): event is TransitEvent {
  return event.type === "transit";
}

export function isTransportEvent(
  event: DayEvent
): event is FlightDepartureEvent | FlightArrivalEvent | TrainDepartureEvent | TrainArrivalEvent {
  return (
    event.type === "flight_departure" ||
    event.type === "flight_arrival" ||
    event.type === "train_departure" ||
    event.type === "train_arrival"
  );
}

export function isStayEvent(
  event: DayEvent
): event is CheckInEvent | CheckOutEvent | BreakfastEvent {
  return event.type === "check_in" || event.type === "check_out" || event.type === "breakfast";
}
