'use client';

import { useState } from 'react';
import { Plus, Sparkles, Clock, Coffee } from 'lucide-react';
import type { ItineraryItem, TripSettings } from './ItineraryCard';
import { formatDuration } from '@/lib/utils/time-calculations';
import { formatGapDuration, getTimeOfDayEmoji } from '@/lib/trip/timeline-builder';

// Props for the original card-based FreeTimeGap (used by ItineraryCard)
interface FreeTimeGapCardProps {
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

// Props for the new timeline-based FreeTimeGap (used by DayTimeline)
interface FreeTimeGapTimelineProps {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  day: number;
  afterItemId: string;
  onAddClick: () => void;
  onAISuggestClick?: () => void;
}

// Union type for component props
type FreeTimeGapProps = FreeTimeGapCardProps | FreeTimeGapTimelineProps;

// Type guard to check if props are for timeline mode
function isTimelineProps(props: FreeTimeGapProps): props is FreeTimeGapTimelineProps {
  return 'durationMinutes' in props && 'onAddClick' in props;
}

// Threshold for "large gap" mode (3 hours)
const LARGE_GAP_THRESHOLD_MINUTES = 180;

/**
 * Format time string for display (12-hour format)
 */
function formatTimeDisplay(time: string): string {
  if (!time) return '';
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;

  const hours = parseInt(match[1], 10);
  const minutes = match[2];

  if (hours === 0) return `12:${minutes} AM`;
  if (hours < 12) return `${hours}:${minutes} AM`;
  if (hours === 12) return `12:${minutes} PM`;
  return `${hours - 12}:${minutes} PM`;
}

/**
 * FreeTimeGap - Renders free time blocks in the itinerary
 *
 * Two modes:
 * 1. Card mode: Used by ItineraryCard for rendering as a card in the itinerary
 * 2. Timeline mode: Used by DayTimeline for showing gaps between items
 *
 * Timeline mode has two sub-modes based on duration:
 * - Small gap (<3 hours): Always compact
 * - Large gap (>=3 hours): Expandable on hover
 */
export default function FreeTimeGap(props: FreeTimeGapProps) {
  // Timeline mode
  if (isTimelineProps(props)) {
    return <FreeTimeGapTimeline {...props} />;
  }

  // Card mode (original implementation)
  return <FreeTimeGapCard {...props} />;
}

/**
 * Timeline-based FreeTimeGap for showing gaps in the day timeline
 */
function FreeTimeGapTimeline({
  startTime,
  endTime,
  durationMinutes,
  day: _day,
  afterItemId: _afterItemId,
  onAddClick,
  onAISuggestClick,
}: FreeTimeGapTimelineProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isLargeGap = durationMinutes >= LARGE_GAP_THRESHOLD_MINUTES;
  const emoji = getTimeOfDayEmoji(startTime);
  const formattedDuration = formatGapDuration(durationMinutes);

  // Large gap - expandable on hover
  if (isLargeGap) {
    return (
      <div
        className="relative my-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Compact state (resting) */}
        <div
          className={`
            transition-all duration-200 ease-out
            ${isHovered ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}
          `}
        >
          <div className="flex items-center justify-center h-8 gap-2">
            {/* Left dashed line */}
            <div className="flex-1 h-px border-t border-dashed border-gray-300 dark:border-gray-600" />

            {/* Duration label */}
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {formattedDuration} free
            </span>

            {/* Right dashed line */}
            <div className="flex-1 h-px border-t border-dashed border-gray-300 dark:border-gray-600" />

            {/* Add button (visible on hover of compact) */}
            <button
              onClick={onAddClick}
              className={`
                flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                bg-gray-100 dark:bg-gray-800
                text-gray-600 dark:text-gray-400
                hover:bg-gray-200 dark:hover:bg-gray-700
                transition-opacity duration-150
                opacity-0 group-hover:opacity-100
              `}
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>

        {/* Expanded state (hover) */}
        <div
          className={`
            transition-all duration-200 ease-out
            ${isHovered ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}
          `}
        >
          <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{emoji}</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  FREE TIME
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  {formattedDuration}
                </span>
              </div>
            </div>

            {/* Time range */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {formatTimeDisplay(startTime)} – {formatTimeDisplay(endTime)}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onAddClick}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  bg-gray-900 dark:bg-white
                  text-white dark:text-gray-900
                  hover:bg-gray-800 dark:hover:bg-gray-100
                  transition-colors
                "
              >
                <Plus className="w-3 h-3" />
                Add activity
              </button>

              {onAISuggestClick && (
                <button
                  onClick={onAISuggestClick}
                  className="
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    bg-gray-100 dark:bg-gray-700
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-200 dark:hover:bg-gray-600
                    transition-colors
                  "
                >
                  <Sparkles className="w-3 h-3" />
                  AI suggestions
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Small gap - always compact
  return (
    <div
      className="relative my-2 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-center h-8 gap-2">
        {/* Left dashed line */}
        <div className="flex-1 h-px border-t border-dashed border-gray-300 dark:border-gray-600" />

        {/* Duration label */}
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {formattedDuration} free
        </span>

        {/* Right dashed line */}
        <div className="flex-1 h-px border-t border-dashed border-gray-300 dark:border-gray-600" />

        {/* Add button (visible on hover) */}
        <button
          onClick={onAddClick}
          className={`
            flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
            bg-gray-100 dark:bg-gray-800
            text-gray-600 dark:text-gray-400
            hover:bg-gray-200 dark:hover:bg-gray-700
            transition-opacity duration-150
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
    </div>
  );
}

/**
 * Card-based FreeTimeGap for use in ItineraryCard
 * This is the original implementation for backward compatibility
 */
function FreeTimeGapCard({
  item,
  isSelected,
  onSelect,
  tripSettings: _tripSettings,
}: FreeTimeGapCardProps) {
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
