'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, Plus } from 'lucide-react';
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
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

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
 * Features: Touch-friendly drag, larger tap targets, smooth animations
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

  return (
    <div
      className={`
        border border-stone-200 dark:border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden
        transition-colors duration-200
        ${isSelected ? 'ring-1 ring-stone-300 dark:ring-gray-700' : ''}
      `}
    >
      {/* Day Header - Larger touch target on mobile */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          onSelect?.();
        }}
        className="w-full flex items-center justify-between p-4 sm:p-4 min-h-[56px] hover:bg-stone-50 dark:hover:bg-gray-800/50 active:bg-stone-100 dark:active:bg-gray-800 transition-colors text-left"
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

      {/* Day Content */}
      {isExpanded && (
        <div className="border-t border-stone-100 dark:border-gray-800/50">
          {day.items.length === 0 ? (
            /* Empty State - Larger touch target */
            <div className="p-6 sm:p-6 text-center">
              <p className="text-xs text-stone-400 dark:text-gray-500 mb-4 sm:mb-3">
                No stops planned for this day
              </p>
              <button
                onClick={() => onAddItem?.(day.dayNumber)}
                className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white active:text-stone-900 transition-colors bg-stone-100 dark:bg-gray-800 sm:bg-transparent rounded-xl sm:rounded-none"
              >
                <Plus className="w-4 h-4 sm:w-3 sm:h-3" />
                Add a stop
              </button>
            </div>
          ) : (
            /* Items List */
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
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
