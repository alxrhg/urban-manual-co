'use client';

import { Users } from 'lucide-react';
import type { ItineraryItem, TripSettings } from './ItineraryCard';
import PlaceCard from '@/components/trips/PlaceCard';
import BookingStatus from '@/components/trip/BookingStatus';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';

interface RestaurantCardProps {
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * RestaurantCard - Renders restaurant itinerary items
 * Displays reservation time, party size, and booking status
 */
export default function RestaurantCard({
  item,
  isSelected,
  onSelect,
  tripSettings,
}: RestaurantCardProps) {
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
          category="restaurant"
          neighborhood={notes?.city}
          time={item.time ? formatTimeDisplay(item.time) : undefined}
          duration={notes?.duration}
          rating={notes?.personalRating}
          image={notes?.image}
          notes={notes?.notes}
          compact
        />
        {/* Overlay badges for booking status and party size */}
        {(notes?.bookingStatus || notes?.partySize) && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {notes?.partySize && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-stone-100 dark:bg-gray-700 text-stone-600 dark:text-gray-300 border border-stone-200 dark:border-gray-600">
                <Users className="w-3 h-3" />
                {notes.partySize}
              </span>
            )}
            <BookingStatus status={notes?.bookingStatus} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
