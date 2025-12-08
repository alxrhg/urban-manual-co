'use client';

import { useMemo } from 'react';
import { Clock, Route, CloudRain } from 'lucide-react';

interface DayItem {
  id: string;
  title: string;
  time?: string | null;
  destination?: {
    category?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  parsedNotes?: {
    type?: string;
    category?: string;
  };
}

interface DayIntelligenceProps {
  dayNumber: number;
  date?: string | null;
  items: DayItem[];
  weatherForecast?: {
    condition: string;
    precipitation: number;
    tempMax: number;
  } | null;
  onOptimizeDay?: () => void;
  onAutoFill?: () => void;
  isOptimizing?: boolean;
  isAutoFilling?: boolean;
  className?: string;
}

// Duration estimates by category (minutes)
const DURATION_BY_CATEGORY: Record<string, number> = {
  restaurant: 90,
  cafe: 45,
  bar: 60,
  museum: 120,
  gallery: 90,
  landmark: 45,
  attraction: 90,
  hotel: 30,
  shop: 45,
  default: 60,
};

function getDuration(item: DayItem): number {
  const category = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
  const type = item.parsedNotes?.type;

  if (type === 'flight') return 180;
  if (type === 'hotel') return 30;

  for (const [key, duration] of Object.entries(DURATION_BY_CATEGORY)) {
    if (category.includes(key)) return duration;
  }
  return DURATION_BY_CATEGORY.default;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * DayIntelligence - Subtle day pacing indicator
 *
 * Philosophy: Shows analysis results automatically, no buttons needed.
 * Information appears naturally as part of the day header.
 * User can tap subtle hints to apply optimizations silently.
 */
export default function DayIntelligence({
  dayNumber,
  date,
  items,
  weatherForecast,
  onOptimizeDay,
  className = '',
}: DayIntelligenceProps) {
  const analysis = useMemo(() => {
    // Calculate total activity time
    let totalActivityMinutes = 0;
    let totalTransitMinutes = 0;
    let outdoorCount = 0;

    items.forEach((item, index) => {
      totalActivityMinutes += getDuration(item);

      // Check if outdoor
      const category = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
      if (category.includes('park') || category.includes('garden') || category.includes('beach') ||
          category.includes('market') || category.includes('walk')) {
        outdoorCount++;
      }

      // Estimate transit time to next item
      if (index < items.length - 1) {
        const nextItem = items[index + 1];
        if (item.destination?.latitude && item.destination?.longitude &&
            nextItem.destination?.latitude && nextItem.destination?.longitude) {
          const distance = calculateDistance(
            item.destination.latitude, item.destination.longitude,
            nextItem.destination.latitude, nextItem.destination.longitude
          );
          // Estimate 15 min per km for city transit
          totalTransitMinutes += Math.ceil(distance * 15);
        } else {
          totalTransitMinutes += 20; // Default transit time
        }
      }
    });

    const totalMinutes = totalActivityMinutes + totalTransitMinutes;
    const usableMinutes = 10 * 60; // 10 hours usable day
    const utilization = Math.min(100, Math.round((totalMinutes / usableMinutes) * 100));
    const isOverstuffed = totalMinutes > 12 * 60; // More than 12 hours
    const isPacked = totalMinutes > 9 * 60;
    const isLight = totalMinutes < 4 * 60 && items.length > 0;

    // Determine pacing label (subtle hint, not alert)
    let pacingLabel: string | null = null;
    if (isOverstuffed) pacingLabel = 'Tight schedule';
    else if (isPacked) pacingLabel = 'Full day';
    else if (isLight) pacingLabel = 'Light day';

    return {
      totalActivityMinutes,
      totalTransitMinutes,
      totalMinutes,
      utilization,
      isOverstuffed,
      isPacked,
      isLight,
      pacingLabel,
      outdoorCount,
      itemCount: items.length,
    };
  }, [items]);

  // Check for rain - subtle warning only
  const hasRainWarning = weatherForecast && weatherForecast.precipitation > 5 && analysis.outdoorCount > 0;

  // Don't show anything if empty - silence is golden
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Utilization meter - visual only, no label needed */}
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <div className="flex items-center gap-1.5">
          <div className="w-14 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                analysis.isOverstuffed
                  ? 'bg-amber-500'
                  : analysis.utilization > 80
                  ? 'bg-gray-600 dark:bg-gray-300'
                  : 'bg-gray-400 dark:bg-gray-500'
              }`}
              style={{ width: `${Math.min(100, analysis.utilization)}%` }}
            />
          </div>
          {/* Only show pacing hint if notable */}
          {analysis.pacingLabel && (
            <span className={`text-[10px] ${
              analysis.isOverstuffed
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-400'
            }`}>
              {analysis.pacingLabel}
            </span>
          )}
        </div>
      </div>

      {/* Transit time - only show if significant */}
      {analysis.totalTransitMinutes > 30 && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Route className="w-3 h-3" />
          <span>{Math.round(analysis.totalTransitMinutes)}m walking</span>
        </div>
      )}

      {/* Rain warning - subtle */}
      {hasRainWarning && (
        <div className="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400">
          <CloudRain className="w-3 h-3" />
          <span>Rain likely</span>
        </div>
      )}

      {/* Subtle optimize hint - tappable but not a button */}
      {items.length >= 3 && analysis.totalTransitMinutes > 60 && onOptimizeDay && (
        <button
          onClick={onOptimizeDay}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Could reduce walking
        </button>
      )}
    </div>
  );
}
