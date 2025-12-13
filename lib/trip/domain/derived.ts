/**
 * Derived Daily Events
 *
 * Events like check-in, breakfast, checkout are NOT stored.
 * They are computed from the real entities (Stay, Leg, PlaceStop, FreeTime).
 */

import type {
  ISODate,
  Time,
  Minutes,
  Trip,
  City,
  Stay,
  Leg,
  FlightLeg,
  TrainLeg,
  PlaceStop,
  FreeTime,
  TripData,
} from "./types";
import { isFlightLeg } from "./types";

// =============================================================================
// Derived Event Types
// =============================================================================

interface BaseEvent {
  id: string;
  startTime: Time;
  endTime: Time;
  duration: Minutes;
  /** Has fixed time (reservation, flight, etc.) */
  fixed: boolean;
}

export interface CheckInEvent extends BaseEvent {
  type: "check-in";
  stay: Stay;
}

export interface CheckOutEvent extends BaseEvent {
  type: "check-out";
  stay: Stay;
}

export interface BreakfastEvent extends BaseEvent {
  type: "breakfast";
  stay: Stay;
}

export interface LoungeEvent extends BaseEvent {
  type: "lounge";
  source: "hotel" | "airport";
  stay?: Stay;
  leg?: FlightLeg;
  name?: string;
}

export interface DepartureEvent extends BaseEvent {
  type: "departure";
  leg: Leg;
  /** When to arrive at airport/station */
  arriveBy: Time;
}

export interface ArrivalEvent extends BaseEvent {
  type: "arrival";
  leg: Leg;
}

export interface PlaceEvent extends BaseEvent {
  type: "place";
  place: PlaceStop;
  hasReservation: boolean;
}

export interface FreeTimeEvent extends BaseEvent {
  type: "free-time";
  freeTime: FreeTime;
}

/** All possible daily events */
export type DayEvent =
  | CheckInEvent
  | CheckOutEvent
  | BreakfastEvent
  | LoungeEvent
  | DepartureEvent
  | ArrivalEvent
  | PlaceEvent
  | FreeTimeEvent;

// =============================================================================
// Day View
// =============================================================================

export interface DayWarning {
  type: "conflict" | "tight" | "late" | "early" | "overstuffed";
  message: string;
  eventIds: string[];
}

export interface DayMetrics {
  scheduledMins: Minutes;
  freeMins: Minutes;
  transitMins: Minutes;
  fixedCount: number;
  flexibleCount: number;
  overstuffed: boolean;
  warnings: DayWarning[];
}

/**
 * A single day's computed view.
 */
export interface TripDay {
  date: ISODate;
  dayNumber: number;
  city?: City;
  /** Hotel for this night */
  stayingAt?: Stay;
  events: DayEvent[];
  metrics: DayMetrics;
}

// =============================================================================
// Time Utilities
// =============================================================================

export function timeToMins(time: Time): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minsToTime(mins: number): Time {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMins(time: Time, mins: number): Time {
  return minsToTime(timeToMins(time) + mins);
}

export function subMins(time: Time, mins: number): Time {
  return minsToTime(timeToMins(time) - mins);
}

export function durationMins(start: Time, end: Time): Minutes {
  const s = timeToMins(start);
  const e = timeToMins(end);
  return e >= s ? e - s : 1440 - s + e;
}

export function getDateRange(start: ISODate, end: ISODate): ISODate[] {
  const dates: ISODate[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function dayNumber(tripStart: ISODate, date: ISODate): number {
  const start = new Date(tripStart);
  const current = new Date(date);
  return Math.floor((current.getTime() - start.getTime()) / 86400000) + 1;
}

// =============================================================================
// Event Derivation
// =============================================================================

const AIRPORT_BUFFER = 120; // mins before flight
const STATION_BUFFER = 30; // mins before train
const CHECKIN_DURATION = 30;
const CHECKOUT_DURATION = 30;
const BREAKFAST_DURATION = 45;

function findCity(date: ISODate, cities: City[]): City | undefined {
  return cities.find((c) => date >= c.arrivalDate && date <= c.departureDate);
}

function findStay(date: ISODate, stays: Stay[]): Stay | undefined {
  // Stay covers a night if checkIn <= date < checkOut
  return stays.find((s) => s.checkIn.date <= date && s.checkOut.date > date);
}

function deriveStayEvents(date: ISODate, stays: Stay[]): DayEvent[] {
  const events: DayEvent[] = [];

  for (const stay of stays) {
    // Check-in event
    if (stay.checkIn.date === date) {
      events.push({
        id: `checkin-${stay.id}`,
        type: "check-in",
        stay,
        startTime: stay.checkIn.time,
        endTime: addMins(stay.checkIn.time, CHECKIN_DURATION),
        duration: CHECKIN_DURATION,
        fixed: true,
      });
    }

    // Check-out event
    if (stay.checkOut.date === date) {
      events.push({
        id: `checkout-${stay.id}`,
        type: "check-out",
        stay,
        startTime: subMins(stay.checkOut.time, CHECKOUT_DURATION),
        endTime: stay.checkOut.time,
        duration: CHECKOUT_DURATION,
        fixed: true,
      });
    }

    // Breakfast (if staying this night or checking out today)
    const stayingTonight = stay.checkIn.date <= date && stay.checkOut.date > date;
    const checkoutToday = stay.checkOut.date === date;

    if (stay.amenities.breakfast && (stayingTonight || checkoutToday)) {
      const start = stay.amenities.breakfastStart ?? "07:30";
      events.push({
        id: `breakfast-${stay.id}-${date}`,
        type: "breakfast",
        stay,
        startTime: start,
        endTime: addMins(start, BREAKFAST_DURATION),
        duration: BREAKFAST_DURATION,
        fixed: false,
      });
    }

    // Hotel lounge (evening, if staying)
    if (stay.amenities.lounge && stayingTonight) {
      const start = stay.amenities.loungeStart ?? "17:00";
      const end = stay.amenities.loungeEnd ?? "20:00";
      events.push({
        id: `lounge-hotel-${stay.id}-${date}`,
        type: "lounge",
        source: "hotel",
        stay,
        name: `${stay.name} Lounge`,
        startTime: start,
        endTime: end,
        duration: durationMins(start, end),
        fixed: false,
      });
    }
  }

  return events;
}

function deriveLegEvents(date: ISODate, legs: Leg[]): DayEvent[] {
  const events: DayEvent[] = [];

  for (const leg of legs) {
    const isFlight = isFlightLeg(leg);
    const buffer = isFlight ? AIRPORT_BUFFER : STATION_BUFFER;

    // Departure
    if (leg.departure.dateTime.date === date) {
      const depTime = leg.departure.dateTime.time;
      const arriveBy = subMins(depTime, buffer);

      // Airport lounge if flight has access
      if (isFlight && leg.loungeAccess) {
        const loungeEnd = subMins(depTime, 30);
        events.push({
          id: `lounge-airport-${leg.id}`,
          type: "lounge",
          source: "airport",
          leg,
          name: leg.loungeName,
          startTime: arriveBy,
          endTime: loungeEnd,
          duration: durationMins(arriveBy, loungeEnd),
          fixed: false,
        });
      }

      events.push({
        id: `dep-${leg.id}`,
        type: "departure",
        leg,
        startTime: depTime,
        endTime: depTime,
        duration: 0,
        fixed: true,
        arriveBy,
      });
    }

    // Arrival
    if (leg.arrival.dateTime.date === date) {
      events.push({
        id: `arr-${leg.id}`,
        type: "arrival",
        leg,
        startTime: leg.arrival.dateTime.time,
        endTime: leg.arrival.dateTime.time,
        duration: 0,
        fixed: true,
      });
    }
  }

  return events;
}

function derivePlaceEvents(date: ISODate, places: PlaceStop[]): DayEvent[] {
  return places
    .filter((p) => p.date === date)
    .map((place) => {
      const start = place.startTime ?? place.reservation?.time ?? "12:00";
      const duration = place.duration ?? 90;
      return {
        id: `place-${place.id}`,
        type: "place" as const,
        place,
        startTime: start,
        endTime: addMins(start, duration),
        duration,
        fixed: !!place.reservation,
        hasReservation: !!place.reservation,
      };
    });
}

function deriveFreeTimeEvents(date: ISODate, freeTime: FreeTime[]): DayEvent[] {
  return freeTime
    .filter((f) => f.date === date)
    .map((ft) => ({
      id: `free-${ft.id}`,
      type: "free-time" as const,
      freeTime: ft,
      startTime: ft.startTime,
      endTime: ft.endTime,
      duration: durationMins(ft.startTime, ft.endTime),
      fixed: false,
    }));
}

function sortByTime(events: DayEvent[]): DayEvent[] {
  return [...events].sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));
}

function computeMetrics(events: DayEvent[]): DayMetrics {
  let scheduledMins = 0;
  let transitMins = 0;
  let fixedCount = 0;
  let flexibleCount = 0;
  const warnings: DayWarning[] = [];

  for (const e of events) {
    if (e.type !== "free-time") {
      scheduledMins += e.duration;
    }
    if (e.fixed) fixedCount++;
    else flexibleCount++;
  }

  // Check conflicts
  const sorted = sortByTime(events);
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    if (timeToMins(curr.endTime) > timeToMins(next.startTime)) {
      if (curr.type !== "lounge" && next.type !== "lounge") {
        warnings.push({
          type: "conflict",
          message: "Time conflict",
          eventIds: [curr.id, next.id],
        });
      }
    }
  }

  // Early/late warnings
  const early = events.filter((e) => timeToMins(e.startTime) < 360); // before 6am
  if (early.length > 0) {
    warnings.push({ type: "early", message: "Events before 6 AM", eventIds: early.map((e) => e.id) });
  }
  const late = events.filter((e) => timeToMins(e.endTime) > 1380); // after 11pm
  if (late.length > 0) {
    warnings.push({ type: "late", message: "Events after 11 PM", eventIds: late.map((e) => e.id) });
  }

  const dayLength = 14 * 60; // 8am-10pm
  const freeMins = Math.max(0, dayLength - scheduledMins - transitMins);
  const overstuffed = freeMins < 60;

  if (overstuffed) {
    warnings.push({ type: "overstuffed", message: "Day overscheduled", eventIds: [] });
  }

  return { scheduledMins, freeMins, transitMins, fixedCount, flexibleCount, overstuffed, warnings };
}

// =============================================================================
// Main Derivation
// =============================================================================

/**
 * Derive all daily views from trip data.
 * This is the core function - transforms stored entities into daily event views.
 */
export function deriveDays(data: TripData): TripDay[] {
  const { trip, cities, stays, legs, places, freeTime } = data;
  const dates = getDateRange(trip.startDate, trip.endDate);

  return dates.map((date) => {
    const allEvents: DayEvent[] = [
      ...deriveStayEvents(date, stays),
      ...deriveLegEvents(date, legs),
      ...derivePlaceEvents(date, places),
      ...deriveFreeTimeEvents(date, freeTime),
    ];

    const events = sortByTime(allEvents);

    return {
      date,
      dayNumber: dayNumber(trip.startDate, date),
      city: findCity(date, cities),
      stayingAt: findStay(date, stays),
      events,
      metrics: computeMetrics(events),
    };
  });
}

/**
 * Get events for a specific day.
 */
export function getEventsForDate(data: TripData, date: ISODate): DayEvent[] {
  const allEvents: DayEvent[] = [
    ...deriveStayEvents(date, data.stays),
    ...deriveLegEvents(date, data.legs),
    ...derivePlaceEvents(date, data.places),
    ...deriveFreeTimeEvents(date, data.freeTime),
  ];
  return sortByTime(allEvents);
}

/**
 * Get nights with their hotel assignments.
 */
export function getNightStays(data: TripData): Array<{ date: ISODate; stay: Stay | null }> {
  const dates = getDateRange(data.trip.startDate, data.trip.endDate);
  const nights = dates.slice(0, -1); // exclude last day
  return nights.map((date) => ({
    date,
    stay: findStay(date, data.stays) ?? null,
  }));
}

// =============================================================================
// Type Guards
// =============================================================================

export function isCheckInEvent(e: DayEvent): e is CheckInEvent {
  return e.type === "check-in";
}
export function isCheckOutEvent(e: DayEvent): e is CheckOutEvent {
  return e.type === "check-out";
}
export function isBreakfastEvent(e: DayEvent): e is BreakfastEvent {
  return e.type === "breakfast";
}
export function isLoungeEvent(e: DayEvent): e is LoungeEvent {
  return e.type === "lounge";
}
export function isDepartureEvent(e: DayEvent): e is DepartureEvent {
  return e.type === "departure";
}
export function isArrivalEvent(e: DayEvent): e is ArrivalEvent {
  return e.type === "arrival";
}
export function isPlaceEvent(e: DayEvent): e is PlaceEvent {
  return e.type === "place";
}
export function isFreeTimeEvent(e: DayEvent): e is FreeTimeEvent {
  return e.type === "free-time";
}
