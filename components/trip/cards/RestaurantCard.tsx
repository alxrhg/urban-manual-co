'use client';

import type { ItineraryItem, TripSettings } from './ItineraryCard';
import PlaceCard from '@/components/trips/PlaceCard';
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
    </div>
  );
}
