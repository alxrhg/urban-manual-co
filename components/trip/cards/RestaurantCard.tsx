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
        cursor-pointer rounded-2xl transition-all duration-200 ease-out
        ${isSelected
          ? 'bg-stone-100 dark:bg-gray-800 shadow-sm'
          : 'hover:bg-stone-100/80 dark:hover:bg-gray-800/80 hover:shadow-sm hover:-translate-y-0.5'}
        active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2
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
