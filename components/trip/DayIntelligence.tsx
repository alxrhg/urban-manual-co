'use client';

import { useMemo, useState } from 'react';
import { Clock, Route, CloudRain, Zap, ChevronRight, Loader2 } from 'lucide-react';

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
 * DayIntelligence - Shows pacing, optimization, and weather info for a day
 */
export default function DayIntelligence({
  dayNumber,
  date,
  items,
  weatherForecast,
  onOptimizeDay,
  onAutoFill,
  isOptimizing = false,
  isAutoFilling = false,
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
    const hasGaps = items.length < 3 && items.length > 0;

    return {
      totalActivityMinutes,
      totalTransitMinutes,
      totalMinutes,
      utilization,
      isOverstuffed,
      hasGaps,
      outdoorCount,
      itemCount: items.length,
    };
  }, [items]);

  // Check for rain
  const hasRainWarning = weatherForecast && weatherForecast.precipitation > 5 && analysis.outdoorCount > 0;

  // Don't show if no items
  if (items.length === 0) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <button
          onClick={onAutoFill}
          disabled={isAutoFilling}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isAutoFilling ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
          Auto-fill Day {dayNumber}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Utilization meter */}
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                analysis.isOverstuffed
                  ? 'bg-red-500'
                  : analysis.utilization > 80
                  ? 'bg-amber-500'
                  : 'bg-gray-900 dark:bg-white'
              }`}
              style={{ width: `${Math.min(100, analysis.utilization)}%` }}
            />
          </div>
          <span className={`text-[10px] font-medium ${
            analysis.isOverstuffed
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {analysis.utilization}%
          </span>
        </div>
        {analysis.isOverstuffed && (
          <span className="text-[10px] text-red-600 dark:text-red-400">Packed</span>
        )}
      </div>

      {/* Transit time */}
      {analysis.totalTransitMinutes > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Route className="w-3 h-3" />
          <span>{Math.round(analysis.totalTransitMinutes)} min transit</span>
        </div>
      )}

      {/* Rain warning */}
      {hasRainWarning && (
        <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
          <CloudRain className="w-3 h-3" />
          <span>Rain expected</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Optimize Day button */}
        {items.length >= 2 && onOptimizeDay && (
          <button
            onClick={onOptimizeDay}
            disabled={isOptimizing}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
          >
            {isOptimizing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Route className="w-3 h-3" />
            )}
            Optimize
          </button>
        )}

        {/* Auto-fill button */}
        {analysis.hasGaps && onAutoFill && (
          <button
            onClick={onAutoFill}
            disabled={isAutoFilling}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
          >
            {isAutoFilling ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            Fill gaps
          </button>
        )}
      </div>
    </div>
  );
}
