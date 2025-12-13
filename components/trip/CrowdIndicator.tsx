'use client';

import { useMemo } from 'react';
import {
  InsightChip,
  InsightDot,
  getCrowdVariant,
  getCrowdLabel,
} from '@/components/ui/InsightChip';

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
 * Uses standardized InsightChip for consistent styling
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
  const variant = getCrowdVariant(level);
  const label = getCrowdLabel(level);

  if (compact) {
    return (
      <InsightChip
        type="crowd"
        variant={variant}
        label={label}
        compact
        className={className}
      />
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <InsightChip
        type="crowd"
        variant={variant}
        label={label}
      />
      {betterTime && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Try {betterTime} instead
        </span>
      )}
    </div>
  );
}

/**
 * Inline crowd badge for item cards
 * Uses standardized InsightDot for consistent styling
 */
export function CrowdBadge({ category, time }: { category?: string; time?: string | null }) {
  const hour = getHourFromTime(time);
  if (hour === null || !category) return null;

  const level = getCrowdLevel(category, hour);

  // Only show for busy/peak
  if (level === 'quiet' || level === 'moderate') return null;

  const variant = getCrowdVariant(level);
  const title = level === 'peak' ? 'Peak time' : 'Busy';

  return (
    <InsightDot variant={variant} title={title} />
  );
}
