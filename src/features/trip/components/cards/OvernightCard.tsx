'use client';

import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { HotelBooking } from '@/types/trip';
import LodgingCard from '@/features/trip/components/LodgingCard';

interface OvernightCardProps {
  item: EnrichedItineraryItem;
  hotel?: HotelBooking;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * OvernightCard - Renders hotel overnight stays
 * Shows the hotel/lodging with check-in/check-out details
 */
export default function OvernightCard({
  item,
  hotel,
  isSelected,
  onSelect,
  
}: OvernightCardProps) {
  const notes = item.parsedNotes;

  // Use hotel booking data if available, otherwise fall back to parsed notes
  const hotelName = hotel?.name || item.title || notes?.name || 'Accommodation';
  const hotelAddress = hotel?.address || notes?.address;
  const hotelCheckIn = hotel?.checkInDate || hotel?.checkInTime || notes?.checkInDate || notes?.checkInTime;
  const hotelCheckOut = hotel?.checkOutDate || hotel?.checkOutTime || notes?.checkOutDate || notes?.checkOutTime;
  const hotelConfirmation = hotel?.confirmationNumber || notes?.hotelConfirmation;
  const hotelPhone = hotel?.phone || notes?.phone;
  const hotelWebsite = hotel?.website || notes?.website;
  const hotelImage = hotel?.imageUrl || notes?.image;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-2xl transition-all duration-200
        ${isSelected ? 'bg-stone-100 dark:bg-gray-800' : 'hover:bg-stone-100/80 dark:hover:bg-gray-800/80'}
      `}
    >
      <LodgingCard
        name={hotelName}
        address={hotelAddress}
        checkIn={hotelCheckIn}
        checkOut={hotelCheckOut}
        confirmationNumber={hotelConfirmation}
        phone={hotelPhone}
        website={hotelWebsite}
        image={hotelImage}
        notes={notes?.notes}
        compact
      />
    </div>
  );
}
