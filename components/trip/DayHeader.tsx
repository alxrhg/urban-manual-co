'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ChevronDown,
  Plus,
  Route,
  Sparkles,
  CloudRain,
  Cloud,
  Sun,
  CloudSun,
} from 'lucide-react';

export interface DayItem {
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

interface WeatherForecast {
  condition: string;
  precipitation: number;
  tempMax: number;
  tempMin?: number;
}

interface DayHeaderProps {
  dayNumber: number;
  date: string | null;
  itemCount?: number;
  items?: DayItem[];
  weatherForecast?: WeatherForecast | null;
  isSticky?: boolean;
  isExpanded?: boolean;
  className?: string;
  onAddItem?: () => void;
  onOptimize?: () => void;
  onAutoSchedule?: () => void;
  isOptimizing?: boolean;
  isAutoScheduling?: boolean;
  showActions?: boolean;
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
  const category = (
    item.parsedNotes?.category ||
    item.destination?.category ||
    ''
  ).toLowerCase();
  const type = item.parsedNotes?.type;

  if (type === 'flight') return 180;
  if (type === 'hotel') return 30;

  for (const [key, duration] of Object.entries(DURATION_BY_CATEGORY)) {
    if (category.includes(key)) return duration;
  }
  return DURATION_BY_CATEGORY.default;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type PaceLevel = 'relaxed' | 'balanced' | 'busy' | 'packed';

export interface PaceScore {
  level: PaceLevel;
  label: string;
  totalHours: number;
  color: string;
}

export function calculatePaceScore(items: DayItem[]): PaceScore {
  if (items.length === 0) {
    return {
      level: 'relaxed',
      label: 'Free day',
      totalHours: 0,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    };
  }

  let totalActivityMinutes = 0;
  let totalTransitMinutes = 0;

  items.forEach((item, index) => {
    totalActivityMinutes += getDuration(item);

    // Estimate transit time to next item
    if (index < items.length - 1) {
      const nextItem = items[index + 1];
      if (
        item.destination?.latitude &&
        item.destination?.longitude &&
        nextItem.destination?.latitude &&
        nextItem.destination?.longitude
      ) {
        const distance = calculateDistance(
          item.destination.latitude,
          item.destination.longitude,
          nextItem.destination.latitude,
          nextItem.destination.longitude
        );
        totalTransitMinutes += Math.ceil(distance * 15);
      } else {
        // Default 20 min transit if no coords
        totalTransitMinutes += 20;
      }
    }
  });

  const totalMinutes = totalActivityMinutes + totalTransitMinutes;
  const totalHours = totalMinutes / 60;

  // Pace thresholds
  if (totalHours <= 4) {
    return {
      level: 'relaxed',
      label: 'Relaxed',
      totalHours,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    };
  } else if (totalHours <= 7) {
    return {
      level: 'balanced',
      label: 'Balanced',
      totalHours,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50',
    };
  } else if (totalHours <= 10) {
    return {
      level: 'busy',
      label: 'Busy',
      totalHours,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    };
  } else {
    return {
      level: 'packed',
      label: 'Packed',
      totalHours,
      color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50',
    };
  }
}

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('shower')) {
    return <CloudRain className="w-3 h-3" />;
  }
  if (c.includes('cloud') || c.includes('overcast')) {
    return <Cloud className="w-3 h-3" />;
  }
  if (c.includes('partly') || c.includes('partial')) {
    return <CloudSun className="w-3 h-3" />;
  }
  return <Sun className="w-3 h-3" />;
}

/**
 * DayHeader - Editorial section header for trip days with rhythm controls
 * Features: Date, weather, pace score, and action chips
 */
export default function DayHeader({
  dayNumber,
  date,
  itemCount = 0,
  items = [],
  weatherForecast,
  isSticky = true,
  isExpanded = true,
  className = '',
  onAddItem,
  onOptimize,
  onAutoSchedule,
  isOptimizing = false,
  isAutoScheduling = false,
  showActions = true,
}: DayHeaderProps) {
  const formattedDate = date ? format(parseISO(date), 'EEE, MMM d') : null;

  const paceScore = useMemo(() => calculatePaceScore(items), [items]);

  return (
    <div
      className={`
        ${isSticky ? 'sticky top-0 z-10' : ''}
        py-4 px-4 sm:px-6
        bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm
        border-b border-gray-100 dark:border-gray-800/50
        transition-colors duration-200
        ${className}
      `}
    >
      {/* Top Row: Day Number, Date, Weather, Pace Score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Day number with editorial italic styling */}
          <span className="font-display italic text-xl sm:text-2xl text-gray-900 dark:text-white tracking-tight">
            Day {dayNumber}
          </span>

          {/* Date chip */}
          {formattedDate && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full font-medium">
              {formattedDate}
            </span>
          )}

          {/* Weather chip */}
          {weatherForecast && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full">
              {getWeatherIcon(weatherForecast.condition)}
              <span className="tabular-nums">{weatherForecast.tempMax}°</span>
              {weatherForecast.precipitation > 10 && (
                <span className="text-blue-500 dark:text-blue-400 tabular-nums">
                  {weatherForecast.precipitation}%
                </span>
              )}
            </span>
          )}

          {/* Pace score chip */}
          {items.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded-full ${paceScore.color}`}
            >
              {paceScore.label}
              <span className="opacity-70 tabular-nums">
                {paceScore.totalHours.toFixed(1)}h
              </span>
            </span>
          )}
        </div>

        {/* Right: Expand/Collapse indicator */}
        <div className="flex items-center gap-2">
          {itemCount > 0 && (
            <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
              {itemCount} {itemCount === 1 ? 'stop' : 'stops'}
            </span>
          )}
          <ChevronDown
            className={`
              w-4 h-4 text-gray-300 dark:text-gray-600
              transition-transform duration-300
              ${isExpanded ? 'rotate-0' : '-rotate-90'}
            `}
          />
        </div>
      </div>

      {/* Bottom Row: Action Chips */}
      {showActions && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add chip */}
          {onAddItem && (
            <button
              onClick={onAddItem}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          )}

          {/* Optimize chip */}
          {onOptimize && items.length >= 2 && (
            <button
              onClick={onOptimize}
              disabled={isOptimizing}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                isOptimizing
                  ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-wait'
                  : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Route className={`w-3 h-3 ${isOptimizing ? 'animate-pulse' : ''}`} />
              {isOptimizing ? 'Optimizing...' : 'Optimize'}
            </button>
          )}

          {/* Auto-schedule chip */}
          {onAutoSchedule && (
            <button
              onClick={onAutoSchedule}
              disabled={isAutoScheduling}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                isAutoScheduling
                  ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-wait'
                  : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Sparkles
                className={`w-3 h-3 ${isAutoScheduling ? 'animate-pulse' : ''}`}
              />
              {isAutoScheduling ? 'Scheduling...' : 'Auto-schedule'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact variant for day navigation/tabs
 */
export function CompactDayChip({
  dayNumber,
  date,
  isActive = false,
  paceLevel,
  onClick,
}: {
  dayNumber: number;
  date?: string | null;
  isActive?: boolean;
  paceLevel?: PaceLevel;
  onClick?: () => void;
}) {
  const formattedDate = date ? format(parseISO(date), 'MMM d') : null;

  const paceColors: Record<PaceLevel, string> = {
    relaxed: 'bg-emerald-500',
    balanced: 'bg-blue-500',
    busy: 'bg-amber-500',
    packed: 'bg-red-500',
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors
        ${
          isActive
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
      `}
    >
      <span className="text-[11px] font-medium">Day {dayNumber}</span>
      {formattedDate && (
        <span className={`text-[9px] ${isActive ? 'opacity-70' : 'opacity-50'}`}>
          {formattedDate}
        </span>
      )}
      {/* Pace indicator dot */}
      {paceLevel && (
        <span
          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${paceColors[paceLevel]}`}
        />
      )}
    </button>
  );
}
