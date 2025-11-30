'use client';

import { useState, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Sparkles, Loader2, Moon, Clock, ArrowDown } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import TimelineBlock, { ViewOnlyTimelineBlock } from './TimelineBlock';
import TransitConnector, { TransitMode } from './TransitConnector';
import { getAirportCoordinates } from '@/lib/utils/airports';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface DayTimelineProps {
  day: TripDay;
  nightlyHotel?: EnrichedItineraryItem | null; // Hotel spanning this night (from another day)
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onTimeChange?: (itemId: string, time: string) => void;
  onTravelModeChange?: (itemId: string, mode: TransitMode) => void;
  onAddItem?: (dayNumber: number, category?: string) => void;
  onOptimizeDay?: (dayNumber: number) => void;
  onAutoFillDay?: (dayNumber: number) => void;
  activeItemId?: string | null;
  isOptimizing?: boolean;
  isAutoFilling?: boolean;
  isEditMode?: boolean;
}

/**
 * DayTimeline - Rebuilt for "Ground Up" minimalist canvas
 * Removes clutter, focuses on timeline flow.
 */
export default function DayTimeline({
  day,
  nightlyHotel,
  onReorderItems,
  onRemoveItem,
  onEditItem,
  onTimeChange,
  onTravelModeChange,
  onAddItem,
  onOptimizeDay,
  onAutoFillDay,
  activeItemId,
  isOptimizing = false,
  isAutoFilling = false,
  isEditMode = false,
}: DayTimelineProps) {
  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = day.items.findIndex((item) => item.id === active.id);
        const newIndex = day.items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(day.items, oldIndex, newIndex);
        onReorderItems?.(day.dayNumber, newItems);
      }
    },
    [day.dayNumber, day.items, onReorderItems]
  );

  const formatDayDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d');
    } catch {
      return null;
    }
  };

  const formattedDate = formatDayDate(day.date);

  // Separate hotels from regular activities
  const { regularItems, hotelItem, isExternalHotel } = useMemo(() => {
    // Filter hotels: only include if check-in date matches this day's date
    const hotels = day.items.filter(item => {
      if (item.parsedNotes?.type !== 'hotel') return false;
      const checkInDate = item.parsedNotes?.checkInDate;
      if (checkInDate && day.date) {
        const checkIn = new Date(checkInDate);
        const dayDate = new Date(day.date);
        checkIn.setHours(0, 0, 0, 0);
        dayDate.setHours(0, 0, 0, 0);
        return checkIn.getTime() === dayDate.getTime();
      }
      return true; // No check-in date set, show on assigned day
    });

    const regular = day.items.filter(item => item.parsedNotes?.type !== 'hotel');
    const effectiveHotel = nightlyHotel || hotels[0] || null;
    const isExternal = !!nightlyHotel && !hotels.length;

    return {
      regularItems: regular,
      hotelItem: effectiveHotel,
      isExternalHotel: isExternal,
    };
  }, [day.items, day.date, nightlyHotel]);

  // Render draggable items (edit mode)
  const renderDraggableItems = () => {
    return regularItems.map((item, index) => (
      <TimelineBlock
        key={item.id}
        item={item}
        index={index}
        onEdit={onEditItem}
        onRemove={onRemoveItem}
        onTimeChange={onTimeChange}
        isActive={item.id === activeItemId}
        isDraggable={true}
      />
    ));
  };

  // Render view mode items with cleaner timeline
  const renderViewItems = () => {
    return regularItems.map((item, index) => {
      const isLast = index === regularItems.length - 1;
      return (
        <div key={item.id} className="relative pl-8 pb-8 last:pb-0">
          {/* Vertical Line */}
          {!isLast && (
            <div className="absolute left-[3px] top-3 bottom-0 w-0.5 bg-stone-200 dark:bg-gray-800" />
          )}

          {/* Dot */}
          <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-stone-900 dark:bg-white ring-4 ring-white dark:ring-gray-950" />

          {/* Content */}
          <div
            onClick={() => onEditItem?.(item)}
            className="group cursor-pointer hover:bg-stone-50 dark:hover:bg-gray-900 p-3 -ml-3 rounded-lg transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-stone-400">
                    {item.time || '—'}
                  </span>
                  <h3 className="font-medium text-stone-900 dark:text-white">
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm text-stone-500 line-clamp-2">
                  {item.description}
                </p>
                {item.parsedNotes?.notes && (
                  <p className="text-xs text-stone-400 mt-1 italic">
                    "{item.parsedNotes.notes}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Day Header */}
      <div>
        <h2 className="font-display text-2xl font-medium text-stone-900 dark:text-white">
          Day {day.dayNumber}
        </h2>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-stone-500 font-light text-sm">
            {formattedDate || 'Date not set'}
          </p>
          <span className="w-1 h-1 rounded-full bg-stone-300" />
          <p className="text-stone-400 text-xs">
            {day.items.length} {day.items.length === 1 ? 'activity' : 'activities'}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="min-h-[200px]">
        {regularItems.length === 0 && !hotelItem ? (
          <div className="border border-dashed border-stone-200 dark:border-gray-800 rounded-xl p-8 text-center">
            <p className="text-sm text-stone-400 mb-4">No activities yet</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => onAddItem?.(day.dayNumber)}
                className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Add Activity
              </button>
              {onAutoFillDay && (
                <button
                  onClick={() => onAutoFillDay(day.dayNumber)}
                  disabled={isAutoFilling}
                  className="px-4 py-2 border border-stone-200 dark:border-gray-800 rounded-full text-xs font-medium hover:bg-stone-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-2"
                >
                  {isAutoFilling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Auto-fill
                </button>
              )}
            </div>
          </div>
        ) : isEditMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={regularItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {renderDraggableItems()}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="py-2">
            {renderViewItems()}

            {/* Add Button at end of timeline */}
            <div className="relative pl-8 pt-4">
              <div className="absolute left-[3px] top-0 bottom-0 w-0.5 bg-stone-100 dark:bg-gray-800" />
              <button
                onClick={() => onAddItem?.(day.dayNumber)}
                className="group flex items-center gap-3 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              >
                <div className="w-2 h-2 rounded-full border border-stone-300 group-hover:bg-stone-900 group-hover:border-stone-900 bg-white transition-colors absolute left-0" />
                <span className="text-xs font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Add next stop
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hotel / Night Section */}
      {hotelItem && (
        <div className="mt-8 pt-6 border-t border-stone-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-4 text-stone-400">
            <Moon className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Overnight</span>
          </div>
          <div
            onClick={() => onEditItem?.(hotelItem)}
            className="bg-stone-50 dark:bg-gray-900 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-stone-100 transition-colors"
          >
            {hotelItem.destination?.image_thumbnail && (
              <img
                src={hotelItem.destination.image_thumbnail}
                alt={hotelItem.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <h4 className="font-medium text-stone-900 dark:text-white">{hotelItem.title}</h4>
              <p className="text-sm text-stone-500">{hotelItem.parsedNotes?.address || hotelItem.destination?.city}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
