'use client';

import Image from 'next/image';
import { UtensilsCrossed, Clock, MapPin, Star } from 'lucide-react';

interface MealCardProps {
  name: string;
  type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time?: string;
  location?: string;
  neighborhood?: string;
  rating?: number;
  image?: string;
  includedWithHotel?: boolean;
  notes?: string;
  compact?: boolean;
}

/**
 * MealCard - Compact meal/dining card with cohesive design
 * Layout: Meal header (name + type) → Time/location → Rating
 * Matches FlightStatusCard and LodgingCard design pattern
 */
export default function MealCard({
  name,
  type = 'breakfast',
  time,
  location,
  neighborhood,
  rating,
  image,
  includedWithHotel,
  notes,
  compact = true,
}: MealCardProps) {
  // Format time for display
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr;
  };

  // Get meal type label
  const getMealLabel = () => {
    switch (type) {
      case 'breakfast': return 'Breakfast';
      case 'lunch': return 'Lunch';
      case 'dinner': return 'Dinner';
      case 'snack': return 'Snack';
      default: return 'Meal';
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-stone-100 dark:bg-gray-800/50 flex gap-4">
      {/* Thumbnail or Icon */}
      <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized={image.startsWith('/api/')}
          />
        ) : (
          <UtensilsCrossed className="w-5 h-5 text-amber-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* REGION 1: Meal Header */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-stone-900 dark:text-white leading-tight truncate">
              {name}
            </h3>
            {includedWithHotel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
                Included
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-gray-400 mt-0.5">
            {getMealLabel()}
          </p>
        </div>

        {/* REGION 2: Time & Location */}
        <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-gray-300 mb-2">
          {time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400" />
              {formatTime(time)}
            </span>
          )}
          {time && (location || neighborhood) && (
            <span className="text-stone-300 dark:text-gray-600">•</span>
          )}
          {(location || neighborhood) && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-stone-400 flex-shrink-0" />
              <span className="truncate">{neighborhood || location}</span>
            </span>
          )}
        </div>

        {/* REGION 3: Rating */}
        {rating && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-stone-600 dark:text-gray-300">
              {rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Notes (if any) */}
        {notes && (
          <div className="mt-2 pt-2 border-t border-stone-200 dark:border-gray-700">
            <p className="text-[10px] text-stone-500 dark:text-gray-400 line-clamp-2">
              {notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
