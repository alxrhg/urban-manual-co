'use client';

import { FileText, Clock, MapPin } from 'lucide-react';
import type { ItineraryItem, TripSettings } from './ItineraryCard';
import { formatTimeDisplay, formatDuration } from '@/lib/utils/time-calculations';

interface CustomCardProps {
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * CustomCard - Renders custom/generic itinerary items
 * Used for user-created items that don't fit other categories
 */
export default function CustomCard({
  item,
  isSelected,
  onSelect,
  tripSettings,
}: CustomCardProps) {
  const notes = item.parsedNotes;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-2xl transition-all duration-200
        bg-stone-100 dark:bg-gray-800/50
        ${isSelected ? 'bg-stone-200 dark:bg-gray-700' : 'hover:bg-stone-200/60 dark:hover:bg-gray-700/60'}
      `}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-stone-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-stone-500 dark:text-gray-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-stone-900 dark:text-white leading-tight">
            {item.title}
          </h3>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1">
            {item.time && (
              <span className="text-xs text-stone-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeDisplay(item.time)}
              </span>
            )}
            {notes?.duration && (
              <>
                {item.time && <span className="text-stone-300 dark:text-gray-600">·</span>}
                <span className="text-xs text-stone-500 dark:text-gray-400">
                  {formatDuration(notes.duration)}
                </span>
              </>
            )}
            {notes?.city && (
              <>
                {(item.time || notes?.duration) && (
                  <span className="text-stone-300 dark:text-gray-600">·</span>
                )}
                <span className="text-xs text-stone-500 dark:text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {notes.city}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-2 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Notes */}
          {notes?.notes && !item.description && (
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-2 line-clamp-2">
              {notes.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
