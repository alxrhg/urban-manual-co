'use client';

import { memo } from 'react';
import {
  MapPin,
  Coffee,
  Utensils,
  Martini,
  Landmark,
  Train,
  Camera,
  Plane,
  GripVertical,
} from 'lucide-react';
import {
  formatDuration,
  formatMinutesToTime,
  formatTimeDisplay,
} from '@/lib/utils/time-calculations';
import { getCategoryStyle } from './config';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TimelineCardProps {
  item: EnrichedItineraryItem;
  start: number;
  duration: number;
  height: number;
  laneOffset: number;
  isActive?: boolean;
  isEditMode?: boolean;
  onEdit?: (item: EnrichedItineraryItem) => void;
  onDragStart?: (
    itemId: string,
    mode: 'move' | 'resize-start' | 'resize-end',
    start: number,
    duration: number,
    clientY: number
  ) => void;
}

function getIconForItem(item: EnrichedItineraryItem) {
  const type = item.parsedNotes?.type || item.destination?.category;
  if (type === 'breakfast' || type === 'cafe') return <Coffee className="w-3.5 h-3.5" />;
  if (type === 'restaurant') return <Utensils className="w-3.5 h-3.5" />;
  if (type === 'bar') return <Martini className="w-3.5 h-3.5" />;
  if (type === 'museum' || type === 'gallery') return <Landmark className="w-3.5 h-3.5" />;
  if (type === 'flight') return <Plane className="w-3.5 h-3.5" />;
  if (type === 'train') return <Train className="w-3.5 h-3.5" />;
  if (type === 'activity') return <Camera className="w-3.5 h-3.5" />;
  return <MapPin className="w-3.5 h-3.5" />;
}

/**
 * TimelineCard - Flat inline card for planner-style timeline
 */
function TimelineCardComponent({
  item,
  start,
  duration,
  isActive = false,
  isEditMode = false,
  onEdit,
  onDragStart,
}: TimelineCardProps) {
  const type = item.parsedNotes?.type || item.destination?.category || 'default';
  const styleSet = getCategoryStyle(type);
  const startLabel = formatTimeDisplay(formatMinutesToTime(start));
  const endLabel = formatTimeDisplay(formatMinutesToTime(start + duration));

  return (
    <div
      className={`h-full flex items-stretch rounded-lg bg-gray-50 dark:bg-gray-800/40 cursor-pointer ${
        isActive ? 'ring-1 ring-gray-900 dark:ring-white' : ''
      }`}
      onClick={() => onEdit?.(item)}
      role="button"
      tabIndex={0}
      aria-label={`${item.title || 'Untitled stop'}, ${startLabel} to ${endLabel}, ${formatDuration(duration)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit?.(item);
        }
      }}
    >
      {/* Left accent bar */}
      <div className={`w-1 flex-shrink-0 rounded-l-lg ${styleSet.accent}`} />

      {/* Card content */}
      <div className="flex-1 flex items-center gap-2.5 pl-3 pr-2 py-2 min-w-0">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styleSet.iconColor}`}>
          {getIconForItem(item)}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight truncate">
            {item.title || 'Untitled stop'}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {startLabel}–{endLabel}
            </span>
            {item.destination?.neighborhood && (
              <>
                <span className="text-gray-300 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {item.destination.neighborhood}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Duration */}
        <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {formatDuration(duration)}
        </span>

        {/* Edit mode indicator */}
        {isEditMode && (
          <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        )}
      </div>

      {/* Resize handles in edit mode */}
      {isEditMode && onDragStart && (
        <>
          <div
            className="absolute inset-x-0 top-0 h-2 cursor-n-resize"
            onPointerDown={(event) => {
              event.stopPropagation();
              onDragStart(item.id, 'resize-start', start, duration, event.clientY);
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize"
            onPointerDown={(event) => {
              event.stopPropagation();
              onDragStart(item.id, 'resize-end', start, duration, event.clientY);
            }}
          />
        </>
      )}
    </div>
  );
}

export const TimelineCard = memo(TimelineCardComponent);
