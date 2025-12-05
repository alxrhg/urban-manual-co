'use client';

import React from 'react';
import {
  Coffee,
  Utensils,
  Dumbbell,
  Waves,
  Sparkles,
  Briefcase,
  Phone,
  ShoppingBag,
  Camera,
  Moon,
  Sun,
  Package,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { ActivityType } from '@/types/trip';

interface ItineraryMinimalRowProps {
  item: EnrichedItineraryItem;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

// Activity type to icon mapping
const activityIcons: Record<ActivityType | string, typeof Coffee> = {
  'nap': Moon,
  'pool': Waves,
  'spa': Sparkles,
  'gym': Dumbbell,
  'breakfast-at-hotel': Utensils,
  'getting-ready': Clock,
  'packing': Package,
  'free-time': Sun,
  'sunset': Sun,
  'checkout-prep': Package,
  'work': Briefcase,
  'call': Phone,
  'shopping-time': ShoppingBag,
  'photo-walk': Camera,
  'coffee': Coffee,
  'breakfast': Utensils,
  'custom': MoreHorizontal,
  'other': MoreHorizontal,
};

// Activity type to emoji mapping (for display)
const activityEmojis: Record<ActivityType | string, string> = {
  'nap': '😴',
  'pool': '🏊',
  'spa': '💆',
  'gym': '🏋️',
  'breakfast-at-hotel': '🍳',
  'getting-ready': '✨',
  'packing': '🧳',
  'free-time': '☀️',
  'sunset': '🌅',
  'checkout-prep': '📦',
  'work': '💼',
  'call': '📞',
  'shopping-time': '🛍️',
  'photo-walk': '📸',
  'coffee': '☕',
  'breakfast': '🍳',
  'custom': '📌',
  'other': '📌',
};

/**
 * ItineraryMinimalRow - Simple text row for lightweight items
 * Used for: breakfast, coffee, hotel activities, custom items, downtime
 */
export default function ItineraryMinimalRow({
  item,
  isActive = false,
  onClick,
  className = '',
}: ItineraryMinimalRowProps) {
  const notes = item.parsedNotes;
  const activityType = notes?.activityType || notes?.type || 'other';
  const time = item.time;
  const duration = notes?.duration;

  // Get icon and emoji
  const Icon = activityIcons[activityType] || MoreHorizontal;
  const emoji = activityEmojis[activityType] || '📌';

  // Format time
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes?.toString().padStart(2, '0')} ${period}`;
  };

  // Format duration
  const formatDuration = (mins?: number) => {
    if (!mins) return null;
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formattedTime = formatTime(time);
  const formattedDuration = formatDuration(duration);

  // Get location text if available
  const locationText = notes?.location || (notes?.linkedHotelId ? 'At hotel' : null);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all group
        ${isActive
          ? 'bg-stone-100 dark:bg-gray-800'
          : 'hover:bg-stone-50 dark:hover:bg-gray-800/50'
        }
        ${className}
      `}
    >
      {/* Emoji/Icon */}
      <span className="text-base flex-shrink-0 w-6 text-center">
        {emoji}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-stone-900 dark:text-white truncate">
            {item.title}
          </span>
          {locationText && (
            <span className="text-xs text-stone-400 dark:text-gray-500 truncate">
              {locationText}
            </span>
          )}
        </div>
        {notes?.raw && (
          <p className="text-xs text-stone-500 dark:text-gray-400 truncate mt-0.5">
            {notes.raw}
          </p>
        )}
      </div>

      {/* Time & Duration */}
      <div className="flex items-center gap-2 flex-shrink-0 text-right">
        {formattedTime && (
          <span className="text-xs text-stone-500 dark:text-gray-400">
            {formattedTime}
          </span>
        )}
        {formattedDuration && (
          <span className="text-xs text-stone-400 dark:text-gray-500 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-gray-800">
            {formattedDuration}
          </span>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Specialized Minimal Rows
// ============================================================================

interface BreakfastRowProps {
  hotelName: string;
  time?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * BreakfastRow - Minimal row for hotel breakfast
 */
export function BreakfastRow({ hotelName, time, onClick, className = '' }: BreakfastRowProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all
        hover:bg-stone-50 dark:hover:bg-gray-800/50
        ${className}
      `}
    >
      <span className="text-base flex-shrink-0 w-6 text-center">🍳</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-stone-900 dark:text-white">
          Breakfast
        </span>
        <span className="text-xs text-stone-400 dark:text-gray-500 ml-2">
          at {hotelName}
        </span>
      </div>
      {time && (
        <span className="text-xs text-stone-500 dark:text-gray-400">
          {time}
        </span>
      )}
    </button>
  );
}

interface CheckoutRowProps {
  hotelName: string;
  time?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * CheckoutRow - Minimal row for hotel checkout
 */
export function CheckoutRow({ hotelName, time, onClick, className = '' }: CheckoutRowProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all
        hover:bg-stone-50 dark:hover:bg-gray-800/50
        ${className}
      `}
    >
      <span className="text-base flex-shrink-0 w-6 text-center">🧳</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-stone-900 dark:text-white">
          Check-out
        </span>
        <span className="text-xs text-stone-400 dark:text-gray-500 ml-2">
          from {hotelName}
        </span>
      </div>
      {time && (
        <span className="text-xs text-stone-500 dark:text-gray-400">
          Before {time}
        </span>
      )}
    </button>
  );
}

interface CheckInRowProps {
  hotelName: string;
  time?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * CheckInRow - Minimal row for hotel check-in
 */
export function CheckInRow({ hotelName, time, onClick, className = '' }: CheckInRowProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all
        hover:bg-stone-50 dark:hover:bg-gray-800/50
        ${className}
      `}
    >
      <span className="text-base flex-shrink-0 w-6 text-center">🏨</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-stone-900 dark:text-white">
          Check-in
        </span>
        <span className="text-xs text-stone-400 dark:text-gray-500 ml-2">
          at {hotelName}
        </span>
      </div>
      {time && (
        <span className="text-xs text-stone-500 dark:text-gray-400">
          {time}
        </span>
      )}
    </button>
  );
}

interface NightStayRowProps {
  hotelName: string;
  hasBreakfast?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * NightStayRow - Minimal row for overnight stay indicator
 */
export function NightStayRow({ hotelName, hasBreakfast, onClick, className = '' }: NightStayRowProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all
        bg-stone-50 dark:bg-gray-800/50 hover:bg-stone-100 dark:hover:bg-gray-800
        ${className}
      `}
    >
      <span className="text-base flex-shrink-0 w-6 text-center">🌙</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-stone-900 dark:text-white">
          Overnight
        </span>
        <span className="text-xs text-stone-400 dark:text-gray-500 ml-2">
          at {hotelName}
        </span>
      </div>
      {hasBreakfast && (
        <span className="text-xs text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30">
          Breakfast included
        </span>
      )}
    </button>
  );
}
