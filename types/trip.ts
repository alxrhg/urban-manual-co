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

export type ItineraryItemType = 'place' | 'flight' | 'train' | 'drive' | 'hotel' | 'breakfast' | 'event' | 'custom';

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
  raw?: string;
  duration?: number; // in minutes
  image?: string;
  city?: string;
  category?: string;
  slug?: string;
  // Location data
  latitude?: number;
  longitude?: number;
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
  // Train-specific fields
  trainNumber?: string;
  trainLine?: string;
  // Hotel-specific fields
  isHotel?: boolean; // Marks this as the hotel for the night
  breakfastIncluded?: boolean; // If true, shows breakfast at top of next day
  checkInTime?: string;
  checkOutTime?: string;
  checkInDate?: string;
  checkOutDate?: string;
  hotelConfirmation?: string;
  // Lodging details
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  notes?: string;
  // Reservation details
  partySize?: number;
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
}

/**
 * Flight data structure
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

