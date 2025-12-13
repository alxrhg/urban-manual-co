'use client';

import { Luggage, Clock, Calendar, CheckCircle2, Package } from 'lucide-react';

interface HotelCheckOutCardProps {
  hotelName: string;
  checkOutTime?: string;
  checkOutDate?: string;
  checkInDate?: string;
  totalNights?: number;
  roomNumber?: string;
  lateCheckOut?: boolean;
  luggageStorage?: boolean;
  luggageStorageUntil?: string;
  expressCheckout?: boolean;
  compact?: boolean;
}

/**
 * HotelCheckOutCard - The departure moment
 * Design: Soft stone/neutral with subtle coral accent
 * Feeling: Closure, gratitude, "thank you for staying"
 */
export default function HotelCheckOutCard({
  hotelName,
  checkOutTime = '11:00',
  checkOutDate,
  checkInDate,
  totalNights,
  roomNumber,
  lateCheckOut = false,
  luggageStorage = false,
  luggageStorageUntil,
  expressCheckout = false,
  compact = false,
}: HotelCheckOutCardProps) {
  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate nights if dates provided but totalNights not
  const calculateNights = () => {
    if (totalNights) return totalNights;
    if (!checkInDate || !checkOutDate) return null;
    try {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : null;
    } catch {
      return null;
    }
  };

  const nights = calculateNights();

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-100 to-stone-50 dark:from-gray-800/50 dark:to-gray-800/30 border-r-4 border-rose-300 dark:border-rose-400/50">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-stone-200 dark:bg-gray-700 flex items-center justify-center">
                <Luggage className="w-4 h-4 text-stone-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-white">
                  Check-out
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-stone-500 dark:text-gray-400">
                    {hotelName}
                  </span>
                  {nights && (
                    <span className="text-[10px] text-stone-400 dark:text-gray-500">
                      · {nights} {nights === 1 ? 'night' : 'nights'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-900 dark:text-white">
                {checkOutTime}
              </p>
              {lateCheckOut && (
                <p className="text-[10px] text-rose-500 dark:text-rose-400">
                  Late checkout
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-100 via-stone-50 to-white dark:from-gray-800/50 dark:via-gray-800/30 dark:to-gray-900/30">
      {/* Subtle departure pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 dark:opacity-10">
        <Luggage className="w-full h-full text-stone-600" />
      </div>

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-stone-200 dark:bg-gray-700 flex items-center justify-center shadow-sm">
            <Luggage className="w-5 h-5 text-stone-500 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-gray-400">
              Check-Out
            </p>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-white">
              {hotelName}
            </h3>
          </div>
        </div>

        {/* Time and Summary Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Check-out Time */}
          <div className="bg-white dark:bg-gray-900/50 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                Departure
              </p>
            </div>
            <p className="text-xl font-bold text-stone-900 dark:text-white">
              {checkOutTime}
            </p>
            {checkOutDate && (
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                {formatDate(checkOutDate)}
              </p>
            )}
          </div>

          {/* Stay Summary */}
          <div className="bg-white dark:bg-gray-900/50 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                Your Stay
              </p>
            </div>
            <p className="text-xl font-bold text-stone-900 dark:text-white">
              {nights ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : '—'}
            </p>
            {checkInDate && checkOutDate && (
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                {formatDate(checkInDate)} – {formatDate(checkOutDate)}
              </p>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {lateCheckOut && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Late check-out confirmed</span>
            </div>
          )}

          {luggageStorage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-300 text-xs">
              <Package className="w-4 h-4" />
              <span>
                Luggage storage available
                {luggageStorageUntil && ` until ${luggageStorageUntil}`}
              </span>
            </div>
          )}

          {expressCheckout && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-300 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Express checkout via app</span>
            </div>
          )}
        </div>

        {/* Room number footer */}
        {roomNumber && (
          <div className="mt-4 pt-3 border-t border-stone-200 dark:border-gray-700">
            <p className="text-[10px] text-stone-400 dark:text-gray-500">
              Room {roomNumber}
            </p>
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className="h-1 bg-gradient-to-r from-transparent via-rose-300 to-rose-400 dark:via-rose-400/50 dark:to-rose-500/50" />
    </div>
  );
}
