'use client';

import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface TripHealthIndicatorProps {
  itemCount: number;
  dayCount: number;
  hasHotel: boolean;
  hasFlight: boolean;
  status?: string;
  className?: string;
}

/**
 * TripHealthIndicator - Shows trip planning completeness
 * Displays visual indicators for trip readiness
 */
export default function TripHealthIndicator({
  itemCount,
  dayCount,
  hasHotel,
  hasFlight,
  status,
  className = '',
}: TripHealthIndicatorProps) {
  // Calculate health score
  const avgItemsPerDay = dayCount > 0 ? itemCount / dayCount : 0;
  const hasEnoughActivities = avgItemsPerDay >= 2;

  // Determine health status
  let healthStatus: 'good' | 'warning' | 'incomplete' = 'incomplete';
  let healthLabel = 'Needs planning';
  let healthColor = 'text-stone-400 dark:text-gray-500';
  let bgColor = 'bg-stone-100 dark:bg-gray-800';

  if (status === 'completed') {
    healthStatus = 'good';
    healthLabel = 'Complete';
    healthColor = 'text-green-600 dark:text-green-400';
    bgColor = 'bg-green-100 dark:bg-green-900/30';
  } else if (hasEnoughActivities && dayCount > 0) {
    if (hasHotel || hasFlight) {
      healthStatus = 'good';
      healthLabel = 'Ready';
      healthColor = 'text-green-600 dark:text-green-400';
      bgColor = 'bg-green-100 dark:bg-green-900/30';
    } else {
      healthStatus = 'warning';
      healthLabel = 'Almost ready';
      healthColor = 'text-amber-600 dark:text-amber-400';
      bgColor = 'bg-amber-100 dark:bg-amber-900/30';
    }
  } else if (itemCount > 0) {
    healthStatus = 'warning';
    healthLabel = 'In progress';
    healthColor = 'text-amber-600 dark:text-amber-400';
    bgColor = 'bg-amber-100 dark:bg-amber-900/30';
  }

  const Icon = healthStatus === 'good'
    ? CheckCircle2
    : healthStatus === 'warning'
    ? Clock
    : AlertCircle;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${bgColor}`}>
        <Icon className={`w-3 h-3 ${healthColor}`} />
      </div>
      <span className={`text-[10px] font-medium ${healthColor}`}>
        {healthLabel}
      </span>
    </div>
  );
}

/**
 * Mini version for trip cards - just shows progress dots
 */
export function TripHealthDots({
  itemCount,
  dayCount,
  hasHotel,
  hasFlight,
}: Omit<TripHealthIndicatorProps, 'status' | 'className'>) {
  const avgItemsPerDay = dayCount > 0 ? itemCount / dayCount : 0;

  // Calculate progress (0-4 dots)
  const dots = [
    itemCount > 0, // Has any items
    avgItemsPerDay >= 1, // At least 1 item per day
    avgItemsPerDay >= 2, // At least 2 items per day
    hasHotel || hasFlight, // Has logistics
  ];

  const filledCount = dots.filter(Boolean).length;

  return (
    <div className="flex items-center gap-0.5">
      {dots.map((filled, i) => (
        <div
          key={i}
          className={`w-1 h-1 rounded-full ${
            filled
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-stone-300 dark:bg-gray-600'
          }`}
        />
      ))}
      {filledCount < 4 && (
        <span className="ml-1 text-[9px] text-stone-400 dark:text-gray-500">
          {Math.round((filledCount / 4) * 100)}%
        </span>
      )}
    </div>
  );
}
