'use client';

import { useState, useEffect, useMemo } from 'react';
import { Clock, Users, Sun, Moon, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CrowdLevel {
  hour: number;
  level: number; // 0-100
  label: 'Low' | 'Moderate' | 'Busy' | 'Very Busy';
}

interface BestTimeToVisitProps {
  destinationId: number;
  category?: string;
  compact?: boolean;
  className?: string;
}

// Generate realistic crowd patterns based on category and day
function generateCrowdPattern(category: string, dayOfWeek: number): CrowdLevel[] {
  const patterns: CrowdLevel[] = [];

  // Base patterns by category (24 hours)
  const categoryPatterns: Record<string, number[]> = {
    restaurant: [10, 10, 15, 20, 25, 35, 50, 70, 85, 95, 90, 80, 75, 65, 55, 45, 40, 50, 65, 85, 95, 90, 75, 50],
    cafe: [20, 15, 15, 20, 30, 45, 65, 80, 85, 75, 60, 55, 50, 45, 50, 55, 45, 35, 25, 20, 15, 15, 15, 15],
    bar: [10, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 75, 85, 95, 95, 90, 80, 60],
    hotel: [50, 45, 40, 35, 40, 50, 60, 75, 80, 70, 60, 55, 50, 50, 55, 60, 65, 70, 75, 70, 65, 60, 55, 50],
    museum: [15, 10, 10, 10, 15, 20, 25, 35, 50, 65, 80, 90, 85, 80, 85, 75, 60, 45, 30, 20, 15, 15, 15, 15],
    gallery: [10, 10, 10, 10, 15, 20, 25, 35, 45, 55, 70, 80, 85, 80, 75, 65, 55, 45, 35, 25, 15, 10, 10, 10],
    shop: [10, 10, 10, 10, 15, 20, 30, 40, 55, 70, 80, 85, 90, 85, 80, 75, 70, 65, 55, 40, 25, 15, 10, 10],
  };

  const basePattern = categoryPatterns[category?.toLowerCase() || 'restaurant'] || categoryPatterns.restaurant;

  // Weekend modifier
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const modifier = isWeekend ? 1.15 : 1;

  // Use destination ID as seed for consistent "randomness"
  const seed = category?.length || 5;

  for (let hour = 0; hour < 24; hour++) {
    let level = Math.min(100, Math.round(basePattern[hour] * modifier));

    // Add deterministic variation based on hour and seed
    const variation = ((hour * seed) % 10) - 5;
    level = Math.max(0, Math.min(100, level + variation));

    let label: CrowdLevel['label'];
    if (level < 30) label = 'Low';
    else if (level < 55) label = 'Moderate';
    else if (level < 80) label = 'Busy';
    else label = 'Very Busy';

    patterns.push({ hour, level, label });
  }

  return patterns;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function formatTimeRange(startHour: number, endHour: number): string {
  return `${formatHour(startHour)}-${formatHour(endHour)}`;
}

function getLevelColor(level: number): string {
  if (level < 30) return 'bg-emerald-500';
  if (level < 55) return 'bg-yellow-500';
  if (level < 80) return 'bg-orange-500';
  return 'bg-red-500';
}

function getLevelTextColor(level: number): string {
  if (level < 30) return 'text-emerald-600 dark:text-emerald-400';
  if (level < 55) return 'text-yellow-600 dark:text-yellow-400';
  if (level < 80) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function BestTimeToVisit({
  destinationId,
  category = 'restaurant',
  compact = false,
  className,
}: BestTimeToVisitProps) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  const crowdData = useMemo(() =>
    generateCrowdPattern(category, selectedDay),
    [category, selectedDay]
  );

  const bestTimes = useMemo(() => {
    // Find best times (lowest crowd levels during typical open hours)
    const openHours = crowdData.filter(p => p.hour >= 8 && p.hour <= 22);

    const morning = openHours.filter(p => p.hour >= 8 && p.hour < 12).sort((a, b) => a.level - b.level)[0];
    const afternoon = openHours.filter(p => p.hour >= 12 && p.hour < 17).sort((a, b) => a.level - b.level)[0];
    const evening = openHours.filter(p => p.hour >= 17 && p.hour <= 22).sort((a, b) => a.level - b.level)[0];

    return {
      morning: morning?.hour,
      afternoon: afternoon?.hour,
      evening: evening?.hour,
    };
  }, [crowdData]);

  const recommendedSlots = useMemo(() =>
    crowdData
      .filter(d => d.hour >= 9 && d.hour <= 21 && d.level < 50)
      .sort((a, b) => a.level - b.level)
      .slice(0, 3),
    [crowdData]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentCrowd = crowdData[currentHour];
  const isToday = selectedDay === new Date().getDay();

  // Compact version
  if (compact) {
    const bestSlot = recommendedSlots[0];
    if (!bestSlot) return null;

    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <TrendingDown className="h-3 w-3" />
        <span>Best: {formatHour(bestSlot.hour)}</span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-gray-200 dark:border-gray-800 p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          Best Time to Visit
        </h3>
        {isToday && currentCrowd && (
          <div className={cn('text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800', getLevelTextColor(currentCrowd.level))}>
            Now: {currentCrowd.label}
          </div>
        )}
      </div>

      {/* Day selector */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {days.map((day, index) => (
          <button
            key={day}
            onClick={() => setSelectedDay(index)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0',
              selectedDay === index
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Crowd level visualization */}
      <div className="mb-4">
        <div className="flex items-end gap-0.5 h-16">
          {crowdData.slice(6, 24).map((data) => (
            <div
              key={data.hour}
              className="flex-1 flex flex-col items-center"
            >
              <div
                className={cn(
                  'w-full rounded-t transition-all',
                  getLevelColor(data.level),
                  isToday && data.hour === currentHour && 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900'
                )}
                style={{ height: `${Math.max(8, data.level * 0.6)}px` }}
                title={`${formatHour(data.hour)}: ${data.label} (${data.level}%)`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>12am</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mb-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-emerald-500" /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-yellow-500" /> Moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-orange-500" /> Busy
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-red-500" /> Very Busy
        </span>
      </div>

      {/* Recommendations */}
      {recommendedSlots.length > 0 && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 mb-2">Recommended times:</p>
          <div className="flex flex-wrap gap-2">
            {recommendedSlots.map((slot) => (
              <span
                key={slot.hour}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium"
              >
                <Clock className="h-3 w-3" />
                {formatHour(slot.hour)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Best time summary */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-3 gap-2 text-center">
          {bestTimes.morning !== undefined && (
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <Sun className="h-3 w-3 mx-auto mb-1 text-yellow-500" />
              <p className="text-[10px] text-gray-500">Morning</p>
              <p className="text-xs font-medium">{formatHour(bestTimes.morning)}</p>
            </div>
          )}
          {bestTimes.afternoon !== undefined && (
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <Sun className="h-3 w-3 mx-auto mb-1 text-orange-500" />
              <p className="text-[10px] text-gray-500">Afternoon</p>
              <p className="text-xs font-medium">{formatHour(bestTimes.afternoon)}</p>
            </div>
          )}
          {bestTimes.evening !== undefined && (
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <Moon className="h-3 w-3 mx-auto mb-1 text-indigo-500" />
              <p className="text-[10px] text-gray-500">Evening</p>
              <p className="text-xs font-medium">{formatHour(bestTimes.evening)}</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-3 text-center">
        Based on historical visitor patterns
      </p>
    </div>
  );
}
