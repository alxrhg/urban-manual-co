'use client';

import { useState, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Sparkles, Loader2, Moon } from 'lucide-react';
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
import DayIntelligence from './DayIntelligence';
import { getAirportCoordinates } from '@/lib/utils/airports';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface DayTimelineProps {
  day: TripDay;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onTimeChange?: (itemId: string, time: string) => void;
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
  onTimeChange,
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

  // Separate hotels from regular activities
  const { regularItems, hotelItem } = useMemo(() => {
    const hotels = day.items.filter(item => item.parsedNotes?.type === 'hotel');
    const regular = day.items.filter(item => item.parsedNotes?.type !== 'hotel');
    return {
      regularItems: regular,
      hotelItem: hotels[0] || null, // Take first hotel for this night
    };
  }, [day.items]);

  // Render regular items with transit connectors (view mode)
  const renderItemsWithConnectors = () => {
    return regularItems.map((item, index) => {
      const nextItem = regularItems[index + 1];
      const fromLocation = getFromLocation(item);
      const toLocation = nextItem ? getToLocation(nextItem) : undefined;

      return (
        <div key={item.id}>
          <ViewOnlyTimelineBlock
            item={item}
            index={index}
            onEdit={onEditItem}
            onTimeChange={onTimeChange}
            isActive={item.id === activeItemId}
          />
          {index < regularItems.length - 1 && (
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

  // Render draggable items (edit mode) - includes regular items only
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

  // Render hotel section at the bottom
  const renderHotelSection = () => {
    if (!hotelItem) return null;

    return (
      <div className="mt-4 pt-4 border-t border-stone-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3 px-2">
          <Moon className="w-4 h-4 text-stone-400" />
          <span className="text-xs font-medium text-stone-500 dark:text-gray-400 uppercase tracking-wide">
            Tonight&apos;s Stay
          </span>
        </div>
        <ViewOnlyTimelineBlock
          item={hotelItem}
          index={regularItems.length}
          onEdit={onEditItem}
          onTimeChange={onTimeChange}
          isActive={hotelItem.id === activeItemId}
        />
      </div>
    );
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
        <span className="text-xs text-stone-400 dark:text-gray-500">
          {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
        </span>
      </div>

      {/* Day Intelligence Bar */}
      {day.items.length > 0 && (
        <div className="px-4 py-2 border-b border-stone-100 dark:border-gray-800/50 bg-stone-50/30 dark:bg-gray-900/30">
          <DayIntelligence
            dayNumber={day.dayNumber}
            date={day.date}
            items={day.items}
            onOptimizeDay={() => onOptimizeDay?.(day.dayNumber)}
            onAutoFill={() => onAutoFillDay?.(day.dayNumber)}
            isOptimizing={isOptimizing}
            isAutoFilling={isAutoFilling}
          />
        </div>
      )}

      {/* Day Content */}
      <div className="p-2 sm:p-4">
        {regularItems.length === 0 && !hotelItem ? (
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
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={regularItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {renderDraggableItems()}
                </div>
              </SortableContext>
            </DndContext>
            {renderHotelSection()}
          </>
        ) : (
          /* View Mode - With Transit Connectors */
          <>
            <div className="space-y-0">
              {renderItemsWithConnectors()}
            </div>
            {renderHotelSection()}
          </>
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
