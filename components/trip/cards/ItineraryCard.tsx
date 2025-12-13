'use client';

import type { ItineraryItem as BaseItineraryItem, ItineraryItemNotes } from '@/types/trip';

// Extended ItineraryItem with category for card rendering
export interface ItineraryItem extends BaseItineraryItem {
  category:
    | 'flight'
    | 'restaurant'
    | 'attraction'
    | 'hotel_activity'
    | 'airport_activity'
    | 'hotel_overnight'
    | 'transport'
    | 'free_time'
    | 'custom';
  flightId?: string;
  hotelBookingId?: string;
  parsedNotes?: ItineraryItemNotes | null;
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
  // Amenities
  breakfastIncluded?: boolean;
  hasPool?: boolean;
  hasGym?: boolean;
  hasSpa?: boolean;
  hasLounge?: boolean;
  parkingIncluded?: boolean;
  wifiIncluded?: boolean;
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
import HotelCheckInCard from './HotelCheckInCard';
import HotelCheckoutCard from './HotelCheckoutCard';

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

  // Check for hotel activity subtypes (check_in, checkout)
  const hotelItemType = item.parsedNotes?.hotelItemType;

  switch (item.category) {
    case 'flight':
      return <FlightCard {...baseProps} flight={flight} />;

    case 'restaurant':
      return <RestaurantCard {...baseProps} />;

    case 'attraction':
      return <AttractionCard {...baseProps} />;

    case 'hotel_activity':
      // Route check-in and checkout to dedicated cards
      if (hotelItemType === 'check_in') {
        return <HotelCheckInCard {...baseProps} hotel={hotel} />;
      }
      if (hotelItemType === 'checkout') {
        return <HotelCheckoutCard {...baseProps} hotel={hotel} />;
      }
      // Other hotel activities (breakfast, pool, gym, lounge, etc.)
      return <MinimalActivityCard {...baseProps} hotel={hotel} />;

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
