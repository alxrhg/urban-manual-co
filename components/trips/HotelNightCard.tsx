'use client';

import { Moon, Bed, Star } from 'lucide-react';

interface HotelNightCardProps {
  hotelName: string;
  roomNumber?: string;
  nightNumber: number;
  totalNights: number;
  date?: string;
  nextDate?: string;
  compact?: boolean;
}

/**
 * HotelNightCard - The overnight stay moment
 * Design: Dreamy starry night with deep indigo palette
 * Feeling: Rest, comfort, "sleep well"
 */
export default function HotelNightCard({
  hotelName,
  roomNumber,
  nightNumber,
  totalNights,
  date,
  nextDate,
  compact = false,
}: HotelNightCardProps) {
  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Generate random star positions (deterministic based on night number)
  const stars = [
    { top: '8%', left: '12%', size: 'w-1 h-1', opacity: 'opacity-60' },
    { top: '15%', left: '35%', size: 'w-0.5 h-0.5', opacity: 'opacity-40' },
    { top: '10%', left: '58%', size: 'w-1 h-1', opacity: 'opacity-50' },
    { top: '20%', left: '78%', size: 'w-0.5 h-0.5', opacity: 'opacity-30' },
    { top: '5%', left: '88%', size: 'w-1 h-1', opacity: 'opacity-40' },
    { top: '25%', left: '25%', size: 'w-0.5 h-0.5', opacity: 'opacity-50' },
    { top: '30%', left: '92%', size: 'w-0.5 h-0.5', opacity: 'opacity-60' },
  ];

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 dark:from-indigo-950 dark:via-purple-950 dark:to-indigo-950">
        {/* Stars */}
        <div className="absolute inset-0">
          {stars.slice(0, 4).map((star, i) => (
            <div
              key={i}
              className={`absolute ${star.size} rounded-full bg-white ${star.opacity}`}
              style={{ top: star.top, left: star.left }}
            />
          ))}
        </div>

        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Moon className="w-4 h-4 text-indigo-200" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Night {nightNumber} of {totalNights}
                </p>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  {hotelName}
                  {roomNumber && ` · Room ${roomNumber}`}
                </p>
              </div>
            </div>
            {date && nextDate && (
              <div className="text-right">
                <p className="text-xs text-indigo-200/60">
                  {formatDate(date)} → {formatDate(nextDate)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 dark:from-indigo-950 dark:via-purple-950 dark:to-gray-950">
      {/* Stars background */}
      <div className="absolute inset-0">
        {stars.map((star, i) => (
          <div
            key={i}
            className={`absolute ${star.size} rounded-full bg-white ${star.opacity} animate-pulse`}
            style={{
              top: star.top,
              left: star.left,
              animationDelay: `${i * 0.5}s`,
              animationDuration: '3s'
            }}
          />
        ))}
      </div>

      {/* Subtle moon glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-400/10 rounded-full blur-3xl" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Moon className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/80">
                Overnight Stay
              </p>
              <p className="text-xl font-bold text-white">
                Night {nightNumber} <span className="text-indigo-300/60 font-normal">of {totalNights}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Hotel Info Card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Bed className="w-5 h-5 text-indigo-200" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{hotelName}</p>
              {roomNumber && (
                <p className="text-xs text-indigo-200/70 mt-0.5">Room {roomNumber}</p>
              )}
            </div>
            {date && nextDate && (
              <div className="text-right">
                <p className="text-xs text-indigo-200/60">
                  {formatDate(date)}
                </p>
                <p className="text-xs text-indigo-200/40">
                  → {formatDate(nextDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Night progress indicator */}
        <div className="mt-4 flex items-center gap-2">
          {Array.from({ length: totalNights }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i < nightNumber
                  ? 'bg-indigo-400'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-indigo-300/60 mt-2 text-center">
          {totalNights - nightNumber} {totalNights - nightNumber === 1 ? 'night' : 'nights'} remaining
        </p>
      </div>
    </div>
  );
}
