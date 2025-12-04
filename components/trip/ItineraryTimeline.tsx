'use client';

import { Fragment, useMemo, useCallback, useRef, useEffect } from 'react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { formatMinutesToTime, formatTimeDisplay } from '@/lib/utils/time-calculations';
import { useItineraryItems } from './timeline/useItineraryItems';
import { useDragAndDrop } from './timeline/useDragAndDrop';
import { TimeGrid } from './timeline/TimeGrid';
import { TimelineCard } from './timeline/TimelineCard';
import { TravelConnector, type TravelMode } from './timeline/TravelConnector';
import { DropZone } from './timeline/DropZone';
import { SuggestionChips } from './timeline/SuggestionChips';
import { CurrentTimeIndicator } from './timeline/CurrentTimeIndicator';
import { TIMELINE_CONFIG } from './timeline/config';
import type { Trip, ItineraryItemNotes } from '@/types/trip';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { Destination } from '@/types/destination';

// Hours array for time ruler
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to midnight

interface ItineraryTimelineProps {
  trip: Trip;
  day: TripDay;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onTimeChange?: (itemId: string, time: string) => void;
  onDurationChange?: (itemId: string, duration: number) => void;
  onTravelModeChange?: (itemId: string, mode: TravelMode) => void;
  onAddItem?: (dayNumber: number, time?: string, category?: string) => void;
  onAddDestination?: (dayNumber: number, destination: Destination, time?: string) => void;
  onAutoFillDay?: (dayNumber: number) => void;
  activeItemId?: string | null;
  isOptimizing?: boolean;
  isAutoFilling?: boolean;
  isEditMode?: boolean;
  showTimeRuler?: boolean;
  maxHeight?: number;
}

/**
 * ItineraryTimeline - Visual timeline view for a day's itinerary
 * Features:
 * - Time ruler on the left
 * - Positioned itinerary cards
 * - Travel connectors between items
 * - Drop zones in gaps for adding new items
 * - Smart suggestions in gaps
 * - Drag and drop reordering
 */
export default function ItineraryTimeline({
  trip,
  day,
  onReorderItems,
  onRemoveItem,
  onEditItem,
  onTimeChange,
  onDurationChange,
  onTravelModeChange,
  onAddItem,
  onAddDestination,
  onAutoFillDay,
  activeItemId,
  isOptimizing = false,
  isAutoFilling = false,
  isEditMode = false,
  showTimeRuler = true,
  maxHeight = TIMELINE_CONFIG.scrollableMaxHeight,
}: ItineraryTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Get positioned items and gaps
  const {
    items,
    gaps,
    startHour,
    endHour,
    totalDuration,
  } = useItineraryItems({
    tripId: trip.id,
    day,
    dayStartHour: 8,
    dayEndHour: 22,
  });

  // Set up drag and drop
  const {
    draggedItem,
    isDragging,
    handleDragStart,
    handleDrop,
  } = useDragAndDrop({
    items,
    gaps,
    onReorder: (newItems) => onReorderItems?.(day.dayNumber, newItems),
    onDropInGap: (item, gap) => {
      const newTime = formatMinutesToTime(gap.startTime);
      onTimeChange?.(item.id, newTime);
    },
    enabled: isEditMode,
  });

  // Calculate timeline dimensions
  const { pixelsPerMinute } = TIMELINE_CONFIG;
  const timelineHeight = (endHour - startHour) * 60 * pixelsPerMinute;

  // Convert time to pixels
  const timeToPixels = useCallback(
    (minutes: number) => (minutes - startHour * 60) * pixelsPerMinute,
    [startHour, pixelsPerMinute]
  );

  // Convert duration to pixels
  const durationToPixels = useCallback(
    (minutes: number) => minutes * pixelsPerMinute,
    [pixelsPerMinute]
  );

  // Format hour for display
  const formatHour = useCallback((hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${period}`;
  }, []);

  // Handle adding destination from drop zone
  const handleDropDestination = useCallback(
    (destination: Destination, gap: { startTime: number }) => {
      const time = formatMinutesToTime(gap.startTime);
      onAddDestination?.(day.dayNumber, destination, time);
    },
    [day.dayNumber, onAddDestination]
  );

  // Handle category selection from suggestion chips
  const handleCategorySelect = useCallback(
    (category: string, gap: { startTime: number }) => {
      const time = formatMinutesToTime(gap.startTime);
      onAddItem?.(day.dayNumber, time, category);
    },
    [day.dayNumber, onAddItem]
  );

  // Handle travel mode change
  const handleModeChange = useCallback(
    (itemId: string, mode: TravelMode) => {
      onTravelModeChange?.(itemId, mode);
    },
    [onTravelModeChange]
  );

  // Auto-scroll to first item or current time
  useEffect(() => {
    if (scrollContainerRef.current && items.length > 0) {
      const firstItemTop = timeToPixels(items[0].startMinutes);
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, firstItemTop - 60),
        behavior: 'smooth',
      });
    }
  }, [items, timeToPixels]);

  // Determine scrollability
  const isScrollable = timelineHeight > maxHeight;

  // Get trip destination for suggestions
  const tripCity = useMemo(() => {
    if (trip.destination) {
      try {
        const parsed = JSON.parse(trip.destination);
        return Array.isArray(parsed) ? parsed[0] : trip.destination;
      } catch {
        return trip.destination;
      }
    }
    return undefined;
  }, [trip.destination]);

  return (
    <div className="relative">
      {/* Time ruler - fixed on left */}
      {showTimeRuler && (
        <div className="absolute left-0 top-0 bottom-0 w-16 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
          {HOURS.filter((h) => h >= startHour && h <= endHour).map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 h-[63px] flex items-start justify-end pr-3"
              style={{ top: timeToPixels(hour * 60) }}
            >
              <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                {formatHour(hour)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Main timeline area */}
      <div
        ref={scrollContainerRef}
        className={`relative ${showTimeRuler ? 'ml-16' : ''} ${isScrollable ? 'overflow-y-auto' : ''}`}
        style={{ maxHeight: isScrollable ? maxHeight : undefined }}
      >
        <div
          ref={timelineRef}
          className="relative"
          style={{ height: timelineHeight + 40 }}
        >
          {/* Hour grid lines */}
          <TimeGrid
            startHour={startHour}
            endHour={endHour}
            minutesToPixels={timeToPixels}
          />

          {/* Current time indicator */}
          <CurrentTimeIndicator
            date={day.date}
            startHour={startHour}
            endHour={endHour}
            minutesToPixels={timeToPixels}
          />

          {/* Items and connectors */}
          <div className="absolute inset-0 pl-2">
            {items.map((item, index) => {
              const nextItem = items[index + 1];
              const travelMode = (item.parsedNotes?.travelModeToNext as TravelMode) || 'walking';
              const travelTime = item.parsedNotes?.travelTimeToNext;

              return (
                <Fragment key={item.id}>
                  {/* Itinerary card */}
                  <div
                    className="absolute left-0 right-0 pr-2"
                    style={{
                      top: timeToPixels(item.startMinutes),
                      height: durationToPixels(item.durationMinutes),
                    }}
                  >
                    <TimelineCard
                      item={item}
                      start={item.startMinutes}
                      duration={item.durationMinutes}
                      height={durationToPixels(item.durationMinutes)}
                      laneOffset={0}
                      isActive={item.id === activeItemId}
                      isEditMode={isEditMode}
                      onEdit={onEditItem}
                    />
                  </div>

                  {/* Travel connector to next item */}
                  {nextItem && (
                    <div
                      className="absolute left-0 right-0 pr-2"
                      style={{
                        top: timeToPixels(item.endMinutes),
                        height: timeToPixels(nextItem.startMinutes) - timeToPixels(item.endMinutes),
                      }}
                    >
                      <TravelConnector
                        from={item}
                        to={nextItem}
                        travelTime={travelTime}
                        travelMode={travelMode}
                        onModeChange={
                          onTravelModeChange
                            ? (mode: TravelMode) => handleModeChange(item.id, mode)
                            : undefined
                        }
                      />
                    </div>
                  )}
                </Fragment>
              );
            })}

            {/* Drop zones for gaps */}
            {gaps.map((gap, index) => (
              <div
                key={`gap-${gap.startTime}`}
                className="absolute left-0 right-0 pr-2"
                style={{
                  top: timeToPixels(gap.startTime),
                  height: Math.max(durationToPixels(gap.durationMinutes), 60),
                }}
              >
                <DropZone
                  gap={gap}
                  onDrop={(destination) => handleDropDestination(destination, gap)}
                  minHeight={Math.max(durationToPixels(gap.durationMinutes), 60)}
                >
                  <SuggestionChips
                    gap={gap}
                    tripId={trip.id}
                    city={tripCity}
                    onSelect={(destination) => handleDropDestination(destination, gap)}
                    onCategorySelect={(category) => handleCategorySelect(category, gap)}
                  />
                </DropZone>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {items.length === 0 && gaps.length === 1 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                No activities planned yet
              </p>

              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {['cafe', 'museum', 'restaurant', 'bar'].map((category) => (
                  <button
                    key={category}
                    onClick={() => onAddItem?.(day.dayNumber, undefined, category)}
                    className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    + {category === 'cafe' ? 'Breakfast' : category === 'museum' ? 'Museum' : category === 'restaurant' ? 'Lunch' : 'Drinks'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onAddItem?.(day.dayNumber)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Plus className="w-3 h-3" />
                Browse all places
              </button>

              {onAutoFillDay && (
                <button
                  onClick={() => onAutoFillDay(day.dayNumber)}
                  disabled={isAutoFilling}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-black dark:bg-white dark:text-black rounded-full hover:opacity-80 disabled:opacity-50 transition-opacity"
                >
                  {isAutoFilling ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Auto-fill day
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      {isScrollable && (
        <div className="text-center py-2 text-[10px] text-gray-400 dark:text-gray-500">
          Scroll for more
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && draggedItem && (
        <div
          className="fixed pointer-events-none z-50 opacity-80"
          style={{
            left: draggedItem.currentPosition.x - 100,
            top: draggedItem.currentPosition.y - 25,
            width: 200,
          }}
        >
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {draggedItem.item.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
