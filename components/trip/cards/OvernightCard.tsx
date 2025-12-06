'use client';

import type { ItineraryItem, HotelBooking, TripSettings } from './ItineraryCard';
import LodgingCard from '@/components/trips/LodgingCard';

interface OvernightCardProps {
  item: ItineraryItem;
  hotel?: HotelBooking;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
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
  tripSettings,
}: OvernightCardProps) {
  const notes = item.parsedNotes;

  // Use hotel booking data if available, otherwise fall back to parsed notes
  const hotelData = hotel || {
    name: item.title || notes?.name || 'Accommodation',
    address: notes?.address,
    checkInDate: notes?.checkInDate,
    checkInTime: notes?.checkInTime,
    checkOutDate: notes?.checkOutDate,
    checkOutTime: notes?.checkOutTime,
    confirmationNumber: notes?.hotelConfirmation,
    phone: notes?.phone,
    website: notes?.website,
    image: notes?.image,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-2xl transition-all duration-200 ease-out
        ${isSelected
          ? 'bg-stone-100 dark:bg-gray-800 shadow-sm'
          : 'hover:bg-stone-100/80 dark:hover:bg-gray-800/80 hover:shadow-sm hover:-translate-y-0.5'}
        active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2
      `}
    >
      <LodgingCard
        name={hotelData.name}
        address={hotelData.address}
        checkIn={hotelData.checkInDate || hotelData.checkInTime}
        checkOut={hotelData.checkOutDate || hotelData.checkOutTime}
        confirmationNumber={hotelData.confirmationNumber}
        phone={hotelData.phone}
        website={hotelData.website}
        image={hotelData.image}
        notes={notes?.notes}
        compact
      />
    </div>
  );
}
