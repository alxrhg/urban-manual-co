'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { MapPin, Clock, Calendar, Star, CheckCircle2 } from 'lucide-react';
import type { Destination } from '@/types/destination';

interface MorphingDragPreviewProps {
  destination: Destination;
  isOverTimeline: boolean;
  dayNumber: number | null;
}

// Get default time slot based on category
function getDefaultTimeSlot(category?: string | null): string {
  if (!category) return '14:00';
  const cat = category.toLowerCase();

  if (cat.includes('breakfast') || cat.includes('coffee') || cat.includes('bakery')) return '09:00';
  if (cat.includes('brunch')) return '10:30';
  if (cat.includes('museum') || cat.includes('gallery')) return '10:00';
  if (cat.includes('lunch')) return '12:30';
  if (cat.includes('park') || cat.includes('garden')) return '15:00';
  if (cat.includes('bar') || cat.includes('cocktail')) return '19:00';
  if (cat.includes('restaurant') || cat.includes('dining')) return '19:30';

  return '14:00';
}

// Get estimated duration based on category
function getEstimatedDuration(category?: string | null): number {
  if (!category) return 90;
  const cat = category.toLowerCase();

  if (cat.includes('coffee') || cat.includes('bakery')) return 30;
  if (cat.includes('cafe')) return 45;
  if (cat.includes('bar') || cat.includes('cocktail')) return 60;
  if (cat.includes('museum') || cat.includes('gallery')) return 120;
  if (cat.includes('restaurant') || cat.includes('dining')) return 90;
  if (cat.includes('park') || cat.includes('garden')) return 60;

  return 60;
}

export default function MorphingDragPreview({
  destination,
  isOverTimeline,
  dayNumber,
}: MorphingDragPreviewProps) {
  const timeSlot = useMemo(() => getDefaultTimeSlot(destination.category), [destination.category]);
  const duration = useMemo(() => getEstimatedDuration(destination.category), [destination.category]);

  // Card dimensions based on mode
  const cardWidth = isOverTimeline ? 'w-80' : 'w-72';

  return (
    <div
      className={`
        ${cardWidth}
        bg-white dark:bg-gray-800
        rounded-2xl
        shadow-2xl
        border-2
        overflow-hidden
        transition-all duration-300 ease-out
        ${isOverTimeline
          ? 'border-blue-500 ring-4 ring-blue-500/20'
          : 'border-gray-200 dark:border-gray-700'
        }
      `}
      style={{
        transform: isOverTimeline ? 'scale(1.02)' : 'scale(1)',
        transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Morphing Header - Shows time when over timeline */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-out
          ${isOverTimeline ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">{timeSlot}</p>
              <p className="text-blue-100 text-xs">{duration} min</p>
            </div>
          </div>
          {dayNumber && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-200" />
              <span className="text-white font-medium">Day {dayNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-3 p-3">
        {/* Image */}
        <div className={`
          relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0
          transition-all duration-300
          ${isOverTimeline ? 'w-16 h-16' : 'w-20 h-20'}
        `}>
          {destination.image || destination.image_thumbnail ? (
            <Image
              src={destination.image_thumbnail || destination.image || ''}
              alt={destination.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                {destination.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                {destination.neighborhood || destination.city}
              </p>
            </div>

            {/* Category Badge */}
            <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {destination.category?.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Rating */}
          {destination.rating && (
            <div className="flex items-center gap-1 mt-2">
              <img src="/google-logo.svg" alt="Google" className="w-3.5 h-3.5" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {destination.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Morphing Footer - Shows confirmation when over timeline */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-out
          ${isOverTimeline ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border-t border-green-100 dark:border-green-800 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Release to add to Day {dayNumber}
          </span>
        </div>
      </div>
    </div>
  );
}
