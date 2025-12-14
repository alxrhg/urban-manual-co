'use client';

import type { ItineraryItem, TripSettings } from './ItineraryCard';
import PlaceCard from '@/components/trips/PlaceCard';
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
        ${isSelected ? 'bg-stone-100 dark:bg-gray-800' : 'hover:bg-stone-100/80 dark:hover:bg-gray-800/80'}
      `}
    >
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
    </div>
  );
}
