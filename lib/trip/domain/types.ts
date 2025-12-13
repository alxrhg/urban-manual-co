/**
 * Trip Domain Model
 *
 * This module defines the core domain types for trip planning.
 * Key design principles:
 * - Multi-city trips with explicit city-to-date mapping
 * - Hotels as "stays" spanning date ranges (not individual nights)
 * - Flight legs as explicit segments
 * - Daily events derived from underlying data, not stored as rows
 */

// =============================================================================
// Core Identifiers
// =============================================================================

export type TripId = string;
export type StayId = string;
export type FlightLegId = string;
export type PlaceVisitId = string;
export type TripDestinationId = string;

// =============================================================================
// Value Objects
// =============================================================================

/** ISO date string (YYYY-MM-DD) */
export type ISODate = string;

/** Time string in 24-hour format (HH:MM) */
export type TimeString = string;

/** Duration in minutes */
export type Minutes = number;

export interface TimeRange {
  start: TimeString;
  end: TimeString;
}

export interface DateTimePoint {
  date: ISODate;
  time: TimeString;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

// =============================================================================
// Trip Status & Settings
// =============================================================================

export type TripStatus = "draft" | "planning" | "booked" | "ongoing" | "completed" | "cancelled";

export interface TripSettings {
  /** Default start time for activities */
  defaultStartTime: TimeString;
  /** Default duration for activities (minutes) */
  defaultActivityDuration: Minutes;
  /** Include travel time estimates between places */
  includeTransitTime: boolean;
  /** Timezone for the trip (IANA timezone) */
  timezone?: string;
  /** Currency for cost tracking */
  currency?: string;
}

export const DEFAULT_TRIP_SETTINGS: TripSettings = {
  defaultStartTime: "09:00",
  defaultActivityDuration: 90,
  includeTransitTime: true,
};

// =============================================================================
// Travelers
// =============================================================================

export interface Traveler {
  id: string;
  name: string;
  email?: string;
  isOwner: boolean;
}

// =============================================================================
// Trip (Root Aggregate)
// =============================================================================

export interface Trip {
  id: TripId;
  userId: string;
  title: string;
  emoji?: string;
  startDate: ISODate;
  endDate: ISODate;
  travelers: Traveler[];
  settings: TripSettings;
  status: TripStatus;
  coverImage?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Trip Destination (Multi-City Support)
// =============================================================================

/**
 * Represents a city/destination within a multi-city trip.
 * Each destination has arrival and departure dates.
 */
export interface TripDestination {
  id: TripDestinationId;
  tripId: TripId;
  /** City name */
  city: string;
  /** Country name */
  country?: string;
  /** Country code (ISO 3166-1 alpha-2) */
  countryCode?: string;
  /** When arriving at this destination */
  arrivalDate: ISODate;
  /** When leaving this destination */
  departureDate: ISODate;
  /** Order in the trip itinerary (1-indexed) */
  order: number;
  /** Coordinates for map display */
  location?: GeoLocation;
}

// =============================================================================
// Stay (Hotel/Accommodation)
// =============================================================================

/**
 * Hotel amenities that can affect the daily schedule
 */
export interface StayAmenities {
  /** Breakfast included - affects morning schedule */
  breakfast: boolean;
  /** Breakfast time range if included */
  breakfastTime?: TimeRange;
  /** Executive/club lounge access */
  lounge: boolean;
  /** Lounge hours if available */
  loungeHours?: TimeRange;
  /** Pool available */
  pool: boolean;
  /** Gym/fitness center */
  gym: boolean;
  /** Spa services */
  spa: boolean;
  /** Parking included */
  parking: boolean;
}

export const DEFAULT_STAY_AMENITIES: StayAmenities = {
  breakfast: false,
  lounge: false,
  pool: false,
  gym: false,
  spa: false,
  parking: false,
};

/**
 * A hotel/accommodation stay spanning one or more nights.
 * This is NOT stored per-night - it's a single record for the entire stay.
 */
export interface Stay {
  id: StayId;
  tripId: TripId;
  /** Link to which city this hotel is in */
  destinationId: TripDestinationId;
  /** Hotel/property name */
  name: string;
  /** Link to destinations table if this is a known property */
  destinationSlug?: string;
  /** Hotel address */
  address?: string;
  /** Hotel coordinates */
  location?: GeoLocation;
  /** Check-in date and time */
  checkIn: DateTimePoint;
  /** Check-out date and time */
  checkOut: DateTimePoint;
  /** Room type (e.g., "Deluxe King", "Suite") */
  roomType?: string;
  /** Confirmation/booking number */
  confirmationNumber?: string;
  /** Available amenities */
  amenities: StayAmenities;
  /** Cost per night */
  pricePerNight?: number;
  /** Currency for the price */
  currency?: string;
  /** Additional notes */
  notes?: string;
}

// =============================================================================
// Flight Leg
// =============================================================================

export type SeatClass = "economy" | "premium_economy" | "business" | "first";

export interface Airport {
  code: string; // IATA code (e.g., "JFK")
  name?: string;
  city: string;
  terminal?: string;
  gate?: string;
}

/**
 * A single flight segment (leg) from one airport to another.
 * Multi-leg flights (connections) are represented as multiple FlightLeg records.
 */
export interface FlightLeg {
  id: FlightLegId;
  tripId: TripId;
  /** Airline name */
  airline: string;
  /** Airline IATA code (e.g., "BA", "UA") */
  airlineCode?: string;
  /** Flight number (e.g., "BA123") */
  flightNumber: string;
  /** Departure airport and time */
  departure: {
    airport: Airport;
    dateTime: DateTimePoint;
  };
  /** Arrival airport and time */
  arrival: {
    airport: Airport;
    dateTime: DateTimePoint;
  };
  /** Seat class */
  seatClass?: SeatClass;
  /** Seat number (e.g., "12A") */
  seatNumber?: string;
  /** Booking confirmation number */
  confirmationNumber?: string;
  /** Has lounge access for this flight */
  loungeAccess?: boolean;
  /** Lounge name if specific */
  loungeName?: string;
  /** Connection group ID - links legs of the same journey */
  connectionGroupId?: string;
  /** Order within connection group */
  legOrder?: number;
  /** Ticket price */
  price?: number;
  /** Currency for the price */
  currency?: string;
  /** Additional notes */
  notes?: string;
}

// =============================================================================
// Train Leg
// =============================================================================

/**
 * A train journey segment
 */
export interface TrainLeg {
  id: string;
  tripId: TripId;
  /** Train operator (e.g., "Eurostar", "Amtrak") */
  operator: string;
  /** Train number/name */
  trainNumber?: string;
  /** Departure station and time */
  departure: {
    station: string;
    city: string;
    dateTime: DateTimePoint;
  };
  /** Arrival station and time */
  arrival: {
    station: string;
    city: string;
    dateTime: DateTimePoint;
  };
  /** Seat/coach class */
  seatClass?: string;
  /** Car/coach number */
  carNumber?: string;
  /** Seat number */
  seatNumber?: string;
  /** Booking confirmation number */
  confirmationNumber?: string;
  /** Ticket price */
  price?: number;
  /** Currency for the price */
  currency?: string;
  /** Additional notes */
  notes?: string;
}

// =============================================================================
// Place Visit (Activity/Destination)
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
  | "spa"
  | "activity"
  | "tour"
  | "other";

export interface Reservation {
  time: TimeString;
  confirmationNumber?: string;
  partySize?: number;
  notes?: string;
}

/**
 * A planned visit to a place/activity.
 * The time can be flexible (moveable) or fixed (has reservation).
 */
export interface PlaceVisit {
  id: PlaceVisitId;
  tripId: TripId;
  /** Which city/destination this is in */
  destinationId: TripDestinationId;
  /** Link to destinations table if this is a known place */
  destinationSlug?: string;
  /** Place name */
  title: string;
  /** Brief description */
  description?: string;
  /** Category of place */
  category: PlaceCategory;
  /** Which date to visit */
  date: ISODate;
  /** Planned start time (if scheduled) */
  startTime?: TimeString;
  /** Expected duration in minutes */
  duration?: Minutes;
  /** Address */
  address?: string;
  /** Coordinates */
  location?: GeoLocation;
  /** Whether this can be moved to different time/day */
  isFlexible: boolean;
  /** Reservation details if booked */
  reservation?: Reservation;
  /** Estimated cost */
  estimatedCost?: number;
  /** Currency for the cost */
  currency?: string;
  /** Additional notes */
  notes?: string;
  /** Order within the day (for sorting flexible items) */
  orderInDay?: number;
}

// =============================================================================
// Free Time Block
// =============================================================================

export type FreeTimeType = "rest" | "explore" | "buffer" | "flexible";

/**
 * Explicitly scheduled free/unplanned time.
 * Useful for ensuring trips aren't overscheduled.
 */
export interface FreeTimeBlock {
  id: string;
  tripId: TripId;
  date: ISODate;
  startTime: TimeString;
  endTime: TimeString;
  /** Type of free time */
  type: FreeTimeType;
  /** Optional label (e.g., "Rest after flight", "Explore neighborhood") */
  label?: string;
  /** Additional notes */
  notes?: string;
}

// =============================================================================
// Complete Trip Data (Aggregate)
// =============================================================================

/**
 * Complete trip data with all related entities.
 * This is the full aggregate loaded from storage.
 */
export interface TripAggregate {
  trip: Trip;
  destinations: TripDestination[];
  stays: Stay[];
  flights: FlightLeg[];
  trains: TrainLeg[];
  places: PlaceVisit[];
  freeTime: FreeTimeBlock[];
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createTrip(
  partial: Partial<Trip> & Pick<Trip, "userId" | "title" | "startDate" | "endDate">
): Trip {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? crypto.randomUUID(),
    userId: partial.userId,
    title: partial.title,
    emoji: partial.emoji,
    startDate: partial.startDate,
    endDate: partial.endDate,
    travelers: partial.travelers ?? [],
    settings: partial.settings ?? DEFAULT_TRIP_SETTINGS,
    status: partial.status ?? "planning",
    coverImage: partial.coverImage,
    notes: partial.notes,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export function createTripDestination(
  partial: Partial<TripDestination> &
    Pick<TripDestination, "tripId" | "city" | "arrivalDate" | "departureDate" | "order">
): TripDestination {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tripId: partial.tripId,
    city: partial.city,
    country: partial.country,
    countryCode: partial.countryCode,
    arrivalDate: partial.arrivalDate,
    departureDate: partial.departureDate,
    order: partial.order,
    location: partial.location,
  };
}

export function createStay(
  partial: Partial<Stay> &
    Pick<Stay, "tripId" | "destinationId" | "name" | "checkIn" | "checkOut">
): Stay {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tripId: partial.tripId,
    destinationId: partial.destinationId,
    name: partial.name,
    destinationSlug: partial.destinationSlug,
    address: partial.address,
    location: partial.location,
    checkIn: partial.checkIn,
    checkOut: partial.checkOut,
    roomType: partial.roomType,
    confirmationNumber: partial.confirmationNumber,
    amenities: partial.amenities ?? DEFAULT_STAY_AMENITIES,
    pricePerNight: partial.pricePerNight,
    currency: partial.currency,
    notes: partial.notes,
  };
}

export function createFlightLeg(
  partial: Partial<FlightLeg> &
    Pick<FlightLeg, "tripId" | "airline" | "flightNumber" | "departure" | "arrival">
): FlightLeg {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tripId: partial.tripId,
    airline: partial.airline,
    airlineCode: partial.airlineCode,
    flightNumber: partial.flightNumber,
    departure: partial.departure,
    arrival: partial.arrival,
    seatClass: partial.seatClass,
    seatNumber: partial.seatNumber,
    confirmationNumber: partial.confirmationNumber,
    loungeAccess: partial.loungeAccess,
    loungeName: partial.loungeName,
    connectionGroupId: partial.connectionGroupId,
    legOrder: partial.legOrder,
    price: partial.price,
    currency: partial.currency,
    notes: partial.notes,
  };
}

export function createPlaceVisit(
  partial: Partial<PlaceVisit> &
    Pick<PlaceVisit, "tripId" | "destinationId" | "title" | "category" | "date">
): PlaceVisit {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tripId: partial.tripId,
    destinationId: partial.destinationId,
    destinationSlug: partial.destinationSlug,
    title: partial.title,
    description: partial.description,
    category: partial.category,
    date: partial.date,
    startTime: partial.startTime,
    duration: partial.duration,
    address: partial.address,
    location: partial.location,
    isFlexible: partial.isFlexible ?? true,
    reservation: partial.reservation,
    estimatedCost: partial.estimatedCost,
    currency: partial.currency,
    notes: partial.notes,
    orderInDay: partial.orderInDay,
  };
}

export function createFreeTimeBlock(
  partial: Partial<FreeTimeBlock> &
    Pick<FreeTimeBlock, "tripId" | "date" | "startTime" | "endTime">
): FreeTimeBlock {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tripId: partial.tripId,
    date: partial.date,
    startTime: partial.startTime,
    endTime: partial.endTime,
    type: partial.type ?? "flexible",
    label: partial.label,
    notes: partial.notes,
  };
}
