/**
 * Types for trip panel components
 */

import type { ItineraryItem, ItineraryItemNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';

/**
 * Trip settings for formatting and preferences
 */
export interface TripSettings {
  dateFormat?: 'US' | 'EU' | 'ISO'; // MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
  timeFormat?: '12h' | '24h';
  currency?: string;
  timezone?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Flight booking data with all details
 */
export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  from: string; // Airport code
  to: string; // Airport code
  fromCity?: string;
  toCity?: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  terminal?: string;
  arrivalTerminal?: string;
  gate?: string;
  arrivalGate?: string;
  confirmationNumber?: string;
  bookingStatus?: 'confirmed' | 'pending' | 'cancelled';
  seatNumber?: string;
  cabinClass?: 'economy' | 'premium-economy' | 'business' | 'first';
  bagsCarryOn?: number;
  bagsChecked?: number;
  frequentFlyerNumber?: string;
  loungeAccess?: boolean;
  loungeName?: string;
  loungeLocation?: string;
  notes?: string;
  duration?: number; // in minutes
}

/**
 * Hotel booking data with all details
 */
export interface HotelBooking {
  id: string;
  name: string;
  address?: string;
  city?: string;
  stars?: number;
  imageUrl?: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  bookingStatus?: 'confirmed' | 'pending' | 'cancelled';
  roomType?: string;
  floorPreference?: string;
  nights?: number;
  ratePerNight?: number;
  totalCost?: number;
  currency?: string;
  // Amenities
  breakfastIncluded?: boolean;
  breakfastTime?: string;
  breakfastLocation?: string;
  hasPool?: boolean;
  poolHours?: string;
  hasGym?: boolean;
  gymHours?: string;
  hasSpa?: boolean;
  hasClubLounge?: boolean;
  clubLoungeHours?: string;
  clubLoungeLocation?: string;
  hasParking?: boolean;
  parkingType?: 'self' | 'valet';
  parkingCost?: number;
  wifiIncluded?: boolean;
  hasAirportShuttle?: boolean;
  notes?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Enriched itinerary item with parsed notes and destination data
 */
export interface EnrichedItem extends ItineraryItem {
  parsedNotes?: ItineraryItemNotes | null;
  destination?: Destination | null;
}

/**
 * Item category for determining which panel content to show
 */
export type ItemCategory =
  | 'flight'
  | 'hotel_overnight'
  | 'restaurant'
  | 'attraction'
  | 'bar'
  | 'cafe'
  | 'activity'
  | 'event'
  | 'transport'
  | 'custom';

/**
 * Helper to determine item category from parsed notes
 */
export function getItemCategory(item: EnrichedItem): ItemCategory {
  const type = item.parsedNotes?.type;
  const category = item.parsedNotes?.category?.toLowerCase();

  if (type === 'flight') return 'flight';
  if (type === 'hotel' || item.parsedNotes?.isHotel) return 'hotel_overnight';
  if (type === 'event') return 'event';
  if (type === 'activity') return 'activity';

  // Category-based detection
  if (category?.includes('restaurant') || category?.includes('dining')) return 'restaurant';
  if (category?.includes('bar') || category?.includes('lounge')) return 'bar';
  if (category?.includes('cafe') || category?.includes('coffee')) return 'cafe';
  if (category?.includes('hotel') || category?.includes('lodging')) return 'hotel_overnight';
  if (
    category?.includes('museum') ||
    category?.includes('attraction') ||
    category?.includes('landmark') ||
    category?.includes('gallery') ||
    category?.includes('park')
  ) {
    return 'attraction';
  }

  return 'custom';
}
