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
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { getAirportCoordinates } from '@/lib/utils/airports';

interface TripDaySectionProps {
  day: TripDay;
  isSelected?: boolean;
  onSelect?: () => void;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onAddItem?: (dayNumber: number) => void;
  activeItemId?: string | null;
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
  activeItemId,
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
              mode="walk"
            />
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Day Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            onSelect?.();
          }}
          className="flex items-center gap-3 text-left group"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-light text-gray-900 dark:text-white">
              Day {day.dayNumber}
            </span>
            {formattedDate && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {formattedDate}
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
          </span>
          {day.items.length > 0 && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-2 rounded-full transition-colors ${
                isEditMode
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'
              }`}
              title={isEditMode ? 'Done editing' : 'Reorder items'}
            >
              {isEditMode ? (
                <Check className="w-4 h-4" />
              ) : (
                <Pencil className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Day Content */}
      {isExpanded && (
        <div>
          {day.items.length === 0 ? (
            /* Empty State */
            <div className="py-8 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                No stops planned
              </p>
              <button
                onClick={() => onAddItem?.(day.dayNumber)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add a stop
              </button>
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
                <div className="space-y-2">
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
            <div className="space-y-0">
              {renderItemsWithConnectors()}
            </div>
          )}

          {/* Add Stop Button */}
          {day.items.length > 0 && (
            <button
              onClick={() => onAddItem?.(day.dayNumber)}
              className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-sm font-medium text-gray-400 hover:text-gray-900 dark:hover:text-white border border-dashed border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add stop
            </button>
          )}
        </div>
      )}
    </div>
  );
}
