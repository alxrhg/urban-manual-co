'use client';

import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
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
import TransitConnector from './TransitConnector';
import { getAirportCoordinates } from '@/lib/utils/airports';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface DayTimelineProps {
  day: TripDay;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onAddItem?: (dayNumber: number, category?: string) => void;
  onOptimizeDay?: (dayNumber: number) => void;
  onAutoFillDay?: (dayNumber: number) => void;
  activeItemId?: string | null;
  isOptimizing?: boolean;
  isAutoFilling?: boolean;
  isEditMode?: boolean;
}

/**
 * DayTimeline - Timeline view for a single day's itinerary
 * Features: Time blocks, transit connectors, drag-and-drop reordering
 */
export default function DayTimeline({
  day,
  onReorderItems,
  onRemoveItem,
  onEditItem,
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

  // Helper to get coordinates for transit connectors
  const getFromLocation = (item: EnrichedItineraryItem) => {
    const itemType = item.parsedNotes?.type;

    if (itemType === 'flight') {
      const arrivalAirport = item.parsedNotes?.to;
      if (arrivalAirport) {
        const coords = getAirportCoordinates(arrivalAirport);
        if (coords) return coords;
      }
      const lat = item.parsedNotes?.latitude;
      const lng = item.parsedNotes?.longitude;
      if (lat && lng) return { latitude: lat, longitude: lng };
      return undefined;
    }

    const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
    if (lat && lng) return { latitude: lat, longitude: lng };
    return undefined;
  };

  const getToLocation = (item: EnrichedItineraryItem) => {
    const itemType = item.parsedNotes?.type;

    if (itemType === 'flight') {
      const departureAirport = item.parsedNotes?.from;
      if (departureAirport) {
        const coords = getAirportCoordinates(departureAirport);
        if (coords) return coords;
      }
      const lat = item.parsedNotes?.latitude;
      const lng = item.parsedNotes?.longitude;
      if (lat && lng) return { latitude: lat, longitude: lng };
      return undefined;
    }

    const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
    if (lat && lng) return { latitude: lat, longitude: lng };
    return undefined;
  };

  // Render items with transit connectors (view mode)
  const renderItemsWithConnectors = () => {
    return day.items.map((item, index) => {
      const nextItem = day.items[index + 1];
      const fromLocation = getFromLocation(item);
      const toLocation = nextItem ? getToLocation(nextItem) : undefined;

      return (
        <div key={item.id}>
          <ViewOnlyTimelineBlock
            item={item}
            index={index}
            onEdit={onEditItem}
            isActive={item.id === activeItemId}
          />
          {index < day.items.length - 1 && (
            <TransitConnector
              from={fromLocation}
              to={toLocation}
              mode="walk"
            />
          )}
        </div>
      );
    });
  };

  // Render draggable items (edit mode)
  const renderDraggableItems = () => {
    return day.items.map((item, index) => (
      <TimelineBlock
        key={item.id}
        item={item}
        index={index}
        onEdit={onEditItem}
        onRemove={onRemoveItem}
        isActive={item.id === activeItemId}
        isDraggable={true}
      />
    ));
  };

  return (
    <div className="border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
      {/* Day Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-100 dark:border-gray-800/50 bg-stone-50/50 dark:bg-gray-900/50">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
          <span className="text-lg font-light text-stone-900 dark:text-white">
            Day {day.dayNumber}
          </span>
          {formattedDate && (
            <span className="text-xs text-stone-500 dark:text-gray-400">
              {formattedDate}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 dark:text-gray-500">
            {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
          </span>
          {/* Quick Actions */}
          {day.items.length >= 2 && onOptimizeDay && (
            <button
              onClick={() => onOptimizeDay(day.dayNumber)}
              disabled={isOptimizing}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-stone-500 dark:text-gray-400 hover:text-stone-700 dark:hover:text-gray-300 bg-stone-100 dark:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
            >
              {isOptimizing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Optimize
            </button>
          )}
        </div>
      </div>

      {/* Day Content */}
      <div className="p-2 sm:p-4">
        {day.items.length === 0 ? (
          /* Empty State */
          <div className="py-8 text-center">
            <p className="text-sm text-stone-400 dark:text-gray-500 mb-4">
              No stops planned for this day
            </p>
            {/* Quick Add Suggestions */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <button
                onClick={() => onAddItem?.(day.dayNumber, 'cafe')}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                + Breakfast
              </button>
              <button
                onClick={() => onAddItem?.(day.dayNumber, 'museum')}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                + Museum
              </button>
              <button
                onClick={() => onAddItem?.(day.dayNumber, 'restaurant')}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                + Lunch
              </button>
              <button
                onClick={() => onAddItem?.(day.dayNumber, 'bar')}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                + Drinks
              </button>
            </div>
            <button
              onClick={() => onAddItem?.(day.dayNumber)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
              Browse all places
            </button>
            {onAutoFillDay && (
              <div className="mt-4">
                <button
                  onClick={() => onAutoFillDay(day.dayNumber)}
                  disabled={isAutoFilling}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-stone-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-80 disabled:opacity-50 transition-opacity"
                >
                  {isAutoFilling ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Auto-fill day
                </button>
              </div>
            )}
          </div>
        ) : isEditMode ? (
          /* Edit Mode - Draggable */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={day.items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {renderDraggableItems()}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          /* View Mode - With Transit Connectors */
          <div className="space-y-0">
            {renderItemsWithConnectors()}
          </div>
        )}

        {/* Add Stop Button */}
        {day.items.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => onAddItem?.(day.dayNumber)}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs font-medium text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-dashed border-stone-200 dark:border-gray-800 rounded-xl hover:border-stone-300 dark:hover:border-gray-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
