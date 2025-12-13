/**
 * Unified Trip Types
 *
 * Consolidates types from TripBuilderContext and useTripEditor
 * into a single coherent type system.
 */

import type { Destination } from '@/types/destination';
import type { Trip as SupabaseTrip, ItineraryItem, ItineraryItemNotes } from '@/types/trip';

// ============================================
// CORE ITEM TYPES
// ============================================

/**
 * Base item type - shared across all trip items
 */
export interface BaseTripItem {
  id: string;
  day: number;
  orderIndex: number;
  timeSlot?: string; // "09:00" format
  duration?: number; // minutes
  notes?: string;
  createdAt?: string;
}

/**
 * Place item - a destination/location
 */
export interface PlaceItem extends BaseTripItem {
  type: 'place';
  destination: Destination;
  // Computed fields
  travelTimeFromPrev?: number;
  crowdLevel?: number;
  crowdLabel?: string;
  isOutdoor?: boolean;
}

/**
 * Flight item
 */
export interface FlightItem extends BaseTripItem {
  type: 'flight';
  airline?: string;
  flightNumber?: string;
  from?: string;
  to?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
}

/**
 * Train item
 */
export interface TrainItem extends BaseTripItem {
  type: 'train';
  trainLine?: string;
  trainNumber?: string;
  from?: string;
  to?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
}

/**
 * Hotel item
 */
export interface HotelItem extends BaseTripItem {
  type: 'hotel';
  name: string;
  address?: string;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  roomType?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  destinationSlug?: string;
}

/**
 * Activity item (downtime, custom activities)
 */
export interface ActivityItem extends BaseTripItem {
  type: 'activity';
  title: string;
  activityType?: 'downtime' | 'hotel_time' | 'custom';
  description?: string;
  location?: string;
  linkedHotelId?: string;
}

/**
 * Union type for all trip items
 */
export type TripItem = PlaceItem | FlightItem | TrainItem | HotelItem | ActivityItem;

/**
 * Type guard for PlaceItem
 */
export function isPlaceItem(item: TripItem): item is PlaceItem {
  return item.type === 'place';
}

/**
 * Type guard for FlightItem
 */
export function isFlightItem(item: TripItem): item is FlightItem {
  return item.type === 'flight';
}

/**
 * Type guard for TrainItem
 */
export function isTrainItem(item: TripItem): item is TrainItem {
  return item.type === 'train';
}

/**
 * Type guard for HotelItem
 */
export function isHotelItem(item: TripItem): item is HotelItem {
  return item.type === 'hotel';
}

/**
 * Type guard for ActivityItem
 */
export function isActivityItem(item: TripItem): item is ActivityItem {
  return item.type === 'activity';
}

// ============================================
// DAY & TRIP TYPES
// ============================================

/**
 * Day insight for trip health
 */
export interface DayInsight {
  type: 'warning' | 'tip' | 'success';
  icon: 'clock' | 'route' | 'crowd' | 'weather' | 'food' | 'category';
  message: string;
  action?: string;
}

/**
 * A single day in a trip
 */
export interface TripDay {
  dayNumber: number;
  date?: string; // ISO date string
  items: TripItem[];
  // Computed metrics
  totalTime?: number;
  totalTravel?: number;
  isOverstuffed?: boolean;
  weather?: {
    condition: string;
    temp: number;
    isRainy: boolean;
  };
}

/**
 * Trip health score
 */
export interface TripHealth {
  score: number; // 0-100
  label: string;
  insights: DayInsight[];
  categoryBalance: Record<string, number>;
  totalWalkingTime: number;
  hasTimeConflicts: boolean;
  missingMeals: number[];
}

/**
 * Trip mode - builder vs editor
 */
export type TripMode = 'builder' | 'editor';

/**
 * Active trip state (in-memory, potentially unsaved)
 */
export interface ActiveTrip {
  id?: string; // Supabase ID if saved
  title: string;
  city: string;
  startDate?: string;
  endDate?: string;
  days: TripDay[];
  travelers: number;
  coverImage?: string;
  // State
  mode: TripMode;
  isModified: boolean;
  lastSaved?: string;
}

/**
 * Saved trip summary (for listing)
 */
export interface SavedTripSummary {
  id: string;
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  status: string;
  coverImage?: string;
  itemCount: number;
  updatedAt: string;
}

// ============================================
// SAVING STATUS
// ============================================

export type SavingStatus = 'idle' | 'saving' | 'saved' | 'error';

// ============================================
// CONVERSION UTILITIES
// ============================================

/**
 * Convert a Supabase ItineraryItem to a TripItem
 */
export function itineraryItemToTripItem(
  item: ItineraryItem,
  destination?: Destination
): TripItem {
  const parsed = item.notes ? parseNotes(item.notes) : undefined;

  // Determine type from parsed notes
  const type = parsed?.type || 'place';

  const base: BaseTripItem = {
    id: item.id,
    day: item.day,
    orderIndex: item.order_index,
    timeSlot: item.time || undefined,
    duration: parsed?.duration,
    notes: parsed?.raw,
    createdAt: item.created_at,
  };

  switch (type) {
    case 'flight':
      return {
        ...base,
        type: 'flight',
        airline: parsed?.airline,
        flightNumber: parsed?.flightNumber,
        from: parsed?.from,
        to: parsed?.to,
        departureDate: parsed?.departureDate,
        departureTime: parsed?.departureTime,
        arrivalDate: parsed?.arrivalDate,
        arrivalTime: parsed?.arrivalTime,
        confirmationNumber: parsed?.confirmationNumber,
        terminal: parsed?.terminal,
        gate: parsed?.gate,
        seatNumber: parsed?.seatNumber,
      };

    case 'train':
      return {
        ...base,
        type: 'train',
        trainLine: parsed?.trainLine,
        trainNumber: parsed?.trainNumber,
        from: parsed?.from,
        to: parsed?.to,
        departureDate: parsed?.departureDate,
        departureTime: parsed?.departureTime,
        arrivalDate: parsed?.arrivalDate,
        arrivalTime: parsed?.arrivalTime,
        confirmationNumber: parsed?.confirmationNumber,
      };

    case 'hotel':
      return {
        ...base,
        type: 'hotel',
        name: item.title || parsed?.name || 'Hotel',
        address: parsed?.address,
        checkInDate: parsed?.checkInDate,
        checkInTime: parsed?.checkInTime,
        checkOutDate: parsed?.checkOutDate,
        checkOutTime: parsed?.checkOutTime,
        confirmationNumber: parsed?.hotelConfirmation,
        roomType: parsed?.roomType,
        image: parsed?.image,
        latitude: parsed?.latitude,
        longitude: parsed?.longitude,
        destinationSlug: item.destination_slug || undefined,
      };

    case 'activity':
      return {
        ...base,
        type: 'activity',
        title: item.title || 'Activity',
        activityType: parsed?.activityType,
        description: item.description || undefined,
        location: parsed?.location,
        linkedHotelId: parsed?.linkedHotelId,
      };

    case 'place':
    default:
      return {
        ...base,
        type: 'place',
        destination: destination || {
          slug: item.destination_slug || '',
          name: item.title || '',
          city: item.description || '',
          category: parsed?.category || null,
          image: parsed?.image || null,
        } as Destination,
      };
  }
}

/**
 * Convert a TripItem to Supabase ItineraryItem format for saving
 */
export function tripItemToItineraryData(item: TripItem, tripId: string): {
  trip_id: string;
  destination_slug: string | null;
  day: number;
  order_index: number;
  time: string | null;
  title: string;
  description: string | null;
  notes: string;
} {
  const notes: ItineraryItemNotes = {
    type: item.type,
    duration: item.duration,
    raw: item.notes,
  };

  let title = '';
  let description: string | null = null;
  let destinationSlug: string | null = null;

  switch (item.type) {
    case 'place':
      title = item.destination.name;
      description = item.destination.city || null;
      destinationSlug = item.destination.slug;
      notes.category = item.destination.category || undefined;
      notes.image = item.destination.image || undefined;
      notes.latitude = item.destination.latitude ?? undefined;
      notes.longitude = item.destination.longitude ?? undefined;
      break;

    case 'flight':
      title = `${item.airline || ''} ${item.flightNumber || 'Flight'}`.trim();
      description = `${item.from || ''} → ${item.to || ''}`;
      notes.airline = item.airline;
      notes.flightNumber = item.flightNumber;
      notes.from = item.from;
      notes.to = item.to;
      notes.departureDate = item.departureDate;
      notes.departureTime = item.departureTime;
      notes.arrivalDate = item.arrivalDate;
      notes.arrivalTime = item.arrivalTime;
      notes.confirmationNumber = item.confirmationNumber;
      notes.terminal = item.terminal;
      notes.gate = item.gate;
      notes.seatNumber = item.seatNumber;
      break;

    case 'train':
      title = item.trainLine
        ? `${item.trainLine}${item.trainNumber ? ` ${item.trainNumber}` : ''}`
        : `Train ${item.trainNumber || ''}`;
      description = `${item.from || ''} → ${item.to || ''}`;
      notes.trainLine = item.trainLine;
      notes.trainNumber = item.trainNumber;
      notes.from = item.from;
      notes.to = item.to;
      notes.departureDate = item.departureDate;
      notes.departureTime = item.departureTime;
      notes.arrivalDate = item.arrivalDate;
      notes.arrivalTime = item.arrivalTime;
      notes.confirmationNumber = item.confirmationNumber;
      break;

    case 'hotel':
      title = item.name;
      description = item.address || null;
      destinationSlug = item.destinationSlug || null;
      notes.name = item.name;
      notes.address = item.address;
      notes.checkInDate = item.checkInDate;
      notes.checkInTime = item.checkInTime;
      notes.checkOutDate = item.checkOutDate;
      notes.checkOutTime = item.checkOutTime;
      notes.hotelConfirmation = item.confirmationNumber;
      notes.roomType = item.roomType;
      notes.image = item.image;
      notes.latitude = item.latitude;
      notes.longitude = item.longitude;
      break;

    case 'activity':
      title = item.title;
      description = item.description || null;
      notes.activityType = item.activityType;
      notes.location = item.location;
      notes.linkedHotelId = item.linkedHotelId;
      break;
  }

  return {
    trip_id: tripId,
    destination_slug: destinationSlug,
    day: item.day,
    order_index: item.orderIndex,
    time: item.timeSlot || null,
    title,
    description,
    notes: JSON.stringify(notes),
  };
}

/**
 * Parse notes JSON string
 */
function parseNotes(notes: string): ItineraryItemNotes | undefined {
  if (!notes) return undefined;
  try {
    return JSON.parse(notes);
  } catch {
    return undefined;
  }
}

// ============================================
// TRIP STATS
// ============================================

/**
 * Statistics about a trip's contents
 */
export interface TripStats {
  totalStops: number;
  totalDays: number;
  flights: number;
  trains: number;
  hotels: number;
  restaurants: number;
  places: number;
  activities: number;
  categories: Set<string>;
}

/**
 * Calculate stats from trip days
 */
export function calculateTripStats(days: TripDay[]): TripStats {
  const stats: TripStats = {
    totalStops: 0,
    totalDays: days.length,
    flights: 0,
    trains: 0,
    hotels: 0,
    restaurants: 0,
    places: 0,
    activities: 0,
    categories: new Set(),
  };

  for (const day of days) {
    for (const item of day.items) {
      stats.totalStops++;

      switch (item.type) {
        case 'flight':
          stats.flights++;
          break;
        case 'train':
          stats.trains++;
          break;
        case 'hotel':
          stats.hotels++;
          break;
        case 'activity':
          stats.activities++;
          break;
        case 'place':
          stats.places++;
          if (item.destination.category) {
            stats.categories.add(item.destination.category);
            if (item.destination.category.toLowerCase().includes('restaurant')) {
              stats.restaurants++;
            }
          }
          break;
      }
    }
  }

  return stats;
}
