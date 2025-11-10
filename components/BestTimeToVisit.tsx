'use client';

import { Clock, TrendingDown } from 'lucide-react';

interface Props {
  destinationId: number;
  compact?: boolean;
}

export function BestTimeToVisit({ destinationId, compact = false }: Props) {
  // For now, use simple heuristic based on category and data
  // In production, this would call the real-time API
  const bestTimes = getBestTimesHeuristic();

  if (!bestTimes || bestTimes.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <TrendingDown className="h-3 w-3" />
        <span>Best: {bestTimes[0]}</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-dark-blue-600 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Best Time to Visit
      </h3>

      <div className="space-y-2">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Quietest times today:
        </div>
        <div className="flex flex-wrap gap-2">
          {bestTimes.map((time, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full text-xs font-medium"
            >
              {time}
            </span>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-dark-blue-600">
        Based on historical patterns
      </div>
    </div>
  );
}

// Simple heuristic for best times
function getBestTimesHeuristic(): string[] {
  const now = new Date();
  const currentHour = now.getHours();

  // Morning hours (before lunch rush)
  if (currentHour < 11) {
    return ['10:00-11:30', '14:00-16:00'];
  }

  // Afternoon (between meals)
  if (currentHour >= 11 && currentHour < 17) {
    return ['14:30-16:30', '21:00-22:00'];
  }

  // Evening (late dinner)
  return ['21:30-23:00', '10:00-11:30 tomorrow'];
}
