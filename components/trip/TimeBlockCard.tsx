'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, MapPin, Plane, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { formatTimeDisplay, formatDuration } from '@/lib/utils/time-calculations';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TimeBlockCardProps {
  item: EnrichedItineraryItem;
  index?: number;
  onRemove?: (id: string) => void;
  onEdit?: (item: EnrichedItineraryItem) => void;
  onTimeChange?: (id: string, time: string) => void;
  isActive?: boolean;
  className?: string;
}

/**
 * TimeBlockCard - Editorial itinerary item with distinctive styling
 * Features asymmetric layout, hover micro-interactions, and refined typography
 */
export default function TimeBlockCard({
  item,
  index = 0,
  onRemove,
  onEdit,
  onTimeChange,
  isActive = false,
  className = '',
}: TimeBlockCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFlight = item.parsedNotes?.type === 'flight';
  const image = item.destination?.image_thumbnail || item.destination?.image || item.parsedNotes?.image;
  const category = item.parsedNotes?.category || item.destination?.category;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative
        transition-all duration-300 ease-out
        ${isDragging ? 'opacity-50 scale-[1.02] shadow-2xl z-50' : ''}
        ${isActive ? 'bg-stone-50 dark:bg-stone-900/50' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Card Container */}
      <div className={`
        flex items-stretch gap-0
        border-b border-stone-100 dark:border-stone-800/50
        transition-colors duration-200
        ${isActive ? 'border-stone-200 dark:border-stone-700' : ''}
      `}>
        {/* Left: Time Column - Fixed Width */}
        <div className="flex-shrink-0 w-20 py-5 pl-4 pr-3 flex flex-col items-end justify-start border-r border-stone-100 dark:border-stone-800/50">
          {item.time ? (
            <span className="text-sm font-medium text-stone-800 dark:text-stone-200 tabular-nums">
              {formatTimeDisplay(item.time)}
            </span>
          ) : (
            <button
              onClick={() => onTimeChange?.(item.id, '09:00')}
              className="text-[11px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              + time
            </button>
          )}
          {item.parsedNotes?.duration && (
            <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatDuration(item.parsedNotes.duration)}
            </span>
          )}
        </div>

        {/* Center: Content */}
        <div className="flex-1 min-w-0 py-5 px-4 flex items-center gap-4">
          {/* Drag Handle - Only visible on hover */}
          <button
            {...attributes}
            {...listeners}
            className={`
              flex-shrink-0 p-1 cursor-grab active:cursor-grabbing
              transition-opacity duration-200
              ${isHovered ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <GripVertical className="w-4 h-4 text-stone-300 dark:text-stone-600" />
          </button>

          {/* Image/Icon Container - Asymmetric with overlap effect */}
          <div className="relative flex-shrink-0">
            <div className={`
              w-14 h-14 rounded-lg overflow-hidden
              bg-stone-100 dark:bg-stone-800
              ring-2 ring-white dark:ring-stone-900
              shadow-sm
              transition-all duration-300
              ${isHovered ? 'shadow-md scale-105' : ''}
            `}>
              {image ? (
                <img
                  src={image}
                  alt={item.title || ''}
                  className={`
                    w-full h-full object-cover
                    transition-all duration-500
                    ${isHovered ? 'grayscale-0 scale-105' : 'grayscale-[40%]'}
                  `}
                />
              ) : isFlight ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700">
                  <Plane className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700">
                  <MapPin className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                </div>
              )}
            </div>
            {/* Index badge - overlapping */}
            <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[10px] font-semibold flex items-center justify-center shadow-sm">
              {index + 1}
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-stone-900 dark:text-white truncate leading-tight">
              {item.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              {item.description && (
                <span className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  {item.description}
                </span>
              )}
              {category && (
                <>
                  {item.description && <span className="text-stone-300 dark:text-stone-600">·</span>}
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-medium">
                    {category}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Button - Clean reveal on hover */}
          <button
            onClick={() => onEdit?.(item)}
            className={`
              flex-shrink-0 p-2 rounded-lg
              transition-all duration-200
              ${isHovered
                ? 'opacity-100 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                : 'opacity-0'
              }
            `}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions Column */}
        <div className={`
          flex-shrink-0 flex items-center gap-1 px-3
          transition-opacity duration-200
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
          <button
            onClick={() => onEdit?.(item)}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4 text-stone-400 dark:text-stone-500" />
          </button>
          <button
            onClick={() => onRemove?.(item.id)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group/delete"
            title="Remove"
          >
            <Trash2 className="w-4 h-4 text-stone-400 dark:text-stone-500 group-hover/delete:text-red-500" />
          </button>
        </div>
      </div>

      {/* Active indicator - Subtle left border accent */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-stone-900 dark:bg-white" />
      )}
    </div>
  );
}
