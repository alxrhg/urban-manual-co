'use client';

import { useMemo } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import {
  analyzeDayItinerary,
  formatDuration,
} from '@/lib/trip-intelligence';

interface DayTimelineAnalysisProps {
  items: Array<{
    id: string;
    title: string;
    time?: string | null;
    category?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    customDuration?: number;
  }>;
  className?: string;
}

export default function DayTimelineAnalysis({ items, className = '' }: DayTimelineAnalysisProps) {
  const analysis = useMemo(() => {
    return analyzeDayItinerary(
      items.map((item) => ({
        id: item.id,
        title: item.title,
        time: item.time,
        category: item.category,
        latitude: item.latitude,
        longitude: item.longitude,
        customDuration: item.customDuration,
      }))
    );
  }, [items]);

  if (items.length === 0) return null;

  const freeTime = analysis.availableHours * 60 - analysis.totalTime;

  return (
    <div className={`flex items-center gap-4 text-xs ${className}`}>
      {/* Time summary */}
      <div className="flex items-center gap-1.5 text-gray-500">
        <Clock className="w-3.5 h-3.5" />
        <span>{formatDuration(analysis.totalActivityTime)} planned</span>
        {analysis.totalTravelTime > 0 && (
          <span className="text-gray-400">+ {formatDuration(analysis.totalTravelTime)} travel</span>
        )}
      </div>

      {/* Status */}
      {analysis.isOverstuffed ? (
        <div className="flex items-center gap-1 text-orange-500">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Overpacked</span>
        </div>
      ) : freeTime > 0 && (
        <span className="text-gray-400">
          {formatDuration(freeTime)} free
        </span>
      )}

      {/* Progress indicator */}
      <div className="flex-1 max-w-[100px] h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            analysis.isOverstuffed ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          style={{ width: `${Math.min(analysis.utilizationPercent, 100)}%` }}
        />
      </div>
    </div>
  );
}
