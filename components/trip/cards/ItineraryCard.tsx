'use client';

import type { ItineraryItem as BaseItineraryItem, ItineraryItemNotes, ItemSource } from '@/types/trip';
import type { Destination } from '@/types/destination';

// Extended ItineraryItem with category for card rendering
export interface ItineraryItem extends BaseItineraryItem {
  category:
    | 'flight'
    | 'restaurant'
    | 'attraction'
    | 'cafe'
    | 'bar'
    | 'shopping'
    | 'culture'
    | 'hotel_activity'
    | 'airport_activity'
    | 'hotel_overnight'
    | 'transport'
    | 'free_time'
    | 'custom';
  flightId?: string;
  hotelBookingId?: string;
  parsedNotes?: ItineraryItemNotes | null;
  // For enriched items with destination data
  destination?: Destination;
}

// Flight booking data
export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
}

// Hotel booking data
export interface HotelBooking {
  id: string;
  name: string;
  address?: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  roomType?: string;
  phone?: string;
  website?: string;
  image?: string;
}

// Trip settings for card rendering context
export interface TripSettings {
  id: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  destination?: string | null;
  timezone?: string;
  is24HourTime?: boolean;
}

// Import card components
import FlightCard from './FlightCard';
import RestaurantCard from './RestaurantCard';
import AttractionCard from './AttractionCard';
import MinimalActivityCard from './MinimalActivityCard';
import OvernightCard from './OvernightCard';
import TransportCard from './TransportCard';
import FreeTimeGap from './FreeTimeGap';
import CustomCard from './CustomCard';

// Source-based cards for visual hierarchy
import CuratedPlaceCard from './CuratedPlaceCard';
import GooglePlaceCard from './GooglePlaceCard';

/**
 * Determine the source of an item for visual hierarchy
 * - curated: Has destination_slug pointing to Urban Manual catalog
 * - google: Has parsedNotes.googlePlaceId from Google Places
 * - manual: Default for custom/manual entries
 */
function getItemSource(item: ItineraryItem): ItemSource {
  // Explicit source in notes takes precedence
  if (item.parsedNotes?.source) {
    return item.parsedNotes.source;
  }
  // Explicit source on item
  if (item.source) {
    return item.source;
  }
  // Has Urban Manual destination slug = curated
  if (item.destination_slug) {
    return 'curated';
  }
  // Has Google Place ID = google
  if (item.parsedNotes?.googlePlaceId || item.google_place_id) {
    return 'google';
  }
  // Default to manual
  return 'manual';
}

export interface ItineraryCardProps {
  item: ItineraryItem;
  flight?: Flight;
  hotel?: HotelBooking;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * ItineraryCard - Single entry point for rendering any itinerary item
 *
 * This component acts as a router that determines which specialized card
 * component to render based on the item's category.
 *
 * @example
 * {items.map(item => (
 *   <ItineraryCard
 *     key={item.id}
 *     item={item}
 *     flight={flights.find(f => f.id === item.flightId)}
 *     hotel={hotels.find(h => h.id === item.hotelBookingId)}
 *     isSelected={selectedId === item.id}
 *     onSelect={() => setSelectedId(item.id)}
 *     tripSettings={trip}
 *   />
 * ))}
 */
export default function ItineraryCard({
  item,
  flight,
  hotel,
  isSelected,
  onSelect,
  tripSettings,
}: ItineraryCardProps) {
  const baseProps = {
    item,
    isSelected,
    onSelect,
    tripSettings,
  };

  // Determine item source for visual hierarchy
  const source = getItemSource(item);

  switch (item.category) {
    case 'flight':
      return <FlightCard {...baseProps} flight={flight} />;

    case 'restaurant':
    case 'attraction':
    case 'cafe':
    case 'bar':
    case 'shopping':
    case 'culture':
      // Use source-based visual hierarchy for place categories
      if (source === 'curated' && item.destination) {
        return <CuratedPlaceCard {...baseProps} destination={item.destination} />;
      } else if (source === 'google') {
        return <GooglePlaceCard {...baseProps} />;
      }
      // Fallback to existing cards for legacy items without source
      // (they likely came from curated catalog)
      if (item.category === 'restaurant') {
        return <RestaurantCard {...baseProps} />;
      }
      return <AttractionCard {...baseProps} />;

    case 'hotel_activity':
    case 'airport_activity':
      return <MinimalActivityCard {...baseProps} hotel={hotel} />;

    case 'hotel_overnight':
      return <OvernightCard {...baseProps} hotel={hotel} />;

    case 'transport':
      return <TransportCard {...baseProps} />;

    case 'free_time':
      return <FreeTimeGap {...baseProps} />;

    case 'custom':
      return <CustomCard {...baseProps} />;

    default:
      // Fallback for unknown categories - render as custom
      return <CustomCard {...baseProps} />;
  }
}
