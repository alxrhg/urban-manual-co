/**
 * Trip Domain Model
 *
 * Core entities stored in the database:
 * - Trip: Root aggregate with dates and settings
 * - Stay: Hotel/accommodation spanning a date range
 * - Leg: Flight or train segment
 * - PlaceStop: Activity or destination to visit
 * - FreeTime: Explicitly scheduled downtime
 *
 * Daily events (check-in, breakfast, checkout, etc.) are DERIVED
 * from these entities, not stored as separate rows.
 */

// =============================================================================
// Value Types
// =============================================================================

/** ISO date string (YYYY-MM-DD) */
export type ISODate = string;

/** Time string in 24-hour format (HH:MM) */
export type Time = string;

/** Duration in minutes */
export type Minutes = number;

export interface DateAndTime {
  date: ISODate;
  time: Time;
}

export interface Coords {
  lat: number;
  lng: number;
}

// =============================================================================
// Trip
// =============================================================================

export type TripStatus = "draft" | "planning" | "booked" | "active" | "completed";

export interface Trip {
  id: string;
  userId: string;
  title: string;
  emoji?: string;
  startDate: ISODate;
  endDate: ISODate;
  status: TripStatus;
  coverImage?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// City (Multi-city support)
// =============================================================================

/**
 * A city/destination within a trip.
 * For multi-city trips, each city has arrival and departure dates.
 */
export interface City {
  id: string;
  tripId: string;
  name: string;
  country?: string;
  arrivalDate: ISODate;
  departureDate: ISODate;
  order: number;
  coords?: Coords;
}

// =============================================================================
// Stay (Hotel/Accommodation)
// =============================================================================

export interface StayAmenities {
  breakfast: boolean;
  breakfastStart?: Time;
  breakfastEnd?: Time;
  lounge: boolean;
  loungeStart?: Time;
  loungeEnd?: Time;
  pool: boolean;
  gym: boolean;
  spa: boolean;
  parking: boolean;
}

/**
 * A hotel stay spanning one or more nights.
 * Stored once - daily events (check-in, breakfast, checkout) are derived.
 */
export interface Stay {
  id: string;
  tripId: string;
  cityId: string;
  name: string;
  /** Link to destinations table if known property */
  destinationSlug?: string;
  address?: string;
  coords?: Coords;
  checkIn: DateAndTime;
  checkOut: DateAndTime;
  roomType?: string;
  confirmationNumber?: string;
  amenities: StayAmenities;
  pricePerNight?: number;
  currency?: string;
  notes?: string;
}

// =============================================================================
// Leg (Flight or Train)
// =============================================================================

export type SeatClass = "economy" | "premium" | "business" | "first";

interface BaseLeg {
  id: string;
  tripId: string;
  operator: string;
  number: string;
  departure: {
    location: string;
    city: string;
    dateTime: DateAndTime;
    terminal?: string;
  };
  arrival: {
    location: string;
    city: string;
    dateTime: DateAndTime;
    terminal?: string;
  };
  seatClass?: SeatClass;
  seat?: string;
  confirmationNumber?: string;
  price?: number;
  currency?: string;
  notes?: string;
}

export interface FlightLeg extends BaseLeg {
  type: "flight";
  /** Airline IATA code */
  airlineCode?: string;
  loungeAccess?: boolean;
  loungeName?: string;
}

export interface TrainLeg extends BaseLeg {
  type: "train";
  car?: string;
}

/** Discriminated union of transport legs */
export type Leg = FlightLeg | TrainLeg;

// =============================================================================
// PlaceStop (Activity/Destination)
// =============================================================================

export type PlaceCategory =
  | "restaurant"
  | "cafe"
  | "bar"
  | "museum"
  | "gallery"
  | "landmark"
  | "park"
  | "shopping"
  | "entertainment"
  | "activity"
  | "tour"
  | "other";

export interface Reservation {
  time: Time;
  confirmationNumber?: string;
  partySize?: number;
}

/**
 * A planned stop at a place/activity.
 */
export interface PlaceStop {
  id: string;
  tripId: string;
  cityId: string;
  /** Link to destinations table */
  destinationSlug?: string;
  title: string;
  description?: string;
  category: PlaceCategory;
  date: ISODate;
  startTime?: Time;
  duration?: Minutes;
  address?: string;
  coords?: Coords;
  /** Can be rescheduled */
  flexible: boolean;
  reservation?: Reservation;
  estimatedCost?: number;
  currency?: string;
  notes?: string;
  /** Sort order within day */
  order?: number;
}

// =============================================================================
// FreeTime
// =============================================================================

export type FreeTimeKind = "rest" | "explore" | "buffer" | "flexible";

/**
 * Explicitly scheduled free/unplanned time.
 */
export interface FreeTime {
  id: string;
  tripId: string;
  date: ISODate;
  startTime: Time;
  endTime: Time;
  kind: FreeTimeKind;
  label?: string;
  notes?: string;
}

// =============================================================================
// Trip Aggregate
// =============================================================================

/**
 * Complete trip data with all entities.
 * This is the source of truth - daily views are derived from this.
 */
export interface TripData {
  trip: Trip;
  cities: City[];
  stays: Stay[];
  legs: Leg[];
  places: PlaceStop[];
  freeTime: FreeTime[];
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createTrip(
  data: Pick<Trip, "userId" | "title" | "startDate" | "endDate"> & Partial<Trip>
): Trip {
  const now = new Date().toISOString();
  return {
    id: data.id ?? crypto.randomUUID(),
    userId: data.userId,
    title: data.title,
    emoji: data.emoji,
    startDate: data.startDate,
    endDate: data.endDate,
    status: data.status ?? "planning",
    coverImage: data.coverImage,
    notes: data.notes,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

export function createCity(
  data: Pick<City, "tripId" | "name" | "arrivalDate" | "departureDate" | "order"> & Partial<City>
): City {
  return {
    id: data.id ?? crypto.randomUUID(),
    tripId: data.tripId,
    name: data.name,
    country: data.country,
    arrivalDate: data.arrivalDate,
    departureDate: data.departureDate,
    order: data.order,
    coords: data.coords,
  };
}

export function createStay(
  data: Pick<Stay, "tripId" | "cityId" | "name" | "checkIn" | "checkOut"> & Partial<Stay>
): Stay {
  return {
    id: data.id ?? crypto.randomUUID(),
    tripId: data.tripId,
    cityId: data.cityId,
    name: data.name,
    destinationSlug: data.destinationSlug,
    address: data.address,
    coords: data.coords,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    roomType: data.roomType,
    confirmationNumber: data.confirmationNumber,
    amenities: data.amenities ?? {
      breakfast: false,
      lounge: false,
      pool: false,
      gym: false,
      spa: false,
      parking: false,
    },
    pricePerNight: data.pricePerNight,
    currency: data.currency,
    notes: data.notes,
  };
}

export function createFlightLeg(
  data: Pick<FlightLeg, "tripId" | "operator" | "number" | "departure" | "arrival"> &
    Partial<Omit<FlightLeg, "type">>
): FlightLeg {
  return {
    type: "flight",
    id: data.id ?? crypto.randomUUID(),
    tripId: data.tripId,
    operator: data.operator,
    airlineCode: data.airlineCode,
    number: data.number,
    departure: data.departure,
    arrival: data.arrival,
    seatClass: data.seatClass,
    seat: data.seat,
    confirmationNumber: data.confirmationNumber,
    loungeAccess: data.loungeAccess,
    loungeName: data.loungeName,
    price: data.price,
    currency: data.currency,
    notes: data.notes,
  };
}

export function createTrainLeg(
  data: Pick<TrainLeg, "tripId" | "operator" | "number" | "departure" | "arrival"> &
    Partial<Omit<TrainLeg, "type">>
): TrainLeg {
  return {
    type: "train",
    id: data.id ?? crypto.randomUUID(),
    tripId: data.tripId,
    operator: data.operator,
    number: data.number,
    departure: data.departure,
    arrival: data.arrival,
    seatClass: data.seatClass,
    seat: data.seat,
    car: data.car,
    confirmationNumber: data.confirmationNumber,
    price: data.price,
    currency: data.currency,
    notes: data.notes,
  };
}

export function createPlaceStop(
  data: Pick<PlaceStop, "tripId" | "cityId" | "title" | "category" | "date"> & Partial<PlaceStop>
): PlaceStop {
  return {
    id: data.id ?? crypto.randomUUID(),
    tripId: data.tripId,
    cityId: data.cityId,
    destinationSlug: data.destinationSlug,
    title: data.title,
    description: data.description,
    category: data.category,
    date: data.date,
    startTime: data.startTime,
    duration: data.duration,
    address: data.address,
    coords: data.coords,
    flexible: data.flexible ?? true,
    reservation: data.reservation,
    estimatedCost: data.estimatedCost,
    currency: data.currency,
    notes: data.notes,
    order: data.order,
  };
}

export function createFreeTime(
  data: Pick<FreeTime, "tripId" | "date" | "startTime" | "endTime"> & Partial<FreeTime>
): FreeTime {
  return {
    id: data.id ?? crypto.randomUUID(),
    tripId: data.tripId,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    kind: data.kind ?? "flexible",
    label: data.label,
    notes: data.notes,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

export function isFlightLeg(leg: Leg): leg is FlightLeg {
  return leg.type === "flight";
}

export function isTrainLeg(leg: Leg): leg is TrainLeg {
  return leg.type === "train";
}
