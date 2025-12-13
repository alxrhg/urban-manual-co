/**
 * Trip Domain Utilities
 *
 * Query, validation, and manipulation helpers.
 */

import type {
  Trip,
  TripData,
  City,
  Stay,
  Leg,
  PlaceStop,
  FreeTime,
  ISODate,
  Time,
  PlaceCategory,
} from "./types";
import { isFlightLeg } from "./types";
import type { TripDay, DayEvent } from "./derived";
import { getDateRange, deriveDays, timeToMins } from "./derived";

// =============================================================================
// Trip Queries
// =============================================================================

/** Get number of nights in trip */
export function tripNights(trip: Trip): number {
  return getDateRange(trip.startDate, trip.endDate).length - 1;
}

/** Get all city names */
export function tripCities(cities: City[]): string[] {
  return cities.map((c) => c.name);
}

/** Is this a multi-city trip? */
export function isMultiCity(cities: City[]): boolean {
  return new Set(cities.map((c) => c.name)).size > 1;
}

/** Find city for a given date */
export function cityForDate(date: ISODate, cities: City[]): City | undefined {
  return cities.find((c) => date >= c.arrivalDate && date <= c.departureDate);
}

// =============================================================================
// Stay Queries
// =============================================================================

/** Count nights with hotel booked */
export function coveredNights(stays: Stay[], trip: Trip): number {
  const nights = getDateRange(trip.startDate, trip.endDate).slice(0, -1);
  return nights.filter((d) => stays.some((s) => s.checkIn.date <= d && s.checkOut.date > d)).length;
}

/** Get dates without hotel */
export function uncoveredNights(stays: Stay[], trip: Trip): ISODate[] {
  const nights = getDateRange(trip.startDate, trip.endDate).slice(0, -1);
  return nights.filter((d) => !stays.some((s) => s.checkIn.date <= d && s.checkOut.date > d));
}

/** Does this night have a hotel? */
export function hasStay(date: ISODate, stays: Stay[]): boolean {
  return stays.some((s) => s.checkIn.date <= date && s.checkOut.date > date);
}

/** Total hotel cost by currency */
export function totalStayCost(stays: Stay[]): Array<{ amount: number; currency: string }> {
  const byCurrency = new Map<string, number>();
  for (const s of stays) {
    if (s.pricePerNight && s.currency) {
      const nights = getDateRange(s.checkIn.date, s.checkOut.date).length - 1;
      byCurrency.set(s.currency, (byCurrency.get(s.currency) ?? 0) + s.pricePerNight * nights);
    }
  }
  return Array.from(byCurrency, ([currency, amount]) => ({ amount, currency }));
}

/** Stays with specific amenity */
export function staysWithAmenity(stays: Stay[], amenity: keyof Stay["amenities"]): Stay[] {
  return stays.filter((s) => s.amenities[amenity]);
}

// =============================================================================
// Leg Queries
// =============================================================================

/** Total transport cost by currency */
export function totalLegCost(legs: Leg[]): Array<{ amount: number; currency: string }> {
  const byCurrency = new Map<string, number>();
  for (const leg of legs) {
    if (leg.price && leg.currency) {
      byCurrency.set(leg.currency, (byCurrency.get(leg.currency) ?? 0) + leg.price);
    }
  }
  return Array.from(byCurrency, ([currency, amount]) => ({ amount, currency }));
}

/** Flights with lounge access */
export function flightsWithLounge(legs: Leg[]): Leg[] {
  return legs.filter((l) => isFlightLeg(l) && l.loungeAccess);
}

// =============================================================================
// PlaceStop Queries
// =============================================================================

/** Places by category */
export function placesByCategory(places: PlaceStop[], category: PlaceCategory): PlaceStop[] {
  return places.filter((p) => p.category === category);
}

/** Places with reservations */
export function placesWithReservation(places: PlaceStop[]): PlaceStop[] {
  return places.filter((p) => p.reservation);
}

/** Places for a specific date */
export function placesForDate(places: PlaceStop[], date: ISODate): PlaceStop[] {
  return places.filter((p) => p.date === date);
}

/** Unscheduled places (no time) */
export function unscheduledPlaces(places: PlaceStop[]): PlaceStop[] {
  return places.filter((p) => !p.startTime && !p.reservation?.time);
}

/** Flexible places (can be rescheduled) */
export function flexiblePlaces(places: PlaceStop[]): PlaceStop[] {
  return places.filter((p) => p.flexible);
}

// =============================================================================
// Day Queries
// =============================================================================

/** Days with any warnings */
export function daysWithWarnings(days: TripDay[]): TripDay[] {
  return days.filter((d) => d.metrics.warnings.length > 0);
}

/** Overstuffed days */
export function overstuffedDays(days: TripDay[]): TripDay[] {
  return days.filter((d) => d.metrics.overstuffed);
}

/** Days with time conflicts */
export function conflictDays(days: TripDay[]): TripDay[] {
  return days.filter((d) => d.metrics.warnings.some((w) => w.type === "conflict"));
}

/** Busiest day */
export function busiestDay(days: TripDay[]): TripDay | undefined {
  if (!days.length) return undefined;
  return days.reduce((max, d) => (d.metrics.scheduledMins > max.metrics.scheduledMins ? d : max));
}

/** Lightest day */
export function lightestDay(days: TripDay[]): TripDay | undefined {
  if (!days.length) return undefined;
  return days.reduce((min, d) => (d.metrics.scheduledMins < min.metrics.scheduledMins ? d : min));
}

// =============================================================================
// Event Filtering
// =============================================================================

/** Filter events by type */
export function eventsByType<T extends DayEvent["type"]>(
  events: DayEvent[],
  type: T
): Extract<DayEvent, { type: T }>[] {
  return events.filter((e) => e.type === type) as Extract<DayEvent, { type: T }>[];
}

/** Fixed events only */
export function fixedEvents(events: DayEvent[]): DayEvent[] {
  return events.filter((e) => e.fixed);
}

/** Flexible events only */
export function flexibleEvents(events: DayEvent[]): DayEvent[] {
  return events.filter((e) => !e.fixed);
}

/** Events in time range */
export function eventsInRange(events: DayEvent[], start: Time, end: Time): DayEvent[] {
  const s = timeToMins(start);
  const e = timeToMins(end);
  return events.filter((ev) => {
    const evStart = timeToMins(ev.startTime);
    const evEnd = timeToMins(ev.endTime);
    return evEnd > s && evStart < e;
  });
}

// =============================================================================
// Validation
// =============================================================================

export interface ValidationError {
  type: string;
  message: string;
  entityId?: string;
}

/** Validate trip data */
export function validate(data: TripData): ValidationError[] {
  const errors: ValidationError[] = [];
  const { trip, cities, stays, legs, places } = data;

  // Trip dates
  if (trip.startDate > trip.endDate) {
    errors.push({ type: "dates", message: "End date before start date" });
  }

  // City coverage
  const dates = getDateRange(trip.startDate, trip.endDate);
  for (const date of dates) {
    if (!cities.find((c) => date >= c.arrivalDate && date <= c.departureDate)) {
      errors.push({ type: "city_gap", message: `No city for ${date}` });
    }
  }

  // Stay dates
  for (const stay of stays) {
    if (stay.checkIn.date > stay.checkOut.date) {
      errors.push({ type: "stay_dates", message: `${stay.name}: checkout before checkin`, entityId: stay.id });
    }
    if (stay.checkIn.date < trip.startDate || stay.checkOut.date > trip.endDate) {
      errors.push({ type: "stay_range", message: `${stay.name}: outside trip dates`, entityId: stay.id });
    }
  }

  // Leg dates
  for (const leg of legs) {
    const dep = leg.departure.dateTime.date;
    const arr = leg.arrival.dateTime.date;
    if (dep < trip.startDate || arr > trip.endDate) {
      errors.push({ type: "leg_range", message: `${leg.number}: outside trip dates`, entityId: leg.id });
    }
  }

  // Place dates
  for (const place of places) {
    if (place.date < trip.startDate || place.date > trip.endDate) {
      errors.push({ type: "place_range", message: `${place.title}: outside trip dates`, entityId: place.id });
    }
  }

  return errors;
}

/** Is trip data valid? */
export function isValid(data: TripData): boolean {
  return validate(data).length === 0;
}

// =============================================================================
// Immutable Updates
// =============================================================================

/** Add a place */
export function addPlace(data: TripData, place: PlaceStop): TripData {
  return { ...data, places: [...data.places, place] };
}

/** Remove a place */
export function removePlace(data: TripData, placeId: string): TripData {
  return { ...data, places: data.places.filter((p) => p.id !== placeId) };
}

/** Update a place */
export function updatePlace(data: TripData, placeId: string, updates: Partial<PlaceStop>): TripData {
  return {
    ...data,
    places: data.places.map((p) => (p.id === placeId ? { ...p, ...updates } : p)),
  };
}

/** Move place to different day */
export function movePlace(data: TripData, placeId: string, newDate: ISODate, newTime?: Time): TripData {
  return updatePlace(data, placeId, { date: newDate, startTime: newTime });
}

/** Add a stay */
export function addStay(data: TripData, stay: Stay): TripData {
  return { ...data, stays: [...data.stays, stay] };
}

/** Remove a stay */
export function removeStay(data: TripData, stayId: string): TripData {
  return { ...data, stays: data.stays.filter((s) => s.id !== stayId) };
}

/** Add a leg */
export function addLeg(data: TripData, leg: Leg): TripData {
  return { ...data, legs: [...data.legs, leg] };
}

/** Remove a leg */
export function removeLeg(data: TripData, legId: string): TripData {
  return { ...data, legs: data.legs.filter((l) => l.id !== legId) };
}

// =============================================================================
// Summary
// =============================================================================

export interface TripSummary {
  title: string;
  cities: string[];
  dates: { start: ISODate; end: ISODate };
  days: number;
  nights: number;
  flights: number;
  trains: number;
  stays: number;
  places: number;
  reservations: number;
  uncoveredNights: number;
  warnings: number;
}

/** Generate trip summary */
export function summarize(data: TripData): TripSummary {
  const days = deriveDays(data);
  const uncovered = uncoveredNights(data.stays, data.trip);
  const warnings = daysWithWarnings(days);

  return {
    title: data.trip.title,
    cities: tripCities(data.cities),
    dates: { start: data.trip.startDate, end: data.trip.endDate },
    days: days.length,
    nights: tripNights(data.trip),
    flights: data.legs.filter((l) => l.type === "flight").length,
    trains: data.legs.filter((l) => l.type === "train").length,
    stays: data.stays.length,
    places: data.places.length,
    reservations: placesWithReservation(data.places).length,
    uncoveredNights: uncovered.length,
    warnings: warnings.reduce((sum, d) => sum + d.metrics.warnings.length, 0),
  };
}
