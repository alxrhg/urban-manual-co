'use client';

import { useMemo } from 'react';
import { CloudRain } from 'lucide-react';

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
  items: DayItem[];
  weatherForecast?: {
    condition: string;
    precipitation: number;
    tempMax: number;
  } | null;
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
 * DayIntelligence - Silent until needed
 *
 * Philosophy: Only show warnings when actionable.
 * Most days should show nothing - that means everything is fine.
 */
export default function DayIntelligence({
  items,
  weatherForecast,
  className = '',
}: DayIntelligenceProps) {
  const analysis = useMemo(() => {
    let totalActivityMinutes = 0;
    let totalTransitMinutes = 0;
    let outdoorCount = 0;

    items.forEach((item, index) => {
      totalActivityMinutes += getDuration(item);

      // Check if outdoor
      const category = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
      if (category.includes('park') || category.includes('garden') || category.includes('beach') ||
          category.includes('market') || category.includes('walk') || category.includes('outdoor')) {
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
          totalTransitMinutes += Math.ceil(distance * 15);
        }
      }
    });

    const totalMinutes = totalActivityMinutes + totalTransitMinutes;
    const isOverstuffed = totalMinutes > 12 * 60; // More than 12 hours - this is a problem

    return {
      totalTransitMinutes,
      isOverstuffed,
      outdoorCount,
    };
  }, [items]);

  // Rain warning - only if outdoor activities scheduled
  const hasRainWarning = weatherForecast &&
    weatherForecast.precipitation > 30 && // Raise threshold - 30%+ chance is meaningful
    analysis.outdoorCount > 0;

  // Only show if there's actually a problem
  const hasOverstuffedWarning = analysis.isOverstuffed && items.length >= 4;

  // Nothing to warn about? Show nothing. Silence is golden.
  if (!hasRainWarning && !hasOverstuffedWarning) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Overstuffed warning */}
      {hasOverstuffedWarning && (
        <span className="text-[10px] text-amber-600 dark:text-amber-400">
          Tight schedule
        </span>
      )}

      {/* Rain warning */}
      {hasRainWarning && (
        <div className="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400">
          <CloudRain className="w-3 h-3" />
          <span>Rain likely</span>
        </div>
      )}
    </div>
  );
}
