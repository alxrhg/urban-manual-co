'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, Plus, Pencil, Check } from 'lucide-react';
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
import TripItemCard from './TripItemCard';
import TransitConnector from './TransitConnector';
import DayIntelligence from './DayIntelligence';
import { NeighborhoodTags } from './NeighborhoodBreakdown';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { getAirportCoordinates } from '@/lib/utils/airports';

interface TripDaySectionProps {
  day: TripDay;
  isSelected?: boolean;
  onSelect?: () => void;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onAddItem?: (dayNumber: number, category?: string) => void;
  onOptimizeDay?: (dayNumber: number) => void;
  onAutoFillDay?: (dayNumber: number) => void;
  activeItemId?: string | null;
  isOptimizing?: boolean;
  isAutoFilling?: boolean;
}

/**
 * TripDaySection - Mobile-optimized collapsible day section
 * Features: View mode by default, edit mode toggle, transit connectors
 */
export default function TripDaySection({
  day,
  isSelected = false,
  onSelect,
  onReorderItems,
  onRemoveItem,
  onEditItem,
  onAddItem,
  onOptimizeDay,
  onAutoFillDay,
  activeItemId,
  isOptimizing = false,
  isAutoFilling = false,
}: TripDaySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Sensors configured for both touch and pointer with appropriate delays
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Longer delay on touch to distinguish from scroll
        tolerance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = day.items.findIndex((item) => item.id === active.id);
      const newIndex = day.items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(day.items, oldIndex, newIndex);
      onReorderItems?.(day.dayNumber, newItems);
    }
  };

  const formatDayDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), 'EEEE, MMM d');
    } catch {
      return null;
    }
  };

  const formattedDate = formatDayDate(day.date);

  // Helper to get "from" location (where you'd travel FROM this item to the next)
  // For flights: this is the ARRIVAL airport (you arrive, then travel to next place)
  // For regular places: this is the place's location
  const getFromLocation = (item: EnrichedItineraryItem) => {
    const itemType = item.parsedNotes?.type;

    // For flights, the "from" for outgoing travel is the arrival airport
    if (itemType === 'flight') {
      // Get arrival airport from parsedNotes.to (e.g., "CDG" or "Paris (CDG)")
      const arrivalAirport = item.parsedNotes?.to;
      if (arrivalAirport) {
        const coords = getAirportCoordinates(arrivalAirport);
        if (coords) {
          return coords;
        }
      }
      // Fallback to stored lat/lng if any
      const lat = item.parsedNotes?.latitude;
      const lng = item.parsedNotes?.longitude;
      if (lat && lng) {
        return { latitude: lat, longitude: lng };
      }
      return undefined;
    }

    // For regular places, use destination coords or parsedNotes coords
    const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
    if (lat && lng) {
      return { latitude: lat, longitude: lng };
    }
    return undefined;
  };

  // Helper to get "to" location (where you'd travel TO this item from the previous)
  // For flights: this is the DEPARTURE airport (you travel to airport before departing)
  // For regular places: this is the place's location
  const getToLocation = (item: EnrichedItineraryItem) => {
    const itemType = item.parsedNotes?.type;

    // For flights, the "to" for incoming travel is the departure airport
    if (itemType === 'flight') {
      // Get departure airport from parsedNotes.from (e.g., "JFK" or "New York (JFK)")
      const departureAirport = item.parsedNotes?.from;
      if (departureAirport) {
        const coords = getAirportCoordinates(departureAirport);
        if (coords) {
          return coords;
        }
      }
      // Fallback to stored lat/lng if any
      const lat = item.parsedNotes?.latitude;
      const lng = item.parsedNotes?.longitude;
      if (lat && lng) {
        return { latitude: lat, longitude: lng };
      }
      return undefined;
    }

    // For regular places, use destination coords or parsedNotes coords
    const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
    if (lat && lng) {
      return { latitude: lat, longitude: lng };
    }
    return undefined;
  };

  // Render items with TransitConnector between them
  const renderItemsWithConnectors = () => {
    return day.items.map((item, index) => {
      const nextItem = day.items[index + 1];

      // For connector between current item and next item:
      // - from: where we're leaving (current item's "from" location)
      // - to: where we're going (next item's "to" location)
      const fromLocation = getFromLocation(item);
      const toLocation = nextItem ? getToLocation(nextItem) : undefined;

      // Debug logging in development only
      if (process.env.NODE_ENV === 'development' && nextItem && (!fromLocation || !toLocation)) {
        console.debug('Transit connector missing coords:', item.title, '→', nextItem.title);
      }

      return (
        <div key={item.id}>
          <TripItemCard
            item={item}
            index={index}
            onEdit={onEditItem}
            onRemove={undefined}
            isActive={item.id === activeItemId}
            isViewOnly={true}
          />
          {/* Transit connector between items */}
          {index < day.items.length - 1 && (
            <TransitConnector
              from={fromLocation}
              to={toLocation}
              mode="walking"
            />
          )}
        </div>
      );
    });
  };

  return (
    <div
      className={`
        border border-stone-200 dark:border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden
        transition-colors duration-200
        ${isSelected ? 'ring-1 ring-stone-300 dark:ring-gray-700' : ''}
      `}
    >
      {/* Day Header - Larger touch target on mobile */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            onSelect?.();
          }}
          className="flex-1 flex items-center justify-between p-4 sm:p-4 min-h-[56px] hover:bg-stone-50 dark:hover:bg-gray-800/50 active:bg-stone-100 dark:active:bg-gray-800 transition-colors text-left"
        >
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
            <span className="text-base sm:text-lg font-light text-stone-900 dark:text-white">
              Day {day.dayNumber}
            </span>
            {formattedDate && (
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-gray-400">
                {formattedDate}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] sm:text-xs text-stone-400 dark:text-gray-500">
              {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
            </span>
            <ChevronDown
              className={`w-5 h-5 sm:w-4 sm:h-4 text-stone-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </div>
        </button>

        {/* Edit Mode Toggle */}
        {day.items.length > 0 && (
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`mr-2 p-2 rounded-lg transition-colors ${
              isEditMode
                ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                : 'hover:bg-stone-100 dark:hover:bg-gray-800 text-stone-500 dark:text-gray-400'
            }`}
            title={isEditMode ? 'Done editing' : 'Edit day'}
          >
            {isEditMode ? (
              <Check className="w-4 h-4" />
            ) : (
              <Pencil className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Day Intelligence Bar */}
      {isExpanded && (
        <div className="px-4 py-2 border-t border-stone-100 dark:border-gray-800/50 bg-stone-50/50 dark:bg-gray-900/30">
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
      {isExpanded && (
        <div className="border-t border-stone-100 dark:border-gray-800/50">
          {day.items.length === 0 ? (
            /* Empty State with Quick Suggestions */
            <div className="p-6 sm:p-6">
              <p className="text-xs text-stone-400 dark:text-gray-500 mb-4 text-center">
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

              <div className="text-center">
                <button
                  onClick={() => onAddItem?.(day.dayNumber)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white active:text-stone-900 transition-colors bg-stone-100 dark:bg-gray-800 sm:bg-transparent rounded-xl sm:rounded-none"
                >
                  <Plus className="w-4 h-4 sm:w-3 sm:h-3" />
                  Browse all
                </button>
              </div>
            </div>
          ) : isEditMode ? (
            /* Edit Mode - Draggable Items */
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={day.items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="p-2 sm:p-2">
                  {day.items.map((item, index) => (
                    <TripItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      onEdit={onEditItem}
                      onRemove={onRemoveItem}
                      isActive={item.id === activeItemId}
                      isViewOnly={false}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            /* View Mode - With Transit Connectors */
            <div className="p-2 sm:p-2">
              {renderItemsWithConnectors()}
            </div>
          )}

          {/* Add Stop Button (when items exist) - Larger touch target */}
          {day.items.length > 0 && (
            <div className="px-3 sm:px-4 pb-3 sm:pb-4">
              <button
                onClick={() => onAddItem?.(day.dayNumber)}
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-2.5 text-sm sm:text-xs font-medium text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white active:text-stone-900 border border-dashed border-stone-200 dark:border-gray-800 rounded-xl hover:border-stone-300 dark:hover:border-stone-700 active:border-stone-400 active:bg-stone-50 dark:active:bg-gray-800/50 transition-colors min-h-[48px] sm:min-h-0"
              >
                <Plus className="w-4 h-4 sm:w-3 sm:h-3" />
                Add stop
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
