'use client';

import { Users, Clock, TrendingDown } from 'lucide-react';
import { predictCrowdLevel, type CrowdPrediction } from '@/lib/trip-intelligence';

interface CrowdIndicatorProps {
  category?: string | null;
  scheduledTime?: string | null;
  scheduledDate?: string | null;
  compact?: boolean;
  onTimeClick?: (time: string) => void;
}

export default function CrowdIndicator({
  category,
  scheduledTime,
  scheduledDate,
  compact = false,
  onTimeClick,
}: CrowdIndicatorProps) {
  // Get day of week from date
  let dayOfWeek: number | undefined;
  if (scheduledDate) {
    const date = new Date(scheduledDate);
    if (!isNaN(date.getTime())) {
      dayOfWeek = date.getDay();
    }
  }

  const prediction = predictCrowdLevel(category, scheduledTime, dayOfWeek);

  const getLevelColor = (level: number) => {
    if (level < 30) return 'text-green-500';
    if (level < 50) return 'text-lime-500';
    if (level < 70) return 'text-yellow-500';
    if (level < 85) return 'text-orange-500';
    return 'text-red-500';
  };

  const getLevelBg = (level: number) => {
    if (level < 30) return 'bg-green-50 dark:bg-green-900/20';
    if (level < 50) return 'bg-lime-50 dark:bg-lime-900/20';
    if (level < 70) return 'bg-yellow-50 dark:bg-yellow-900/20';
    if (level < 85) return 'bg-orange-50 dark:bg-orange-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  // Compact mode: just show icon and label
  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-[10px] ${getLevelColor(prediction.level)}`}>
        <Users className="w-3 h-3" />
        <span>{prediction.label}</span>
      </div>
    );
  }

  // Don't show expanded view if no time scheduled
  if (!scheduledTime) return null;

  // Only show expanded for busy times
  if (prediction.level < 70) {
    return (
      <div className={`flex items-center gap-1 text-[10px] ${getLevelColor(prediction.level)}`}>
        <Users className="w-3 h-3" />
        <span>{prediction.label}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-2 ${getLevelBg(prediction.level)}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Users className={`w-3.5 h-3.5 ${getLevelColor(prediction.level)}`} />
        <span className={`text-xs font-medium ${getLevelColor(prediction.level)}`}>
          {prediction.label} at {scheduledTime}
        </span>
      </div>

      {prediction.suggestion && (
        <p className="text-[11px] text-stone-600 dark:text-stone-400 mb-2">
          {prediction.suggestion}
        </p>
      )}

      {prediction.bestTimes && prediction.bestTimes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <TrendingDown className="w-3 h-3 text-green-500" />
          <span className="text-[10px] text-stone-500">Better times:</span>
          {prediction.bestTimes.map((time) => (
            <button
              key={time}
              onClick={() => onTimeClick?.(time)}
              className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
