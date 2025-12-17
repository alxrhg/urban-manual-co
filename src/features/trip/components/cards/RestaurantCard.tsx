'use client';

import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import PlaceCard from '@/features/trip/components/PlaceCard';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';

interface RestaurantCardProps {
  item: EnrichedItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * RestaurantCard - Renders restaurant itinerary items
 * Displays reservation time, party size, and booking status
 */
export default function RestaurantCard({
  item,
  isSelected,
  onSelect,
  
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
        ${isSelected ? 'bg-stone-100 dark:bg-gray-800' : 'hover:bg-stone-100/80 dark:hover:bg-gray-800/80'}
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
