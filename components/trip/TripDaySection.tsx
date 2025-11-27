'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, Plus } from 'lucide-react';
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
 * TripDaySection - Collapsible day section matching Account page style
 * Uses: text-xs uppercase labels, simple borders, smooth transitions
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
        border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden
        transition-colors duration-200
        ${isSelected ? 'ring-1 ring-gray-300 dark:ring-gray-700' : ''}
      `}
    >
      {/* Day Header - Clickable to expand/collapse */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          onSelect?.();
        }}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-light text-gray-900 dark:text-white">
            Day {day.dayNumber}
          </span>
          {formattedDate && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formattedDate}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </div>
      </button>

      {/* Day Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800/50">
          {day.items.length === 0 ? (
            /* Empty State */
            <div className="p-6 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                No stops planned for this day
              </p>
              <button
                onClick={() => onAddItem?.(day.dayNumber)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Plus className="w-3 h-3" />
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
                <div className="p-2">
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

          {/* Add Stop Button (when items exist) */}
          {day.items.length > 0 && (
            <div className="px-4 pb-4">
              <button
                onClick={() => onAddItem?.(day.dayNumber)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-dashed border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add stop
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
