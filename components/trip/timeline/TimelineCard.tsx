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
  const locationLabel =
    item.parsedNotes?.address ||
    item.destination?.formatted_address ||
    item.destination?.neighborhood ||
    item.destination?.city;

  return (
    <div className="relative h-full" aria-live="polite">
      <div
        className={`
          absolute left-3 top-3 bottom-3 w-[3px] rounded-full ${styleSet.accent}
          ${isActive ? 'shadow-[0_0_0_4px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]' : ''}
        `}
      />

      <div
        className={`
          relative h-full rounded-2xl cursor-pointer overflow-hidden
          bg-white/90 dark:bg-gray-900/70
          backdrop-blur-sm border
          ${isActive
            ? 'border-gray-900/40 dark:border-white/40 shadow-lg shadow-gray-200/60 dark:shadow-black/30'
            : 'border-black/[0.04] dark:border-white/[0.08] shadow-sm shadow-black/5 dark:shadow-black/30'
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
        {/* Accent gradient shimmer */}
        <div
          className={`absolute inset-0 pointer-events-none opacity-70 ${styleSet.accent}`}
          style={{
            backgroundImage:
              'linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0) 75%)',
            mixBlendMode: 'soft-light',
          }}
        />

        {/* Card content - padded layout */}
        <div className="relative flex items-start gap-3 px-4 py-3 h-full">
          {/* Icon */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-center ${styleSet.iconColor}`}
          >
            {getIconForItem(item)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight truncate">
                  {item.title || 'Untitled stop'}
                </p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                  {startLabel} – {endLabel}
                  {locationLabel ? ` · ${locationLabel}` : ''}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-gray-600 dark:text-gray-200">
                <span className={`h-2 w-2 rounded-full ${styleSet.accent}`} aria-hidden />
                {formatDuration(duration)}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${styleSet.accent} text-gray-900 dark:text-gray-950 font-medium shadow-sm shadow-black/5`}>
                {type === 'default' ? 'Activity' : type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
              {item.destination?.neighborhood && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <MapPin className="w-3 h-3" />
                  {item.destination.neighborhood}
                </span>
              )}
              {item.parsedNotes?.type === 'flight' && item.parsedNotes.airline && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                  <Plane className="w-3 h-3" />
                  {item.parsedNotes.airline}
                </span>
              )}
            </div>
          </div>

          {/* Edit mode grip */}
          {isEditMode && (
            <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
          )}
        </div>

        {/* Time anchors */}
        <div className="absolute -left-16 top-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums">
          {startLabel}
        </div>
        <div className="absolute -left-16 bottom-3 text-[11px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
          {endLabel}
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
    </div>
  );
}

export const TimelineCard = memo(TimelineCardComponent);
