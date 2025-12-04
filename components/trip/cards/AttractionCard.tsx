'use client';

import type { ItineraryItem, TripSettings } from './ItineraryCard';
import PlaceCard from '@/components/trips/PlaceCard';
import BookingStatus from '@/components/trip/BookingStatus';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';

interface AttractionCardProps {
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * AttractionCard - Renders attraction/activity itinerary items
 * Displays visit time, duration, and crowd indicators
 */
export default function AttractionCard({
  item,
  isSelected,
  onSelect,
  tripSettings,
}: AttractionCardProps) {
  const notes = item.parsedNotes;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-2xl transition-all duration-200
        ${isSelected ? 'ring-2 ring-stone-900 dark:ring-white' : ''}
        hover:ring-1 hover:ring-stone-300 dark:hover:ring-gray-600
      `}
    >
      <div className="relative">
        <PlaceCard
          name={item.title}
          category={notes?.category || 'attraction'}
          neighborhood={notes?.city}
          time={item.time ? formatTimeDisplay(item.time) : undefined}
          duration={notes?.duration}
          rating={notes?.personalRating}
          image={notes?.image}
          notes={notes?.notes}
          compact
        />
        {/* Booking status badge for ticketed attractions */}
        {notes?.bookingStatus && (
          <div className="absolute top-3 right-3">
            <BookingStatus status={notes.bookingStatus} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
