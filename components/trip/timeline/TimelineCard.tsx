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
import { getCategoryStyle, getStripePattern } from './config';
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
 * TimelineCard - Square UI inspired card with stripe accent
 * Features: Category-based coloring, stripe pattern, shadow effects
 */
function TimelineCardComponent({
  item,
  start,
  duration,
  height,
  isActive = false,
  isEditMode = false,
  onEdit,
  onDragStart,
}: TimelineCardProps) {
  const type = item.parsedNotes?.type || item.destination?.category || 'default';
  const styleSet = getCategoryStyle(type);
  const startLabel = formatTimeDisplay(formatMinutesToTime(start));
  const endLabel = formatTimeDisplay(formatMinutesToTime(start + duration));
  const stripePattern = getStripePattern(styleSet.stripeColor);

  // Show stripe only if card is tall enough
  const showStripe = height >= 60;

  return (
    <div
      className={`
        group relative h-full rounded-xl cursor-pointer overflow-hidden
        ${styleSet.bgColor}
        border ${styleSet.borderColor}
        shadow-sm hover:shadow-md
        transition-all duration-200 ease-out
        ${isActive
          ? 'ring-2 ring-gray-900 dark:ring-white shadow-lg'
          : 'hover:scale-[1.01]'
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
      {/* Card content */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 h-full">
        {/* Category indicator dot */}
        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${styleSet.accent}`} />

        {/* Icon */}
        <div className={`flex-shrink-0 ${styleSet.iconColor}`}>
          {getIconForItem(item)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 dark:text-white leading-tight truncate">
            {item.title || 'Untitled stop'}
          </p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {startLabel}–{endLabel}
            {item.destination?.neighborhood && (
              <span className="text-gray-400 dark:text-gray-500"> · {item.destination.neighborhood}</span>
            )}
          </p>
        </div>

        {/* Duration pill - Square UI style */}
        <span className="flex-shrink-0 text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full">
          {formatDuration(duration)}
        </span>

        {/* Edit mode grip */}
        {isEditMode && (
          <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Square UI stripe pattern at bottom */}
      {showStripe && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-xl"
          style={{ background: stripePattern }}
        />
      )}

      {/* Resize handles */}
      {isEditMode && onDragStart && (
        <>
          <div
            className="absolute inset-x-0 top-0 h-2 cursor-n-resize opacity-0 hover:opacity-100 bg-gradient-to-b from-black/5 to-transparent"
            onPointerDown={(e) => {
              e.stopPropagation();
              onDragStart(item.id, 'resize-start', start, duration, e.clientY);
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-2 cursor-s-resize opacity-0 hover:opacity-100 bg-gradient-to-t from-black/5 to-transparent"
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
