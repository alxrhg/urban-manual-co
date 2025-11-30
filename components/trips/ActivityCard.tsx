'use client';

import {
  BedDouble, Waves, Sparkles, Dumbbell, Coffee, Shirt,
  Package, Clock, Sun, Briefcase, Phone, Camera, ShoppingBag
} from 'lucide-react';
import type { ActivityType } from '@/types/trip';
import { formatDuration } from '@/lib/utils/time-calculations';

interface ActivityCardProps {
  activityType: ActivityType;
  title?: string;
  duration?: number;
  location?: string;
  notes?: string;
  time?: string;
  compact?: boolean;
}

// Activity type configurations
const ACTIVITY_CONFIG: Record<ActivityType, { icon: typeof BedDouble; label: string; color: string; bg: string }> = {
  'nap': { icon: BedDouble, label: 'Nap / Rest', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  'pool': { icon: Waves, label: 'Pool Time', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  'spa': { icon: Sparkles, label: 'Spa', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  'gym': { icon: Dumbbell, label: 'Gym / Workout', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  'breakfast-at-hotel': { icon: Coffee, label: 'Hotel Breakfast', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  'getting-ready': { icon: Shirt, label: 'Getting Ready', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  'packing': { icon: Package, label: 'Packing', color: 'text-stone-500', bg: 'bg-stone-50 dark:bg-stone-800/50' },
  'free-time': { icon: Clock, label: 'Free Time', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  'sunset': { icon: Sun, label: 'Sunset', color: 'text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  'checkout-prep': { icon: Package, label: 'Check-out Prep', color: 'text-stone-500', bg: 'bg-stone-50 dark:bg-stone-800/50' },
  'work': { icon: Briefcase, label: 'Work Time', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'call': { icon: Phone, label: 'Call / Meeting', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  'shopping-time': { icon: ShoppingBag, label: 'Shopping', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  'photo-walk': { icon: Camera, label: 'Photo Walk', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  'other': { icon: Clock, label: 'Activity', color: 'text-stone-500', bg: 'bg-stone-50 dark:bg-stone-800/50' },
};

/**
 * ActivityCard - Compact card for downtime/hotel activities
 */
export default function ActivityCard({
  activityType,
  title,
  duration,
  location,
  notes,
  time,
  compact = true,
}: ActivityCardProps) {
  const config = ACTIVITY_CONFIG[activityType] || ACTIVITY_CONFIG['other'];
  const Icon = config.icon;
  const displayTitle = title || config.label;

  return (
    <div className={`rounded-2xl ${config.bg} overflow-hidden`}>
      <div className="p-4">
        {/* Header with icon and title */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-stone-900 dark:text-white leading-tight">
              {displayTitle}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {duration && (
                <span className="text-xs text-stone-500 dark:text-gray-400">
                  {formatDuration(duration)}
                </span>
              )}
              {location && (
                <span className="text-xs text-stone-400 dark:text-gray-500">
                  · {location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <p className="mt-2 text-xs text-stone-500 dark:text-gray-400 line-clamp-2 pl-[52px]">
            {notes}
          </p>
        )}
      </div>
    </div>
  );
}

// Export activity types for use in other components
export { ACTIVITY_CONFIG };
