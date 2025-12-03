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
  ArrowRight,
  Clock,
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
 * FlightTimelineCard - Specialized card for flights with airport codes
 */
function FlightTimelineCard({
  item,
  start,
  duration,
  isActive,
  isEditMode,
  onEdit,
}: Omit<TimelineCardProps, 'height' | 'laneOffset' | 'onDragStart'>) {
  const notes = item.parsedNotes;
  const from = notes?.from || '---';
  const to = notes?.to || '---';
  const airline = notes?.airline;
  const flightNumber = notes?.flightNumber;
  const depTime = notes?.departureTime ? formatTimeDisplay(notes.departureTime) : null;
  const arrTime = notes?.arrivalTime ? formatTimeDisplay(notes.arrivalTime) : null;

  return (
    <div
      className={`
        h-full rounded-2xl cursor-pointer overflow-hidden
        bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50
        ${isActive
          ? 'ring-2 ring-blue-500 dark:ring-blue-400'
          : 'ring-1 ring-blue-200/50 dark:ring-blue-800/30'
        }
      `}
      onClick={() => onEdit?.(item)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3 px-3 py-3 h-full">
        {/* Plane icon */}
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
          <Plane className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Flight info */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {/* Airport codes */}
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-gray-900 dark:text-white">{from}</span>
            <ArrowRight className="w-3 h-3 text-blue-400" />
            <span className="text-base font-bold text-gray-900 dark:text-white">{to}</span>
          </div>

          {/* Airline/Flight number */}
          {(airline || flightNumber) && (
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
              {airline} {flightNumber}
            </span>
          )}
        </div>

        {/* Times */}
        <div className="flex items-center gap-2 text-xs tabular-nums flex-shrink-0">
          {depTime && (
            <span className="font-medium text-gray-900 dark:text-white">{depTime}</span>
          )}
          {depTime && arrTime && (
            <span className="text-gray-400">→</span>
          )}
          {arrTime && (
            <span className="font-medium text-gray-900 dark:text-white">{arrTime}</span>
          )}
        </div>

        {/* Duration pill */}
        <span className="flex-shrink-0 text-[11px] text-blue-500 dark:text-blue-400 tabular-nums bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
          {formatDuration(duration)}
        </span>

        {/* Edit mode grip */}
        {isEditMode && (
          <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

/**
 * TrainTimelineCard - Specialized card for trains
 */
function TrainTimelineCard({
  item,
  start,
  duration,
  isActive,
  isEditMode,
  onEdit,
}: Omit<TimelineCardProps, 'height' | 'laneOffset' | 'onDragStart'>) {
  const notes = item.parsedNotes;
  const from = notes?.from || '---';
  const to = notes?.to || '---';
  const trainLine = notes?.trainLine;
  const trainNumber = notes?.trainNumber;
  const depTime = notes?.departureTime ? formatTimeDisplay(notes.departureTime) : null;
  const arrTime = notes?.arrivalTime ? formatTimeDisplay(notes.arrivalTime) : null;

  return (
    <div
      className={`
        h-full rounded-2xl cursor-pointer overflow-hidden
        bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50
        ${isActive
          ? 'ring-2 ring-emerald-500 dark:ring-emerald-400'
          : 'ring-1 ring-emerald-200/50 dark:ring-emerald-800/30'
        }
      `}
      onClick={() => onEdit?.(item)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3 px-3 py-3 h-full">
        {/* Train icon */}
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
          <Train className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* Train info */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {/* Station codes */}
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-gray-900 dark:text-white">{from}</span>
            <ArrowRight className="w-3 h-3 text-emerald-400" />
            <span className="text-base font-bold text-gray-900 dark:text-white">{to}</span>
          </div>

          {/* Train line/number */}
          {(trainLine || trainNumber) && (
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
              {trainLine} {trainNumber}
            </span>
          )}
        </div>

        {/* Times */}
        <div className="flex items-center gap-2 text-xs tabular-nums flex-shrink-0">
          {depTime && (
            <span className="font-medium text-gray-900 dark:text-white">{depTime}</span>
          )}
          {depTime && arrTime && (
            <span className="text-gray-400">→</span>
          )}
          {arrTime && (
            <span className="font-medium text-gray-900 dark:text-white">{arrTime}</span>
          )}
        </div>

        {/* Duration pill */}
        <span className="flex-shrink-0 text-[11px] text-emerald-500 dark:text-emerald-400 tabular-nums bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
          {formatDuration(duration)}
        </span>

        {/* Edit mode grip */}
        {isEditMode && (
          <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

/**
 * TimelineCard - Clean, minimal card following Apple HIG
 * Uses specialized cards for flights and trains
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

  // Use specialized cards for flights and trains
  if (type === 'flight') {
    return (
      <FlightTimelineCard
        item={item}
        start={start}
        duration={duration}
        isActive={isActive}
        isEditMode={isEditMode}
        onEdit={onEdit}
      />
    );
  }

  if (type === 'train') {
    return (
      <TrainTimelineCard
        item={item}
        start={start}
        duration={duration}
        isActive={isActive}
        isEditMode={isEditMode}
        onEdit={onEdit}
      />
    );
  }

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
