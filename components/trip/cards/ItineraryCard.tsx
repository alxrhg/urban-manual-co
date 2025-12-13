'use client';

import type { ItineraryItem as BaseItineraryItem, ItineraryItemNotes, ItemRole } from '@/types/trip';
import { inferItemRole } from '@/types/trip';
import { getRoleBorderClass, ItemRoleBadge, RoleIndicatorDot } from './ItemRoleBadge';

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

/**
 * Get the effective role for an itinerary item
 */
export function getItemRole(item: ItineraryItem): ItemRole {
  // Check for explicit role in parsed notes first
  if (item.parsedNotes?.role) {
    return item.parsedNotes.role;
  }
  // Infer from type and category
  const itemType = item.parsedNotes?.type || item.category;
  return inferItemRole(itemType, item.parsedNotes);
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

// Import card components (to be created)
import FlightCard from './FlightCard';
import RestaurantCard from './RestaurantCard';
import AttractionCard from './AttractionCard';
import MinimalActivityCard from './MinimalActivityCard';
import OvernightCard from './OvernightCard';
import TransportCard from './TransportCard';
import FreeTimeGap from './FreeTimeGap';
import CustomCard from './CustomCard';

export interface ItineraryCardProps {
  item: ItineraryItem;
  flight?: Flight;
  hotel?: HotelBooking;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
  /** Whether to show the role badge on the card */
  showRoleBadge?: boolean;
  /** Whether to show the role border indicator on the left side */
  showRoleBorder?: boolean;
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
  showRoleBadge = false,
  showRoleBorder = true,
}: ItineraryCardProps) {
  const role = getItemRole(item);
  const roleBorderClass = showRoleBorder ? getRoleBorderClass(role) : '';

  const baseProps = {
    item,
    isSelected,
    onSelect,
    tripSettings,
    role,
    showRoleBadge,
  };

  // Wrap the card with role-based border styling
  const wrapWithRoleBorder = (card: React.ReactNode) => {
    if (!showRoleBorder) return card;

    return (
      <div className={`relative ${roleBorderClass} rounded-lg overflow-hidden`}>
        {card}
      </div>
    );
  };

  switch (item.category) {
    case 'flight':
      return wrapWithRoleBorder(<FlightCard {...baseProps} flight={flight} />);

    case 'restaurant':
      return wrapWithRoleBorder(<RestaurantCard {...baseProps} />);

    case 'attraction':
      return wrapWithRoleBorder(<AttractionCard {...baseProps} />);

    case 'hotel_activity':
    case 'airport_activity':
      return wrapWithRoleBorder(<MinimalActivityCard {...baseProps} hotel={hotel} />);

    case 'hotel_overnight':
      return wrapWithRoleBorder(<OvernightCard {...baseProps} hotel={hotel} />);

    case 'transport':
      return wrapWithRoleBorder(<TransportCard {...baseProps} />);

    case 'free_time':
      return wrapWithRoleBorder(<FreeTimeGap {...baseProps} />);

    case 'custom':
      return wrapWithRoleBorder(<CustomCard {...baseProps} />);

    default:
      // Fallback for unknown categories - render as custom
      return wrapWithRoleBorder(<CustomCard {...baseProps} />);
  }
}

// Re-export role utilities for use by parent components
export { ItemRoleBadge, RoleIndicatorDot, getRoleBorderClass } from './ItemRoleBadge';
