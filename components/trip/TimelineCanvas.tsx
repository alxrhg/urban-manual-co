'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { Plus, Sparkles } from 'lucide-react';
import DayHeader from './DayHeader';
import TimeBlockCard from './TimeBlockCard';
import TransitConnector from './TransitConnector';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TimelineCanvasProps {
  days: TripDay[];
  selectedDayNumber?: number;
  onSelectDay?: (dayNumber: number) => void;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onTimeChange?: (itemId: string, time: string) => void;
  onAddItem?: (dayNumber: number) => void;
  onOptimize?: () => void;
  activeItemId?: string | null;
  className?: string;
}

/**
 * TimelineCanvas - Drag-and-drop container for trip timeline
 * Lovably style: grouped by day, vertical list with connectors
 */
export default function TimelineCanvas({
  days,
  selectedDayNumber,
  onSelectDay,
  onReorderItems,
  onRemoveItem,
  onEditItem,
  onTimeChange,
  onAddItem,
  onOptimize,
  activeItemId,
  className = '',
}: TimelineCanvasProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set(days.map((d) => d.dayNumber))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleDay = (dayNumber: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) {
        next.delete(dayNumber);
      } else {
        next.add(dayNumber);
      }
      return next;
    });
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent, dayNumber: number, items: EnrichedItineraryItem[]) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorderItems?.(dayNumber, newItems);
      }
    },
    [onReorderItems]
  );

  if (days.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full py-20 ${className}`}>
        <p className="text-gray-400 dark:text-gray-600 text-sm mb-4">
          No days in your trip yet
        </p>
        <button
          onClick={() => onAddItem?.(1)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add your first stop
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Optimize Button */}
      {onOptimize && (
        <div className="flex justify-end px-6 py-3 border-b border-gray-100 dark:border-gray-900">
          <button
            onClick={onOptimize}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Optimize Route
          </button>
        </div>
      )}

      {/* Days List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {days.map((day) => {
          const isExpanded = expandedDays.has(day.dayNumber);
          const isSelected = selectedDayNumber === day.dayNumber;

          return (
            <div
              key={day.dayNumber}
              className={`
                border-b border-gray-100 dark:border-gray-900
                ${isSelected ? 'bg-gray-50/50 dark:bg-gray-900/30' : ''}
              `}
            >
              {/* Day Header */}
              <button
                onClick={() => {
                  toggleDay(day.dayNumber);
                  onSelectDay?.(day.dayNumber);
                }}
                className="w-full text-left"
              >
                <DayHeader
                  dayNumber={day.dayNumber}
                  date={day.date}
                  itemCount={day.items.length}
                  isSticky={false}
                  isExpanded={isExpanded}
                />
              </button>

              {/* Day Items */}
              {isExpanded && (
                <div className="pb-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, day.dayNumber, day.items)}
                  >
                    <SortableContext
                      items={day.items.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {day.items.map((item, index) => (
                        <div key={item.id}>
                          <TimeBlockCard
                            item={item}
                            index={index}
                            onRemove={onRemoveItem}
                            onEdit={onEditItem}
                            onTimeChange={onTimeChange}
                            isActive={item.id === activeItemId}
                          />
                          {/* Transit Connector (between items) */}
                          {index < day.items.length - 1 && (
                            <TransitConnector
                              mode="walk"
                              durationMinutes={15}
                            />
                          )}
                        </div>
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* Add Item Button */}
                  <button
                    onClick={() => onAddItem?.(day.dayNumber)}
                    className="flex items-center gap-2 ml-[88px] mt-4 px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add stop
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
