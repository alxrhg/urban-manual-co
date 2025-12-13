'use client';

import {
  Clock,
  MapPin,
  Armchair,
  Coffee,
  Dumbbell,
  Waves,
  Sparkles,
  Plane,
  ShieldCheck,
  Ticket,
  DoorOpen,
} from 'lucide-react';
import type { ItineraryItem, HotelBooking, TripSettings } from './ItineraryCard';
import { formatDuration } from '@/lib/utils/time-calculations';

interface MinimalActivityCardProps {
  item: ItineraryItem;
  hotel?: HotelBooking;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

// Map activity types to icons and colors
const activityConfig: Record<
  string,
  { icon: typeof Clock; color: string; bgColor: string; label?: string }
> = {
  // Hotel activities
  breakfast: {
    icon: Coffee,
    color: 'text-orange-500 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
  },
  pool: {
    icon: Waves,
    color: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
  },
  spa: {
    icon: Sparkles,
    color: 'text-purple-500 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
  },
  gym: {
    icon: Dumbbell,
    color: 'text-green-500 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
  },
  lounge: {
    icon: Armchair,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
  },
  get_ready: {
    icon: Clock,
    color: 'text-stone-500 dark:text-gray-400',
    bgColor: 'bg-stone-50 dark:bg-gray-800/30',
  },
  rest: {
    icon: Clock,
    color: 'text-indigo-500 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
  },
  // Airport activities
  security: {
    icon: ShieldCheck,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    label: 'Security',
  },
  checkin_counter: {
    icon: Ticket,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-900/30',
    label: 'Check-in',
  },
  boarding: {
    icon: Plane,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-900/30',
    label: 'Boarding',
  },
};

/**
 * MinimalActivityCard - Compact card for hotel and airport activities
 * Used for: hotel_activity, airport_activity categories
 * Shows minimal info: title, duration, location hint
 * Special styling for lounge access and specific activity types
 */
export default function MinimalActivityCard({
  item,
  hotel,
  isSelected,
  onSelect,
  tripSettings,
}: MinimalActivityCardProps) {
  const notes = item.parsedNotes;
  const isHotelActivity = item.category === 'hotel_activity';
  const isAirportActivity = item.category === 'airport_activity';

  // Determine activity type from notes or title
  const activityType =
    notes?.hotelItemType ||
    notes?.airportActivityType ||
    (item.title?.toLowerCase().includes('lounge') ? 'lounge' : null) ||
    (item.title?.toLowerCase().includes('breakfast') ? 'breakfast' : null) ||
    (item.title?.toLowerCase().includes('pool') ? 'pool' : null) ||
    (item.title?.toLowerCase().includes('gym') ? 'gym' : null) ||
    (item.title?.toLowerCase().includes('spa') ? 'spa' : null) ||
    (item.title?.toLowerCase().includes('security') ? 'security' : null) ||
    (item.title?.toLowerCase().includes('boarding') ? 'boarding' : null);

  // Get config for this activity type
  const config = activityType ? activityConfig[activityType] : null;
  const Icon = config?.icon || Clock;
  const iconColor = config?.color || 'text-stone-400 dark:text-gray-500';
  const bgColor = config?.bgColor || 'bg-stone-50 dark:bg-gray-800/30';

  // Location info
  const location =
    notes?.location ||
    notes?.loungeName ||
    notes?.loungeLocation ||
    (isHotelActivity ? hotel?.name : null) ||
    (isAirportActivity ? 'Airport' : null);

  // Check if this is a lounge activity (special treatment)
  const isLounge = activityType === 'lounge';
  const loungeName = notes?.loungeName || (isLounge ? item.title : null);
  const loungeLocation = notes?.loungeLocation;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-xl transition-all duration-200
        ${bgColor}
        ${isSelected ? 'ring-2 ring-stone-300 dark:ring-gray-600' : 'hover:opacity-90'}
      `}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Activity icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isLounge ? 'bg-amber-100 dark:bg-amber-800/50' : 'bg-white/60 dark:bg-gray-700/50'
          }`}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-stone-700 dark:text-gray-300 truncate">
            {item.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            {notes?.duration && (
              <span className="text-xs text-stone-500 dark:text-gray-400">
                {formatDuration(notes.duration)}
              </span>
            )}
            {location && (
              <span className="text-xs text-stone-400 dark:text-gray-500 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                {location}
              </span>
            )}
          </div>

          {/* Lounge-specific info */}
          {isLounge && loungeLocation && loungeLocation !== location && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <DoorOpen className="w-3 h-3" />
              {loungeLocation}
            </p>
          )}
        </div>

        {/* Lounge access badge */}
        {isLounge && (
          <div className="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-800/50">
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
              Access
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
