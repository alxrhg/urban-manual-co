'use client';

import { useMemo } from 'react';
import { AlertTriangle, Clock, TrendingUp, Info } from 'lucide-react';
import {
  analyzeDayItinerary,
  formatDuration,
  getEstimatedDuration,
  type DayAnalysis,
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

  const getProgressColor = (percent: number) => {
    if (percent > 100) return 'bg-red-500';
    if (percent > 85) return 'bg-orange-500';
    if (percent > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-800 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          Day Time Analysis
        </h4>
        <span className={`text-xs font-medium ${analysis.isOverstuffed ? 'text-red-500' : 'text-gray-500'}`}>
          {analysis.utilizationPercent}% utilized
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-3 overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${getProgressColor(analysis.utilizationPercent)}`}
          style={{ width: `${Math.min(analysis.utilizationPercent, 100)}%` }}
        />
        {analysis.utilizationPercent > 100 && (
          <div
            className="absolute right-0 top-0 h-full bg-red-500/30 animate-pulse"
            style={{ width: `${Math.min(analysis.utilizationPercent - 100, 50)}%` }}
          />
        )}
      </div>

      {/* Time Breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDuration(analysis.totalActivityTime)}
          </div>
          <div className="text-[10px] text-gray-500">Activities</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDuration(analysis.totalTravelTime)}
          </div>
          <div className="text-[10px] text-gray-500">Travel</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDuration(analysis.availableHours * 60 - analysis.totalTime)}
          </div>
          <div className="text-[10px] text-gray-500">Free Time</div>
        </div>
      </div>

      {/* Time Slots Visual */}
      <div className="space-y-1 mb-4">
        {analysis.timeSlots.map((slot, index) => (
          <div key={slot.itemId} className="flex items-center gap-2 text-xs">
            <span className="w-5 h-5 flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-[10px] font-medium">
              {index + 1}
            </span>
            <div className="flex-1 flex items-center gap-1.5 truncate">
              <span className="truncate text-gray-700 dark:text-gray-300">{slot.name}</span>
              <span className="text-gray-400 flex-shrink-0">~{formatDuration(slot.estimatedDuration)}</span>
            </div>
            {slot.travelTimeFromPrev && (
              <span className="text-[10px] text-blue-500 flex-shrink-0">
                +{slot.travelTimeFromPrev}m transit
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="space-y-2 mb-3">
          {analysis.warnings.map((warning, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-xs text-orange-700 dark:text-orange-400"
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="space-y-2">
          {analysis.suggestions.map((suggestion, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-400"
            >
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
