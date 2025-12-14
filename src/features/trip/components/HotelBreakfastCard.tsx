'use client';

import { Coffee, Sun, Clock, MapPin, Utensils, Check } from 'lucide-react';

interface HotelBreakfastCardProps {
  hotelName: string;
  restaurantName?: string;
  floor?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  included?: boolean;
  breakfastType?: 'buffet' | 'continental' | 'american' | 'a-la-carte' | string;
  dressCode?: string;
  compact?: boolean;
}

/**
 * HotelBreakfastCard - The morning meal moment
 * Design: Warm sunrise gradient with orange/cream palette
 * Feeling: Fresh start, energy, "good morning"
 */
export default function HotelBreakfastCard({
  hotelName,
  restaurantName,
  floor,
  startTime = '7:00',
  endTime = '10:00',
  date,
  included = true,
  breakfastType = 'buffet',
  dressCode,
  compact = false,
}: HotelBreakfastCardProps) {
  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatBreakfastType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
  };

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-stone-100 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-gray-800/50">
        {/* Sunrise accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-300 via-amber-300 to-yellow-200" />

        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/50 dark:to-amber-900/50 flex items-center justify-center">
                <Coffee className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-white">
                  Breakfast {restaurantName && `· ${restaurantName}`}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {floor && (
                    <span className="text-xs text-stone-500 dark:text-gray-400">
                      {floor}
                    </span>
                  )}
                  {included && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" />
                      Included
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-900 dark:text-white">
                {startTime}–{endTime}
              </p>
              {date && (
                <p className="text-[10px] text-stone-500 dark:text-gray-400">
                  {formatDate(date)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-stone-50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-gray-800/50">
      {/* Sunrise gradient header */}
      <div className="h-2 bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200" />

      {/* Decorative sun rays */}
      <div className="absolute top-0 right-4 w-24 h-24 opacity-10">
        <Sun className="w-full h-full text-orange-500" />
      </div>

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/50 dark:to-amber-900/50 flex items-center justify-center shadow-sm">
            <Coffee className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Breakfast
            </p>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-white">
              {restaurantName || hotelName}
            </h3>
          </div>
        </div>

        {/* Location and Time */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Time Window */}
          <div className="bg-white dark:bg-gray-900/50 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                Serving
              </p>
            </div>
            <p className="text-lg font-bold text-stone-900 dark:text-white">
              {startTime}–{endTime}
            </p>
            {date && (
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                {formatDate(date)}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="bg-white dark:bg-gray-900/50 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="w-3.5 h-3.5 text-stone-400" />
              <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                Style
              </p>
            </div>
            <p className="text-lg font-bold text-stone-900 dark:text-white">
              {formatBreakfastType(breakfastType)}
            </p>
            {included && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Included with stay
              </p>
            )}
          </div>
        </div>

        {/* Location */}
        {floor && (
          <div className="flex items-start gap-2 text-xs text-stone-500 dark:text-gray-400 mb-3">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{floor} {restaurantName && `· ${restaurantName}`}</span>
          </div>
        )}

        {/* Dress Code */}
        {dressCode && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs">
            Dress code: {dressCode}
          </div>
        )}
      </div>
    </div>
  );
}
