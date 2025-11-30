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
  if (type === 'breakfast' || type === 'cafe') return <Coffee className="w-4 h-4" />;
  if (type === 'restaurant') return <Utensils className="w-4 h-4" />;
  if (type === 'bar') return <Martini className="w-4 h-4" />;
  if (type === 'museum' || type === 'gallery') return <Landmark className="w-4 h-4" />;
  if (type === 'flight') return <Plane className="w-4 h-4" />;
  if (type === 'train') return <Train className="w-4 h-4" />;
  if (type === 'activity') return <Camera className="w-4 h-4" />;
  return <MapPin className="w-4 h-4" />;
}

/**
 * TimelineCard - Clean, minimal card following Apple HIG
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
      className={`
        h-full rounded-2xl cursor-pointer
        bg-gray-50/80 dark:bg-gray-800/50
        backdrop-blur-sm
        ${isActive
          ? 'ring-2 ring-gray-900 dark:ring-white'
          : 'ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
        }
      `}
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
      {/* Card content - 12px padding, 8px gap */}
      <div className="flex items-center gap-2 px-3 py-3 h-full">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styleSet.iconColor}`}>
          {getIconForItem(item)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-gray-900 dark:text-white leading-tight truncate">
            {item.title || 'Untitled stop'}
          </p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
            {startLabel}–{endLabel}
            {item.destination?.neighborhood && ` · ${item.destination.neighborhood}`}
          </p>
        </div>

        {/* Duration pill */}
        <span className="flex-shrink-0 text-[13px] text-gray-500 dark:text-gray-400 tabular-nums">
          {formatDuration(duration)}
        </span>

        {/* Edit mode grip */}
        {isEditMode && (
          <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        )}
      </div>

      {/* Resize handles */}
      {isEditMode && onDragStart && (
        <>
          <div
            className="absolute inset-x-0 top-0 h-2 cursor-n-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              onDragStart(item.id, 'resize-start', start, duration, e.clientY);
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              onDragStart(item.id, 'resize-end', start, duration, e.clientY);
            }}
          />
        </>
      )}
    </div>
  );
}

export const TimelineCard = memo(TimelineCardComponent);
