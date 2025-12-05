'use client';

import { Clock, MapPin } from 'lucide-react';
import type { ItineraryItem, HotelBooking, TripSettings } from './ItineraryCard';
import { formatDuration } from '@/lib/utils/time-calculations';

interface MinimalActivityCardProps {
  item: ItineraryItem;
  hotel?: HotelBooking;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * MinimalActivityCard - Compact card for hotel and airport activities
 * Used for: hotel_activity, airport_activity categories
 * Shows minimal info: title, duration, location hint
 */
export default function MinimalActivityCard({
  item,
  hotel,
  isSelected,
  onSelect,
  tripSettings,
}: MinimalActivityCardProps) {
  const notes = item.parsedNotes;
  const isHotelActivity = item.category === 'hotel_activity';
  const location = notes?.location || (isHotelActivity ? hotel?.name : 'Airport');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-xl transition-all duration-200
        bg-stone-100/60 dark:bg-gray-800/60 border border-stone-200 dark:border-gray-700
        ${isSelected ? 'border-stone-400 dark:border-gray-500 bg-stone-200/80 dark:bg-gray-700/80' : 'hover:bg-stone-200/60 dark:hover:bg-gray-700/60'}
      `}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Time indicator */}
        <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <Clock className="w-4 h-4 text-stone-400 dark:text-gray-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-stone-700 dark:text-gray-300 truncate">
            {item.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            {notes?.duration && (
              <span className="text-xs text-stone-500 dark:text-gray-400">
                {formatDuration(notes.duration)}
              </span>
            )}
            {location && (
              <span className="text-xs text-stone-400 dark:text-gray-500 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                {location}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
