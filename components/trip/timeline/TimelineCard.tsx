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
  Lock,
} from 'lucide-react';
import {
  formatDuration,
  formatMinutesToTime,
  formatTimeDisplay,
} from '@/lib/utils/time-calculations';
import { getCategoryStyle, getItemPriority, getPriorityStyle } from './config';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TimelineCardProps {
  item: EnrichedItineraryItem;
  start: number;
  duration: number;
  height: number;
  laneOffset: number;
  isActive?: boolean;
  isEditMode?: boolean;
  /** Override: mark as confirmed/booked (shows as anchor) */
  isConfirmed?: boolean;
  /** Override: mark as highlight of the day */
  isHighlight?: boolean;
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
 * TimelineCard - Clean, minimal card with visual hierarchy
 *
 * Visual hierarchy levels:
 * - Anchor (flights, confirmed bookings): Strong presence, subtle lock icon
 * - Highlight (key restaurants, main attractions): Prominent but flexible
 * - Standard (activities, cafes): Balanced visual weight
 * - Supporting (transit, check-in/out): Receded, background presence
 */
function TimelineCardComponent({
  item,
  start,
  duration,
  isActive = false,
  isEditMode = false,
  isConfirmed,
  isHighlight,
  onEdit,
  onDragStart,
}: TimelineCardProps) {
  const type = item.parsedNotes?.type || item.destination?.category || 'default';
  const styleSet = getCategoryStyle(type);

  // Determine priority and get corresponding visual style
  const priority = getItemPriority(type, { isConfirmed, isHighlight });
  const priorityStyle = getPriorityStyle(priority);

  const startLabel = formatTimeDisplay(formatMinutesToTime(start));
  const endLabel = formatTimeDisplay(formatMinutesToTime(start + duration));

  return (
    <div
      className={`
        h-full rounded-2xl cursor-pointer
        backdrop-blur-sm transition-all duration-150
        ${priorityStyle.cardBg}
        ${isActive
          ? 'ring-2 ring-gray-900 dark:ring-white'
          : priorityStyle.border
        }
      `}
      onClick={() => onEdit?.(item)}
      role="button"
      tabIndex={0}
      aria-label={`${item.title || 'Untitled stop'}, ${startLabel} to ${endLabel}, ${formatDuration(duration)}${priority === 'anchor' ? ', fixed time' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit?.(item);
        }
      }}
    >
      {/* Card content - 12px padding, 8px gap */}
      <div className="flex items-center gap-2 px-3 py-3 h-full">
        {/* Icon with priority-aware sizing */}
        <div className={`flex-shrink-0 ${styleSet.iconColor} ${priority === 'supporting' ? 'opacity-60' : ''}`}>
          {getIconForItem(item)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-[15px] ${priorityStyle.titleWeight} text-gray-900 dark:text-white leading-tight truncate`}>
              {item.title || 'Untitled stop'}
            </p>
            {/* Subtle anchor indicator for fixed items */}
            {priorityStyle.showAnchorBadge && (
              <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" aria-label="Fixed time" />
            )}
          </div>
          <p className={`text-[13px] text-gray-500 dark:text-gray-400 truncate ${priorityStyle.subtextOpacity}`}>
            {startLabel}–{endLabel}
            {item.destination?.neighborhood && ` · ${item.destination.neighborhood}`}
          </p>
        </div>

        {/* Duration pill - more subtle for supporting items */}
        <span className={`flex-shrink-0 text-[13px] text-gray-500 dark:text-gray-400 tabular-nums ${priorityStyle.subtextOpacity}`}>
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
