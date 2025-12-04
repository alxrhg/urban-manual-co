'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export type HotelActivitySubtype =
  | 'check_in'
  | 'checkout'
  | 'breakfast'
  | 'pool'
  | 'spa'
  | 'gym'
  | 'get_ready'
  | 'rest';

const ACTIVITY_ICONS: Record<HotelActivitySubtype, string> = {
  check_in: '🏨',
  checkout: '📦',
  breakfast: '☕',
  pool: '🏊',
  spa: '💆',
  gym: '🏋️',
  get_ready: '🚿',
  rest: '💤',
};

interface MinimalActivityCardProps {
  time: string;
  subtype: HotelActivitySubtype;
  label: string;
  sublabel?: string;
  onRemove?: () => void;
}

/**
 * MinimalActivityCard - Ultra-light inline card for hotel-related activities
 * No border, minimal visual weight - just timeline dot, time, emoji, label
 */
export default function MinimalActivityCard({
  time,
  subtype,
  label,
  sublabel,
  onRemove,
}: MinimalActivityCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const icon = ACTIVITY_ICONS[subtype] || '📍';

  return (
    <div
      className="group flex items-center gap-3 py-2 px-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Timeline dot */}
      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />

      {/* Time */}
      <span className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400 tabular-nums w-12">
        {time}
      </span>

      {/* Emoji icon */}
      <span className="flex-shrink-0 text-base" role="img" aria-label={subtype}>
        {icon}
      </span>

      {/* Label and sublabel */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {label}
        </span>
        {sublabel && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-sm text-gray-400 dark:text-gray-500 truncate">
              {sublabel}
            </span>
          </>
        )}
      </div>

      {/* Remove button - visible on hover */}
      {onRemove && (
        <button
          onClick={onRemove}
          className={`
            flex-shrink-0 p-1 rounded-full
            text-gray-300 dark:text-gray-600
            hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
            transition-all duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
          aria-label={`Remove ${label}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
