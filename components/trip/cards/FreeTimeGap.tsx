'use client';

import { Plus, Sparkles, Sun } from 'lucide-react';
import { formatDuration, formatTimeDisplay } from '@/lib/utils/time-calculations';
import type { ScheduleGap } from '@/types/trip';

interface FreeTimeGapProps {
  gap: ScheduleGap;
  onAddActivity: (time: string) => void;
  onAiSuggest: () => void;
}

/**
 * FreeTimeGap - Displays unscheduled free time between itinerary items
 *
 * Two display modes:
 * - Compact (≤3h): Inline dashed line with duration and add button
 * - Expanded (>3h): Dashed border box with full details and AI suggest
 */
export default function FreeTimeGap({
  gap,
  onAddActivity,
  onAiSuggest,
}: FreeTimeGapProps) {
  const isLargeGap = gap.durationMinutes > 180; // > 3 hours

  if (isLargeGap) {
    return (
      <div className="my-3">
        <div
          className="
            relative
            border-2 border-dashed border-gray-200 dark:border-gray-700
            rounded-xl
            px-5 py-4
            bg-gray-50/50 dark:bg-gray-800/30
          "
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                FREE TIME
              </span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDuration(gap.durationMinutes)}
              </span>
            </div>
          </div>

          {/* Time range */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {formatTimeDisplay(gap.startTime)} – {formatTimeDisplay(gap.endTime)}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddActivity(gap.startTime)}
              className="
                inline-flex items-center gap-1.5
                px-3 py-1.5
                text-xs font-medium
                text-gray-600 dark:text-gray-300
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-full
                hover:bg-gray-50 dark:hover:bg-gray-700
                hover:border-gray-300 dark:hover:border-gray-600
                transition-colors
              "
            >
              <Plus className="w-3.5 h-3.5" />
              Add activity
            </button>
            <button
              onClick={onAiSuggest}
              className="
                inline-flex items-center gap-1.5
                px-3 py-1.5
                text-xs font-medium
                text-gray-600 dark:text-gray-300
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-full
                hover:bg-gray-50 dark:hover:bg-gray-700
                hover:border-gray-300 dark:hover:border-gray-600
                transition-colors
              "
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI suggest
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compact display for smaller gaps (≤3h)
  return (
    <div className="my-2 flex items-center gap-3">
      {/* Left dashed line */}
      <div className="flex-1 border-t-2 border-dashed border-gray-200 dark:border-gray-700" />

      {/* Duration label */}
      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {formatDuration(gap.durationMinutes)} free
      </span>

      {/* Right dashed line */}
      <div className="flex-1 border-t-2 border-dashed border-gray-200 dark:border-gray-700" />

      {/* Add button */}
      <button
        onClick={() => onAddActivity(gap.startTime)}
        className="
          flex-shrink-0
          inline-flex items-center gap-1
          px-2.5 py-1
          text-xs font-medium
          text-gray-500 dark:text-gray-400
          bg-gray-100 dark:bg-gray-800
          rounded-full
          hover:bg-gray-200 dark:hover:bg-gray-700
          hover:text-gray-700 dark:hover:text-gray-300
          transition-colors
        "
      >
        <Plus className="w-3 h-3" />
        Add
      </button>

      {/* Right dashed line continuation */}
      <div className="flex-1 border-t-2 border-dashed border-gray-200 dark:border-gray-700" />
    </div>
  );
}
