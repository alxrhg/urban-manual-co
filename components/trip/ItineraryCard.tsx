'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock, MapPin, Star, ChevronRight, GripVertical, X, Plane } from 'lucide-react';
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
 * ItineraryCard - Large format card with immersive imagery
 * Journal aesthetic: Full-bleed photos, elegant typography, subtle shadows
 */
export default function ItineraryCard({
  item,
  index,
  variant = 'default',
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

  const isFeatured = variant === 'featured' || index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative
        ${isDragging ? 'z-50 scale-[1.02]' : ''}
        ${isActive ? 'ring-2 ring-stone-500/50' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl
          bg-stone-100 dark:bg-stone-900
          transition-all duration-500 ease-out
          ${isFeatured ? 'aspect-[16/10]' : 'aspect-[4/3]'}
          ${isHovered ? 'shadow-2xl shadow-stone-900/20 dark:shadow-black/40' : 'shadow-lg shadow-stone-900/10 dark:shadow-black/20'}
        `}
      >
        {/* Image */}
        {image ? (
          <Image
            src={image}
            alt={item.title || 'Destination'}
            fill
            className={`
              object-cover transition-all duration-700
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              ${isHovered ? 'scale-105' : 'scale-100'}
            `}
            onLoad={() => setImageLoaded(true)}
          />
        ) : isFlight ? (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
            <Plane className="w-12 h-12 text-blue-400 dark:text-blue-300" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-stone-400 dark:text-stone-500" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Bar: Index + Actions */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between">
          {/* Index Badge */}
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-white/90 dark:bg-stone-900/80 backdrop-blur-sm flex items-center justify-center text-sm font-semibold text-stone-900 dark:text-white shadow-lg">
              {index + 1}
            </span>
            {item.time && (
              <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-stone-900/80 backdrop-blur-sm text-xs font-medium text-stone-700 dark:text-stone-300 shadow-lg flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeDisplay(item.time)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div
            className={`
              flex items-center gap-1 transition-opacity duration-200
              ${isHovered ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <button
              {...attributes}
              {...listeners}
              className="p-2 rounded-full bg-white/90 dark:bg-stone-900/80 backdrop-blur-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-grab active:cursor-grabbing shadow-lg transition-colors"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove?.(item.id)}
              className="p-2 rounded-full bg-white/90 dark:bg-stone-900/80 backdrop-blur-sm text-stone-600 dark:text-stone-400 hover:text-red-500 shadow-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {/* Category Tag */}
          {category && (
            <span className="inline-block mb-2 text-[10px] uppercase tracking-wider text-white/70 font-medium">
              {category}
            </span>
          )}

          {/* Title */}
          <h3 className={`
            font-medium text-white leading-tight mb-2
            ${isFeatured ? 'text-2xl md:text-3xl' : 'text-xl'}
          `}>
            {item.title}
          </h3>

          {/* Meta Row */}
          <div className="flex items-center gap-3 text-white/70">
            {neighborhood && (
              <span className="flex items-center gap-1 text-xs">
                <MapPin className="w-3 h-3" />
                {neighborhood}
              </span>
            )}
            {rating && (
              <span className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Click to Edit Overlay */}
        <button
          onClick={() => onEdit?.(item)}
          className={`
            absolute inset-0 z-10 flex items-center justify-center
            bg-black/0 hover:bg-black/10 transition-colors
            cursor-pointer
          `}
        >
          <span
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              bg-white/90 dark:bg-stone-900/80 backdrop-blur-sm
              text-sm font-medium text-stone-900 dark:text-white
              shadow-lg transition-all duration-300
              ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
          >
            View Details
            <ChevronRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    </div>
  );
}
