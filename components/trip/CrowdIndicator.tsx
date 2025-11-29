'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';

interface CrowdIndicatorProps {
  category?: string;
  time?: string | null;
  compact?: boolean;
  className?: string;
}

// Peak hours by category
const PEAK_HOURS: Record<string, { peak: number[]; quiet: number[] }> = {
  restaurant: { peak: [12, 13, 19, 20, 21], quiet: [14, 15, 16, 17, 18] },
  cafe: { peak: [8, 9, 10, 11], quiet: [14, 15, 16] },
  bar: { peak: [21, 22, 23, 0], quiet: [17, 18, 19] },
  museum: { peak: [11, 12, 13, 14, 15], quiet: [9, 10, 16, 17] },
  gallery: { peak: [12, 13, 14], quiet: [10, 11, 16, 17] },
  landmark: { peak: [10, 11, 12, 13, 14, 15], quiet: [8, 9, 17, 18] },
  attraction: { peak: [11, 12, 13, 14, 15], quiet: [9, 10, 16, 17] },
  shop: { peak: [12, 13, 14, 15, 16], quiet: [10, 11, 17, 18] },
  market: { peak: [10, 11, 12], quiet: [8, 9, 14, 15] },
};

function getHourFromTime(time: string | null | undefined): number | null {
  if (!time) return null;
  const hour = parseInt(time.split(':')[0], 10);
  return isNaN(hour) ? null : hour;
}

function getCrowdLevel(category: string, hour: number): 'quiet' | 'moderate' | 'busy' | 'peak' {
  const lowerCategory = category.toLowerCase();

  for (const [key, hours] of Object.entries(PEAK_HOURS)) {
    if (lowerCategory.includes(key)) {
      if (hours.peak.includes(hour)) return 'peak';
      if (hours.quiet.includes(hour)) return 'quiet';
      return 'moderate';
    }
  }

  // Default patterns
  if (hour >= 11 && hour <= 14) return 'busy';
  if (hour >= 9 && hour <= 10) return 'quiet';
  if (hour >= 16 && hour <= 17) return 'quiet';
  return 'moderate';
}

function getBetterTime(category: string, currentHour: number): string | null {
  const lowerCategory = category.toLowerCase();

  for (const [key, hours] of Object.entries(PEAK_HOURS)) {
    if (lowerCategory.includes(key)) {
      // Find a quiet hour that's close
      const quietHours = hours.quiet.filter(h => Math.abs(h - currentHour) <= 3);
      if (quietHours.length > 0) {
        const bestHour = quietHours.reduce((a, b) =>
          Math.abs(b - currentHour) < Math.abs(a - currentHour) ? b : a
        );
        return `${bestHour}:00`;
      }
    }
  }
  return null;
}

/**
 * CrowdIndicator - Shows crowd level and suggests better times
 */
export default function CrowdIndicator({
  category = '',
  time,
  compact = false,
  className = '',
}: CrowdIndicatorProps) {
  const analysis = useMemo(() => {
    const hour = getHourFromTime(time);
    if (hour === null || !category) {
      return null;
    }

    const level = getCrowdLevel(category, hour);
    const betterTime = level === 'peak' || level === 'busy' ? getBetterTime(category, hour) : null;

    return { level, betterTime, hour };
  }, [category, time]);

  if (!analysis) return null;

  const { level, betterTime } = analysis;

  // Colors and labels
  const config = {
    quiet: {
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      label: 'Quiet',
    },
    moderate: {
      color: 'text-stone-500 dark:text-gray-400',
      bg: 'bg-stone-100 dark:bg-gray-800',
      label: 'Moderate',
    },
    busy: {
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      label: 'Busy',
    },
    peak: {
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      label: 'Peak',
    },
  };

  const { color, bg, label } = config[level];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${bg} ${color} ${className}`}>
        <Users className="w-2.5 h-2.5" />
        {label}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${bg} ${color}`}>
        <Users className="w-3 h-3" />
        {label}
      </span>
      {betterTime && (
        <span className="text-[10px] text-stone-400 dark:text-gray-500">
          Try {betterTime} instead
        </span>
      )}
    </div>
  );
}

/**
 * Inline crowd badge for item cards
 */
export function CrowdBadge({ category, time }: { category?: string; time?: string | null }) {
  const hour = getHourFromTime(time);
  if (hour === null || !category) return null;

  const level = getCrowdLevel(category, hour);

  // Only show for busy/peak
  if (level === 'quiet' || level === 'moderate') return null;

  const config = {
    busy: { color: 'text-amber-600', icon: '●' },
    peak: { color: 'text-red-500', icon: '●' },
  };

  const { color, icon } = config[level as 'busy' | 'peak'];

  return (
    <span className={`text-[8px] ${color}`} title={`${level === 'peak' ? 'Peak time' : 'Busy'}`}>
      {icon}
    </span>
  );
}
