'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, GripVertical, X, Star, MapPin, Plane } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TripItemCardProps {
  item: EnrichedItineraryItem;
  index: number;
  onEdit?: (item: EnrichedItineraryItem) => void;
  onRemove?: (id: string) => void;
  isActive?: boolean;
}

/**
 * TripItemCard - Compact row card with stone palette
 * Uses: rounded-2xl borders, 64px thumbnails, text-sm/text-xs typography
 */
export default function TripItemCard({
  item,
  index,
  onEdit,
  onRemove,
  isActive = false,
}: TripItemCardProps) {
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

  const image = item.destination?.image || item.destination?.image_thumbnail || item.parsedNotes?.image;
  const category = item.parsedNotes?.category || item.destination?.category;
  const neighborhood = item.destination?.neighborhood;
  const rating = item.destination?.rating;
  const isFlight = item.parsedNotes?.type === 'flight';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative
        ${isDragging ? 'z-50 opacity-50' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => onEdit?.(item)}
        className={`
          w-full flex items-center gap-4 p-3
          hover:bg-stone-50 dark:hover:bg-stone-800
          rounded-2xl transition-colors text-left
          ${isActive ? 'bg-stone-50 dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700' : ''}
        `}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={`
            flex-shrink-0 cursor-grab active:cursor-grabbing p-1
            transition-opacity duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-stone-300 dark:text-stone-600" />
        </div>

        {/* Index Badge */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">{index + 1}</span>
        </div>

        {/* Thumbnail - 64px rounded-xl */}
        <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
          {image ? (
            <Image
              src={image}
              alt={item.title || 'Destination'}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : isFlight ? (
            <div className="w-full h-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/30">
              <Plane className="w-6 h-6 text-blue-400" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-stone-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate text-stone-900 dark:text-white">
            {item.title}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-1.5">
            {neighborhood && <span>{neighborhood}</span>}
            {neighborhood && category && <span>•</span>}
            {category && <span className="capitalize">{category}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {item.time && (
              <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeDisplay(item.time)}
              </span>
            )}
            {rating && (
              <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current text-amber-400" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(item.id);
          }}
          className={`
            flex-shrink-0 p-2 rounded-xl
            text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
            transition-all duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </button>
    </div>
  );
}
