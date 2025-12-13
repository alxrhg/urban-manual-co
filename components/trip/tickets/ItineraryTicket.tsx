'use client';

import { useMemo } from 'react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';
import PlaceTicket from './PlaceTicket';
import BoardingPassCard from './BoardingPassCard';
import HotelTicket from './HotelTicket';
import NightPassCard from './NightPassCard';

interface ItineraryTicketProps {
  item: EnrichedItineraryItem;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  /**
   * When true, renders as the "night pass" footer card
   * for the hotel where the user sleeps
   */
  isNightPass?: boolean;
  /**
   * Night number for overnight stays (1-indexed)
   */
  nightNumber?: number;
  /**
   * Total nights in the trip
   */
  totalNights?: number;
}

/**
 * ItineraryTicket - Polymorphic itinerary card that renders the appropriate
 * ticket variant based on item type
 *
 * Variants:
 * - flight -> BoardingPassCard
 * - hotel (check-in/out) -> HotelTicket
 * - hotel (overnight/night pass) -> NightPassCard
 * - default (place, restaurant, etc.) -> PlaceTicket
 */
export default function ItineraryTicket({
  item,
  isActive,
  onClick,
  className,
  isNightPass = false,
  nightNumber,
  totalNights,
}: ItineraryTicketProps) {
  const itemType = item.parsedNotes?.type;
  const hotelItemType = item.parsedNotes?.hotelItemType;

  // Determine which variant to render
  const variant = useMemo(() => {
    // Night pass takes precedence
    if (isNightPass) return 'night-pass';

    // Flight
    if (itemType === 'flight') return 'flight';

    // Hotel check-in/out
    if (itemType === 'hotel') {
      if (hotelItemType === 'check_in') return 'hotel-check-in';
      if (hotelItemType === 'checkout') return 'hotel-check-out';
      // Default hotel without specific action is overnight
      return 'hotel-overnight';
    }

    // Default to place ticket
    return 'place';
  }, [itemType, hotelItemType, isNightPass]);

  // Render based on variant
  switch (variant) {
    case 'flight':
      return (
        <BoardingPassCard
          from={item.parsedNotes?.from || ''}
          to={item.parsedNotes?.to || ''}
          airline={item.parsedNotes?.airline}
          flightNumber={item.parsedNotes?.flightNumber}
          departureTime={item.parsedNotes?.departureTime}
          arrivalTime={item.parsedNotes?.arrivalTime}
          departureDate={item.parsedNotes?.departureDate}
          terminal={item.parsedNotes?.terminal}
          gate={item.parsedNotes?.gate}
          confirmationNumber={item.parsedNotes?.confirmationNumber}
          seatNumber={item.parsedNotes?.seatNumber}
          isActive={isActive}
          onClick={onClick}
          className={className}
        />
      );

    case 'hotel-check-in':
      return (
        <HotelTicket
          name={item.title || item.parsedNotes?.name || 'Hotel'}
          address={item.parsedNotes?.address}
          action="check-in"
          time={item.parsedNotes?.checkInTime || item.time || undefined}
          date={item.parsedNotes?.checkInDate}
          confirmationNumber={item.parsedNotes?.hotelConfirmation || item.parsedNotes?.confirmationNumber}
          roomType={item.parsedNotes?.roomType}
          phone={item.parsedNotes?.phone}
          website={item.parsedNotes?.website}
          image={item.destination?.image || item.parsedNotes?.image}
          notes={item.parsedNotes?.notes}
          isActive={isActive}
          onClick={onClick}
          className={className}
        />
      );

    case 'hotel-check-out':
      return (
        <HotelTicket
          name={item.title || item.parsedNotes?.name || 'Hotel'}
          address={item.parsedNotes?.address}
          action="check-out"
          time={item.parsedNotes?.checkOutTime || item.time || undefined}
          date={item.parsedNotes?.checkOutDate}
          confirmationNumber={item.parsedNotes?.hotelConfirmation || item.parsedNotes?.confirmationNumber}
          roomType={item.parsedNotes?.roomType}
          phone={item.parsedNotes?.phone}
          website={item.parsedNotes?.website}
          image={item.destination?.image || item.parsedNotes?.image}
          notes={item.parsedNotes?.notes}
          isActive={isActive}
          onClick={onClick}
          className={className}
        />
      );

    case 'hotel-overnight':
    case 'night-pass':
      return (
        <NightPassCard
          name={item.title || item.parsedNotes?.name || 'Hotel'}
          address={item.parsedNotes?.address}
          neighborhood={item.destination?.neighborhood ?? undefined}
          nightNumber={nightNumber}
          totalNights={totalNights}
          rating={item.destination?.rating ?? undefined}
          starRating={item.destination?.michelin_stars ?? undefined}
          image={item.destination?.image || item.parsedNotes?.image}
          hasWifi
          hasBreakfast={item.parsedNotes?.breakfastIncluded}
          hasPool={item.parsedNotes?.amenities?.includes('pool')}
          hasGym={item.parsedNotes?.amenities?.includes('gym')}
          confirmationNumber={item.parsedNotes?.hotelConfirmation || item.parsedNotes?.confirmationNumber}
          isActive={isActive}
          onClick={onClick}
          className={className}
        />
      );

    case 'place':
    default:
      return (
        <PlaceTicket
          name={item.title || 'Place'}
          category={item.parsedNotes?.category || item.destination?.category || undefined}
          neighborhood={item.destination?.neighborhood ?? undefined}
          time={item.time ? formatTimeDisplay(item.time) : undefined}
          duration={item.parsedNotes?.duration}
          rating={item.destination?.rating ?? undefined}
          image={item.destination?.image || item.destination?.image_thumbnail || item.parsedNotes?.image}
          notes={item.parsedNotes?.notes || item.parsedNotes?.raw}
          isActive={isActive}
          onClick={onClick}
          className={className}
        />
      );
  }
}
