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
 * TimelineCard - Individual card on the timeline
 */
function TimelineCardComponent({
  item,
  start,
  duration,
  height,
  laneOffset,
  isActive = false,
  isEditMode = false,
  onEdit,
  onDragStart,
}: TimelineCardProps) {
  const type = item.parsedNotes?.type || item.destination?.category || 'default';
  const styleSet = getCategoryStyle(type);
  const startLabel = formatTimeDisplay(formatMinutesToTime(start));
  const endLabel = formatTimeDisplay(formatMinutesToTime(start + duration));
  const showExpandedContent = height > 70;

  return (
    <div
      className={`h-full border ${styleSet.border} ${styleSet.bg} ${styleSet.text} rounded-xl relative overflow-hidden transition-all duration-150 shadow-sm hover:shadow hover:scale-[1.01] ${
        isActive ? 'ring-2 ring-gray-300 dark:ring-gray-600 shadow-md' : ''
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
      {/* Edit mode drag handle */}
      {isEditMode && (
        <div className="absolute inset-x-4 top-2 flex items-center justify-between text-[10px] text-gray-400">
          <span className="flex items-center gap-1 uppercase tracking-wide font-medium">
            <GripVertical className="w-3 h-3" />
            Drag
          </span>
          <span className="tabular-nums">{formatTimeDisplay(formatMinutesToTime(duration))}</span>
        </div>
      )}

      {/* Card content */}
      <div className="flex items-start gap-3 px-3 py-2.5 relative z-10">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${styleSet.iconBg} ${styleSet.iconColor}`}
        >
          {getIconForItem(item)}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-medium leading-tight text-gray-900 dark:text-white line-clamp-1">
            {item.title || 'Untitled stop'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
              {startLabel} – {endLabel}
            </span>
            {item.destination?.neighborhood && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                  {item.destination.neighborhood}
                </span>
              </>
            )}
          </div>
          {/* Expanded content when card is tall enough */}
          {showExpandedContent && item.parsedNotes?.notes && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
              {item.parsedNotes.notes}
            </p>
          )}
        </div>
        {/* Duration badge */}
        <div className="flex-shrink-0 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Resize handles in edit mode */}
      {isEditMode && onDragStart && (
        <>
          <div
            className="absolute inset-x-4 top-0 h-2 cursor-n-resize"
            onPointerDown={(event) => {
              event.stopPropagation();
              onDragStart(item.id, 'resize-start', start, duration, event.clientY);
            }}
          />
          <div
            className="absolute inset-x-4 bottom-0 h-2 cursor-s-resize"
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
