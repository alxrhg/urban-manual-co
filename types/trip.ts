/**
 * Trip types for the Urban Manual trip planner system
 *
 * This file contains:
 * 1. New comprehensive types for the enhanced trip planner (v2)
 * 2. Legacy types matching the original Supabase schema (for backwards compatibility)
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type BookingStatus = 'not_booked' | 'pending' | 'confirmed' | 'cancelled';

export type TravelMode = 'walk' | 'transit' | 'car' | 'taxi' | 'bike';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'brunch' | 'coffee' | 'drinks';

export type CardType =
  | 'flight'
  | 'hotel_overnight'
  | 'restaurant'
  | 'attraction'
  | 'transport'
  | 'hotel_activity' // minimal inline
  | 'airport_activity' // minimal inline (lounge, etc)
  | 'free_time'
  | 'custom';

export type HotelActivityType =
  | 'check_in'
  | 'checkout'
  | 'breakfast'
  | 'pool'
  | 'spa'
  | 'gym'
  | 'lounge'
  | 'get_ready'
  | 'rest';

export type AirportActivityType =
  | 'lounge'
  | 'security'
  | 'checkin_counter'
  | 'boarding';

export type TripVisibility = 'private' | 'shared' | 'public';

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

// ============================================
// ITEM ROLES
// ============================================

/**
 * ItemRole classifies trip items by their scheduling behavior:
 *
 * - `fixed`: Anchors that cannot be moved (flights, hotel check-in/out, ticketed events)
 * - `planned`: Time-sensitive but movable (reservations with time windows)
 * - `flexible`: Open blocks that can absorb overflow (walks, downtime, exploration)
 * - `candidate`: Curated list items not yet on the timeline
 */
export type ItemRole = 'fixed' | 'planned' | 'flexible' | 'candidate';

/**
 * Role metadata providing UI behavior hints
 */
export interface ItemRoleConfig {
  role: ItemRole;
  canBeAutoMoved: boolean;
  canGenerateConflicts: boolean;
  canAbsorbOverflow: boolean;
  isOnTimeline: boolean;
}

/**
 * Role configuration lookup
 */
export const ITEM_ROLE_CONFIG: Record<ItemRole, Omit<ItemRoleConfig, 'role'>> = {
  fixed: {
    canBeAutoMoved: false,
    canGenerateConflicts: false, // Fixed items ARE the anchors, they don't conflict
    canAbsorbOverflow: false,
    isOnTimeline: true,
  },
  planned: {
    canBeAutoMoved: true,
    canGenerateConflicts: true, // Conflicts are actionable, not just warnings
    canAbsorbOverflow: false,
    isOnTimeline: true,
  },
  flexible: {
    canBeAutoMoved: true,
    canGenerateConflicts: false,
    canAbsorbOverflow: true, // Can absorb time from other activities
    isOnTimeline: true,
  },
  candidate: {
    canBeAutoMoved: false,
    canGenerateConflicts: false, // Never on timeline, never conflicts
    canAbsorbOverflow: false,
    isOnTimeline: false,
  },
};

/**
 * Infers the role of an item based on its type and properties.
 * This is the core classification logic.
 */
export function inferItemRole(
  itemType: ItineraryItemType | CardType | undefined,
  notes?: ItineraryItemNotes | null
): ItemRole {
  // Flight is always fixed
  if (itemType === 'flight') {
    return 'fixed';
  }

  // Hotel check-in/checkout are fixed anchors
  if (itemType === 'hotel' || notes?.isHotel) {
    // The overnight stay itself and check-in/checkout are fixed
    if (notes?.hotelItemType === 'check_in' || notes?.hotelItemType === 'checkout') {
      return 'fixed';
    }
    // Hotel breakfast and amenities (pool, spa, lounge) are flexible
    if (
      notes?.hotelItemType === 'breakfast' ||
      notes?.hotelItemType === 'lounge' ||
      notes?.activityType === 'breakfast-at-hotel' ||
      notes?.activityType === 'pool' ||
      notes?.activityType === 'spa' ||
      notes?.activityType === 'gym'
    ) {
      return 'flexible';
    }
    // Overnight card is fixed (marks where you're staying)
    if (notes?.hotelItemType === 'overnight') {
      return 'fixed';
    }
    return 'fixed'; // Default hotel to fixed
  }

  // Train is fixed (ticketed transport)
  if (itemType === 'train') {
    return 'fixed';
  }

  // Events with tickets are fixed
  if (itemType === 'event') {
    // If it has a ticket confirmation, it's fixed
    if (notes?.ticketConfirmation || notes?.ticketUrl) {
      return 'fixed';
    }
    // Otherwise it's planned (can be rescheduled)
    return 'planned';
  }

  // Restaurants with reservations are planned
  if (itemType === 'place' || itemType === 'restaurant' || itemType === 'attraction') {
    // Has a reservation/booking = planned
    if (
      notes?.bookingStatus === 'booked' ||
      notes?.confirmationNumber ||
      notes?.confirmation
    ) {
      return 'planned';
    }
    // Walk-in or need-to-book = flexible (can be moved easily)
    if (notes?.bookingStatus === 'walk-in' || notes?.bookingStatus === 'need-to-book') {
      return 'flexible';
    }
    // Has a specific time but no booking = planned
    if (notes?.eventTime) {
      return 'planned';
    }
    // Default places to planned (they're on the timeline with intent)
    return 'planned';
  }

  // Activities/downtime are flexible
  if (itemType === 'activity') {
    return 'flexible';
  }

  // Breakfast is flexible
  if (itemType === 'breakfast') {
    return 'flexible';
  }

  // Custom items default to flexible
  if (itemType === 'custom' || itemType === 'free_time') {
    return 'flexible';
  }

  // CardType mappings
  if (itemType === 'hotel_overnight') {
    return 'fixed';
  }
  if (itemType === 'hotel_activity' || itemType === 'airport_activity') {
    return 'flexible';
  }
  if (itemType === 'transport') {
    // Ground transport (taxi, etc) is flexible unless it's booked
    if (notes?.confirmationNumber) {
      return 'fixed';
    }
    return 'flexible';
  }

  // Default to planned for unknown types
  return 'planned';
}

/**
 * Gets the full role configuration for an item
 */
export function getItemRoleConfig(
  itemType: ItineraryItemType | CardType | undefined,
  notes?: ItineraryItemNotes | null
): ItemRoleConfig {
  const role = inferItemRole(itemType, notes);
  return {
    role,
    ...ITEM_ROLE_CONFIG[role],
  };
}

// ============================================
// TRIP (v2)
// ============================================

export interface TripV2 {
  id: string;
  userId: string;
  title: string;
  emoji?: string;
  destinations: string[]; // city names
  startDate: string; // ISO date
  endDate: string;
  travelerCount: number;

  // Settings
  timeFormat: '12h' | '24h';
  tempUnit: 'F' | 'C';
  distanceUnit: 'mi' | 'km';
  currency: string;

  // Sharing
  visibility: TripVisibility;
  shareSlug?: string;

  createdAt: string;
  updatedAt: string;
}

// ============================================
// FLIGHTS
// ============================================

export interface Flight {
  id: string;
  tripId: string;

  // Flight info
  airline: string;
  airlineCode: string; // UA, AA, DL
  flightNumber: string; // "1610"
  aircraftType?: string;

  // Route
  departureAirport: string; // IATA code
  departureCity: string;
  departureTime: string; // ISO datetime
  departureTerminal?: string;
  departureGate?: string;

  arrivalAirport: string;
  arrivalCity: string;
  arrivalTime: string;
  arrivalTerminal?: string;
  arrivalGate?: string;

  // Duration
  durationMinutes: number;
  isDirectFlight: boolean;
  stops?: FlightStop[];

  // Booking
  bookingStatus: BookingStatus;
  confirmationNumber?: string;
  bookingUrl?: string;

  // Passenger details
  seatNumber?: string;
  seatClass: 'economy' | 'premium_economy' | 'business' | 'first';
  bagsCarryOn: number;
  bagsChecked: number;
  frequentFlyerNumber?: string;

  // Lounge
  loungeAccess: boolean;
  loungeLocation?: string;
  loungeName?: string;

  // Trip integration
  day: number; // which trip day
  legType: 'outbound' | 'return' | 'multi_city';

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlightStop {
  airport: string;
  city: string;
  arrivalTime: string;
  departureTime: string;
  durationMinutes: number; // layover
  terminal?: string;
  changeTerminal: boolean;
}

// ============================================
// HOTELS
// ============================================

export interface HotelBooking {
  id: string;
  tripId: string;
  destinationSlug?: string; // link to Urban Manual catalog

  // Hotel info
  name: string;
  brand?: string; // Marriott, Hilton, etc.
  starRating?: number;
  address: string;
  city: string;
  phone?: string;
  website?: string;
  imageUrl?: string;

  // Location
  latitude?: number;
  longitude?: number;

  // Stay details
  checkInDate: string; // ISO date
  checkOutDate: string;
  checkInTime: string; // "15:00"
  checkOutTime: string; // "11:00"
  nights: number;

  // Room
  roomType?: string;
  roomNumber?: string;
  floorPreference?: string;
  bedType?: string;

  // Booking
  bookingStatus: BookingStatus;
  confirmationNumber?: string;
  bookingUrl?: string;

  // Pricing
  costPerNight?: number;
  totalCost?: number;
  currency: string;

  // Amenities (booleans for quick access)
  breakfastIncluded: boolean;
  breakfastTime?: string; // "07:00-10:00"
  breakfastLocation?: string; // "Lobby restaurant"

  hasPool: boolean;
  poolHours?: string;

  hasGym: boolean;
  gymHours?: string;

  hasSpa: boolean;

  hasLounge: boolean; // club lounge
  loungeHours?: string;
  loungeLocation?: string;

  parkingIncluded: boolean;
  parkingCost?: number;
  parkingType?: 'self' | 'valet';

  wifiIncluded: boolean;

  airportShuttle: boolean;

  // All amenities as array too (for display)
  amenities: string[];

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ITINERARY ITEMS (v2)
// ============================================

export interface ItineraryItemV2 {
  id: string;
  tripId: string;

  // Positioning
  day: number;
  orderIndex: number;
  time?: string; // "14:30"
  endTime?: string;
  durationMinutes?: number;

  // Type & Role
  category: CardType;
  subtype?: HotelActivityType | AirportActivityType | MealType;
  /**
   * Item role determines scheduling behavior:
   * - fixed: Cannot be auto-moved (flights, check-in/out, ticketed events)
   * - planned: Movable reservations with time windows
   * - flexible: Open blocks that absorb overflow
   * - candidate: Not yet on timeline
   */
  role: ItemRole;

  // Content
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;

  // Location
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;

  // Destination link
  destinationSlug?: string; // link to Urban Manual catalog

  // Booking
  bookingStatus: BookingStatus;
  confirmationNumber?: string;
  bookingUrl?: string;
  partySize?: number;

  // Cost
  costEstimate?: number;
  currency: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';

  // Travel to next
  travelTimeToNext?: number; // minutes
  travelDistanceToNext?: number; // km
  travelModeToNext?: TravelMode;

  // References
  flightId?: string; // links to Flight
  hotelBookingId?: string; // links to HotelBooking
  nightNumber?: number; // for overnight cards
  totalNights?: number;

  // Meta
  priority: 'must_do' | 'high' | 'medium' | 'low' | 'optional';
  isWeatherDependent: boolean;
  isIndoor: boolean;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// COLLABORATORS
// ============================================

export interface TripCollaborator {
  id: string;
  tripId: string;
  email: string;
  userId?: string;
  role: CollaboratorRole;
  status: 'pending' | 'accepted';
  invitedAt: string;
  acceptedAt?: string;
}

// ============================================
// NOTES & ATTACHMENTS
// ============================================

export interface TripNote {
  id: string;
  tripId: string;
  day?: number; // null for general notes
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TripAttachment {
  id: string;
  tripId: string;
  type: 'link' | 'file';
  title: string;
  url?: string;
  filePath?: string;
  createdAt: string;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface ScheduleGap {
  type: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  previousItem?: ItineraryItemV2;
  nextItem?: ItineraryItemV2;
}

export interface TravelEstimate {
  durationMinutes: number;
  distanceKm: number;
  mode: TravelMode;
  estimatedCost?: number;
}

export interface DayWeather {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  icon: string;
  precipitation: number;
}

// ============================================
// LEGACY TYPES (v1 - Supabase schema)
// ============================================

/**
 * Trip types matching Supabase schema exactly
 * Based on migrations/trips.sql
 */

export interface Trip {
  id: string; // UUID
  user_id: string; // UUID
  title: string; // VARCHAR(255) NOT NULL
  description: string | null; // TEXT
  destination: string | null; // VARCHAR(255)
  start_date: string | null; // DATE (ISO date string)
  end_date: string | null; // DATE (ISO date string)
  status: 'planning' | 'upcoming' | 'ongoing' | 'completed'; // VARCHAR(50) NOT NULL DEFAULT 'planning'
  is_public: boolean; // BOOLEAN NOT NULL DEFAULT FALSE
  cover_image: string | null; // VARCHAR(500)
  notes: string | null; // TEXT (JSON with TripNotes structure)
  created_at: string; // TIMESTAMP WITH TIME ZONE
  updated_at: string; // TIMESTAMP WITH TIME ZONE
}

/**
 * Trip notes item - can be a text paragraph or a checkbox item
 */
export interface TripNoteItem {
  id: string;
  type: 'text' | 'checkbox';
  content: string;
  checked?: boolean; // Only for checkbox items
}

/**
 * Trip notes structure stored as JSON in the notes field
 */
export interface TripNotes {
  items: TripNoteItem[];
}

/**
 * Helper to parse trip notes JSON safely
 */
export function parseTripNotes(notes: string | null): TripNotes {
  if (!notes) return { items: [] };
  try {
    const parsed = JSON.parse(notes);
    if (parsed && Array.isArray(parsed.items)) {
      return parsed;
    }
    return { items: [] };
  } catch {
    return { items: [] };
  }
}

/**
 * Helper to stringify trip notes for storage
 */
export function stringifyTripNotes(notes: TripNotes): string {
  return JSON.stringify(notes);
}

/**
 * Helper to parse destinations from the destination field.
 * Supports both legacy single-city format and new JSON array format.
 *
 * @example
 * parseDestinations(null) // []
 * parseDestinations("Tokyo") // ["Tokyo"]
 * parseDestinations('["Tokyo","Paris"]') // ["Tokyo", "Paris"]
 */
export function parseDestinations(destination: string | null): string[] {
  if (!destination) return [];

  // Try to parse as JSON array first
  if (destination.startsWith('[')) {
    try {
      const parsed = JSON.parse(destination);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
      }
    } catch {
      // Fall through to legacy format
    }
  }

  // Legacy format: single city string
  return destination.trim() ? [destination.trim()] : [];
}

/**
 * Helper to stringify destinations for storage.
 * Stores as JSON array for multi-city support.
 * Returns null if empty.
 *
 * @example
 * stringifyDestinations([]) // null
 * stringifyDestinations(["Tokyo"]) // '["Tokyo"]'
 * stringifyDestinations(["Tokyo", "Paris"]) // '["Tokyo","Paris"]'
 */
export function stringifyDestinations(destinations: string[]): string | null {
  if (!destinations || destinations.length === 0) return null;
  return JSON.stringify(destinations);
}

/**
 * Helper to format destinations for display (comma-separated).
 *
 * @example
 * formatDestinations([]) // ""
 * formatDestinations(["Tokyo"]) // "Tokyo"
 * formatDestinations(["Tokyo", "Paris"]) // "Tokyo, Paris"
 */
export function formatDestinations(destinations: string[]): string {
  return destinations.join(', ');
}

/**
 * Helper to format destinations from the raw destination field for display.
 * Combines parsing and formatting.
 */
export function formatDestinationsFromField(destination: string | null): string {
  return formatDestinations(parseDestinations(destination));
}

export interface InsertTrip {
  user_id: string;
  title: string;
  description?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: 'planning' | 'upcoming' | 'ongoing' | 'completed';
  is_public?: boolean;
  cover_image?: string | null;
  notes?: string | null;
}

export interface UpdateTrip {
  title?: string;
  description?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: 'planning' | 'upcoming' | 'ongoing' | 'completed';
  is_public?: boolean;
  cover_image?: string | null;
  notes?: string | null;
}

export type ItineraryItemType = 'place' | 'flight' | 'train' | 'drive' | 'hotel' | 'breakfast' | 'event' | 'activity' | 'custom';

// Activity types for downtime/hotel time blocks
export type ActivityType =
  | 'nap'
  | 'pool'
  | 'spa'
  | 'gym'
  | 'breakfast-at-hotel'
  | 'getting-ready'
  | 'packing'
  | 'free-time'
  | 'sunset'
  | 'checkout-prep'
  | 'work'
  | 'call'
  | 'shopping-time'
  | 'photo-walk'
  | 'other';

export interface ItineraryItem {
  id: string; // UUID
  trip_id: string; // UUID
  destination_slug: string | null; // VARCHAR(255)
  day: number; // INTEGER NOT NULL
  order_index: number; // INTEGER NOT NULL
  time: string | null; // VARCHAR(50) - start time e.g. "09:00"
  title: string; // VARCHAR(255) NOT NULL
  description: string | null; // TEXT
  notes: string | null; // TEXT (can contain JSON)
  created_at: string; // TIMESTAMP WITH TIME ZONE
}

export interface InsertItineraryItem {
  trip_id: string;
  destination_slug?: string | null;
  day: number;
  order_index: number;
  time?: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
}

export interface UpdateItineraryItem {
  destination_slug?: string | null;
  day?: number;
  order_index?: number;
  time?: string | null;
  title?: string;
  description?: string | null;
  notes?: string | null;
}

/**
 * Extended types for UI components
 */
export interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
  duration?: number;
}

/**
 * Parsed notes data structure (stored as JSON in notes field)
 */
export interface ItineraryItemNotes {
  type?: ItineraryItemType;
  /**
   * Item role for scheduling behavior.
   * If not set, will be inferred from type and other properties.
   * Can be explicitly set to override inference.
   */
  role?: ItemRole;
  raw?: string;
  duration?: number; // in minutes
  image?: string;
  city?: string;
  category?: string;
  slug?: string;
  // Location data
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string; // Google Places API place_id
  // Flight-specific fields
  from?: string;
  to?: string;
  airline?: string;
  flightNumber?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
  // Train-specific fields
  trainNumber?: string;
  trainLine?: string;
  // Hotel-specific fields
  isHotel?: boolean; // Marks this as the hotel for the night
  breakfastIncluded?: boolean; // If true, shows breakfast at top of next day
  breakfastTime?: string; // e.g. "7:00-10:00"
  checkInTime?: string;
  checkOutTime?: string;
  checkInDate?: string;
  checkOutDate?: string;
  hotelConfirmation?: string;
  confirmation?: string; // Booking reference
  roomType?: string;
  // Hotel activity positions (for reordering check-in/checkout/breakfast cards)
  checkinPosition?: number; // Position of check-in card among day items
  checkoutPosition?: number; // Position of checkout card among day items
  breakfastPosition?: number; // Position of breakfast card among day items
  // Lodging details
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  notes?: string;
  // Reservation details
  partySize?: number;
  bookingStatus?: 'need-to-book' | 'booked' | 'waitlist' | 'walk-in';
  // Planning & Organization
  priority?: 'must-do' | 'want-to' | 'if-time';
  visitedStatus?: 'planned' | 'visited' | 'skipped';
  tags?: string[];
  personalRating?: number; // 1-5 stars
  // Travel time to next item
  travelTimeToNext?: number; // in minutes
  travelDistanceToNext?: number; // in km
  travelModeToNext?: 'walking' | 'driving' | 'transit' | 'flight';
  // Event-specific fields
  eventType?: 'concert' | 'show' | 'sports' | 'exhibition' | 'festival' | 'tour' | 'other';
  venue?: string;
  eventDate?: string;
  eventTime?: string;
  endTime?: string;
  ticketUrl?: string;
  ticketConfirmation?: string;
  seatInfo?: string;
  // Activity-specific fields (downtime, hotel time, etc.)
  activityType?: ActivityType;
  linkedHotelId?: string; // Link activity to a hotel (e.g., pool at hotel)
  linkedFlightId?: string; // Link activity to a flight (e.g., airport lounge)
  location?: string; // Where the activity takes place (e.g., "hotel pool", "room")
  // Flight sync fields
  flightId?: string; // Unique ID for flight sync tracking
  loungeAccess?: boolean; // Whether lounge access is included
  // Hotel sync fields
  hotelBookingId?: string; // Unique ID for hotel booking sync tracking
  hotelItemType?: 'check_in' | 'checkout' | 'breakfast' | 'overnight' | 'lounge'; // Type of hotel-related item
  hasLounge?: boolean; // Whether hotel has a lounge
  amenities?: string[]; // Hotel amenities list
}

/**
 * Activity data structure for adding downtime/hotel activities
 */
export interface ActivityData {
  type: 'activity';
  activityType: ActivityType;
  title: string;
  duration?: number;
  linkedHotelId?: string;
  location?: string;
  notes?: string;
}

/**
 * Flight data structure (legacy)
 */
export interface FlightData {
  type: 'flight';
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  confirmationNumber?: string;
  notes?: string;
}

/**
 * Train data structure
 */
export interface TrainData {
  type: 'train';
  trainLine?: string;
  trainNumber?: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate?: string;
  arrivalTime?: string;
  duration?: number;
  confirmationNumber?: string;
  notes?: string;
}

/**
 * Hotel data structure for adding hotels (legacy)
 */
export interface HotelData {
  type: 'hotel';
  name: string;
  address?: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  roomType?: string;
  notes?: string;
  breakfastIncluded?: boolean;
  breakfastTime?: string;
  // For curated hotels
  destination_slug?: string;
  image?: string;
  // Coordinates for travel time calculation
  latitude?: number;
  longitude?: number;
}

/**
 * Helper to parse notes JSON safely
 */
export function parseItineraryNotes(notes: string | null): ItineraryItemNotes | null {
  if (!notes) return null;
  try {
    return JSON.parse(notes);
  } catch {
    return { raw: notes };
  }
}

/**
 * Helper to stringify notes for storage
 */
export function stringifyItineraryNotes(notes: ItineraryItemNotes): string {
  return JSON.stringify(notes);
}
