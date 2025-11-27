'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, MapPin, Plane, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import { formatTimeDisplay, formatDuration } from '@/lib/utils/time-calculations';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TimeBlockCardProps {
  item: EnrichedItineraryItem;
  onRemove?: (id: string) => void;
  onEdit?: (item: EnrichedItineraryItem) => void;
  onTimeChange?: (id: string, time: string) => void;
  isActive?: boolean;
  className?: string;
}

/**
 * TimeBlockCard - Minimalist row layout for itinerary items
 * Lovably style: horizontal row, grayscale image, hover actions
 */
export default function TimeBlockCard({
  item,
  onRemove,
  onEdit,
  onTimeChange,
  isActive = false,
  className = '',
}: TimeBlockCardProps) {
  const [showActions, setShowActions] = useState(false);

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
        group relative flex items-center gap-4 p-4
        bg-white dark:bg-[#0a0a0a]
        border border-transparent
        hover:border-gray-100 dark:hover:border-gray-900
        rounded-sm transition-all duration-200
        ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}
        ${isActive ? 'ring-1 ring-gray-900 dark:ring-white' : ''}
        ${className}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-700" />
      </button>

      {/* Time */}
      <div className="flex-shrink-0 w-16 text-right">
        {item.time ? (
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatTimeDisplay(item.time)}
          </span>
        ) : (
          <button
            onClick={() => onTimeChange?.(item.id, '09:00')}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            + time
          </button>
        )}
      </div>

      {/* Image or Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded-sm overflow-hidden bg-gray-100 dark:bg-gray-900">
        {image ? (
          <img
            src={image}
            alt={item.title || ''}
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
          />
        ) : isFlight ? (
          <div className="w-full h-full flex items-center justify-center">
            <Plane className="w-5 h-5 text-gray-400" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white truncate">
          {item.title}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          {item.description && (
            <span className="text-xs text-gray-500 truncate">
              {item.description}
            </span>
          )}
          {category && (
            <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600">
              {category}
            </span>
          )}
        </div>
      </div>

      {/* Duration Badge */}
      {item.parsedNotes?.duration && (
        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{formatDuration(item.parsedNotes.duration)}</span>
        </div>
      )}

      {/* Actions */}
      <div
        className={`
          flex-shrink-0 flex items-center gap-1
          transition-opacity duration-200
          ${showActions ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <button
          onClick={() => onEdit?.(item)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-sm transition-colors"
          title="Edit"
        >
          <Edit2 className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => onRemove?.(item.id)}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-colors"
          title="Remove"
        >
          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
        </button>
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-sm transition-colors"
          title="More"
        >
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
