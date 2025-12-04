'use client';

import { Clock, Coffee } from 'lucide-react';
import type { ItineraryItem, TripSettings } from './ItineraryCard';
import { formatDuration } from '@/lib/utils/time-calculations';

interface FreeTimeGapProps {
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * FreeTimeGap - Renders free time blocks in the itinerary
 * Shown as a subtle, minimal card to indicate unscheduled time
 */
export default function FreeTimeGap({
  item,
  isSelected,
  onSelect,
  tripSettings,
}: FreeTimeGapProps) {
  const notes = item.parsedNotes;
  const duration = notes?.duration;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-xl transition-all duration-200
        border border-dashed border-stone-200 dark:border-gray-700
        bg-stone-50/50 dark:bg-gray-800/20
        ${isSelected ? 'ring-2 ring-stone-900 dark:ring-white border-solid' : ''}
        hover:border-stone-300 dark:hover:border-gray-600
        hover:bg-stone-100/50 dark:hover:bg-gray-800/40
      `}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
          <Coffee className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-stone-600 dark:text-gray-400">
            {item.title || 'Free Time'}
          </h4>
          {duration && (
            <span className="text-xs text-stone-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {formatDuration(duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
