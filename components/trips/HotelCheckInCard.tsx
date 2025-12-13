'use client';

import { KeyRound, Clock, MapPin, Sparkles } from 'lucide-react';

interface HotelCheckInCardProps {
  hotelName: string;
  checkInTime?: string;
  checkInDate?: string;
  roomNumber?: string;
  roomType?: string;
  floor?: string;
  earlyCheckIn?: boolean;
  address?: string;
  compact?: boolean;
}

/**
 * HotelCheckInCard - The arrival moment
 * Design: Key card aesthetic with warm amber accents
 * Feeling: Welcome, anticipation, "your room is ready"
 */
export default function HotelCheckInCard({
  hotelName,
  checkInTime = '15:00',
  checkInDate,
  roomNumber,
  roomType,
  floor,
  earlyCheckIn = false,
  address,
  compact = false,
}: HotelCheckInCardProps) {
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

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-stone-100 dark:from-amber-950/30 dark:to-gray-800/50 border-l-4 border-amber-400 dark:border-amber-500">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-white">
                  {hotelName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {roomNumber && (
                    <span className="text-xs text-stone-600 dark:text-gray-400">
                      Room {roomNumber}
                    </span>
                  )}
                  {earlyCheckIn && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-3 h-3" />
                      Early check-in
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-900 dark:text-white">
                {checkInTime}
              </p>
              {checkInDate && (
                <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                  Check-in
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-stone-50 to-stone-100 dark:from-amber-950/20 dark:via-gray-800/50 dark:to-gray-800/50">
      {/* Decorative key pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 dark:opacity-10">
        <KeyRound className="w-full h-full text-amber-600" />
      </div>

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shadow-sm">
            <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Check-In
            </p>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-white">
              {hotelName}
            </h3>
          </div>
        </div>

        {/* Time and Room Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Check-in Time */}
          <div className="bg-white dark:bg-gray-900/50 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wide">
                Arrival
              </p>
            </div>
            <p className="text-xl font-bold text-stone-900 dark:text-white">
              {checkInTime}
            </p>
            {checkInDate && (
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                {formatDate(checkInDate)}
              </p>
            )}
          </div>

          {/* Room Info */}
          <div className="bg-white dark:bg-gray-900/50 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Room
            </p>
            <p className="text-xl font-bold text-stone-900 dark:text-white">
              {roomNumber || '—'}
            </p>
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
              {floor ? `${floor} Floor` : ''} {roomType ? `· ${roomType}` : ''}
            </p>
          </div>
        </div>

        {/* Address */}
        {address && (
          <div className="flex items-start gap-2 text-xs text-stone-500 dark:text-gray-400 mb-3">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </div>
        )}

        {/* Early Check-in Badge */}
        {earlyCheckIn && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Early check-in confirmed
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-transparent" />
    </div>
  );
}
