'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock, MapPin, Star, GripVertical, X, Plane } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface ItineraryCardProps {
  item: EnrichedItineraryItem;
  index: number;
  variant?: 'default' | 'compact' | 'featured';
  onEdit?: (item: EnrichedItineraryItem) => void;
  onRemove?: (id: string) => void;
  isActive?: boolean;
}

/**
 * ItineraryCard - Compact row-based card for itinerary items
 * Clean, scannable design with thumbnail, key info, and drag handle
 */
export default function ItineraryCard({
  item,
  index,
  onEdit,
  onRemove,
  isActive = false,
}: ItineraryCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
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
  const rating = item.destination?.rating;
  const neighborhood = item.destination?.neighborhood;
  const isFlight = item.parsedNotes?.type === 'flight';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative
        ${isDragging ? 'z-50 opacity-50' : ''}
        ${isActive ? 'ring-2 ring-stone-400/50 rounded-2xl' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => onEdit?.(item)}
        className={`
          w-full flex items-center gap-3 p-3
          bg-white dark:bg-stone-900
          hover:bg-stone-50 dark:hover:bg-stone-800
          border border-stone-200 dark:border-stone-800
          rounded-2xl
          transition-all duration-200
          text-left
        `}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={`
            flex-shrink-0 p-1.5 -ml-1 cursor-grab active:cursor-grabbing
            text-stone-300 dark:text-stone-600
            hover:text-stone-500 dark:hover:text-stone-400
            transition-opacity duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Index Badge */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
            {index + 1}
          </span>
        </div>

        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
          {image ? (
            <Image
              src={image}
              alt={item.title || 'Destination'}
              width={64}
              height={64}
              className={`
                w-full h-full object-cover
                transition-opacity duration-300
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={() => setImageLoaded(true)}
            />
          ) : isFlight ? (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
              <Plane className="w-6 h-6 text-blue-400 dark:text-blue-300" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-stone-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-sm font-medium text-stone-900 dark:text-white truncate">
            {item.title}
          </h3>

          {/* Meta Row 1: Neighborhood & Category */}
          <div className="flex items-center gap-2 mt-0.5">
            {neighborhood && (
              <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {neighborhood}
              </span>
            )}
            {category && (
              <>
                {neighborhood && <span className="text-stone-300 dark:text-stone-600">·</span>}
                <span className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  {category}
                </span>
              </>
            )}
          </div>

          {/* Meta Row 2: Time & Rating */}
          <div className="flex items-center gap-2 mt-1">
            {item.time && (
              <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                <Clock className="w-3 h-3" />
                {formatTimeDisplay(item.time)}
              </span>
            )}
            {rating && (
              <>
                {item.time && <span className="text-stone-300 dark:text-stone-600">·</span>}
                <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {rating.toFixed(1)}
                </span>
              </>
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
            flex-shrink-0 p-2 rounded-full
            text-stone-300 dark:text-stone-600
            hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
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
