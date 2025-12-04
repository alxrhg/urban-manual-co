'use client';

import { format, parseISO } from 'date-fns';
import { ChevronDown, MapPin, Clock, Footprints, DollarSign } from 'lucide-react';
import type { Trip } from '@/types/trip';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

/**
 * Weather data for a day
 */
export interface DayWeather {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'partly-cloudy';
  description: string;
  humidity?: number;
  windSpeed?: number;
  precipitation?: number;
}

interface DayHeaderProps {
  dayNumber: number;
  date: string | null;
  itemCount?: number;
  isSticky?: boolean;
  isExpanded?: boolean;
  className?: string;
  // New props for enhanced header
  weather?: DayWeather;
  items?: EnrichedItineraryItem[];
  trip?: Trip;
}

/**
 * DayHeader - Editorial section header for trip days
 * Featuring date display, weather, and day statistics
 *
 * Display format:
 * DEC 14 · Sunday · Day 1                           ☀️ 78°F Sunny
 * 📍 4 locations · ⏱️ 3h planned · 🚶 4.2km · 💰 ~$180
 */
export default function DayHeader({
  dayNumber,
  date,
  itemCount = 0,
  isSticky = true,
  isExpanded = true,
  className = '',
  weather,
  items = [],
  trip,
}: DayHeaderProps) {
  // Parse and format date
  const parsedDate = date ? parseISO(date) : null;
  const formattedDate = parsedDate ? format(parsedDate, 'MMM d').toUpperCase() : null;
  const dayOfWeek = parsedDate ? format(parsedDate, 'EEEE') : null;

  // Calculate stats from items
  const stats = calculateDayStats(items);

  // Weather icons mapping
  const weatherIcons: Record<string, string> = {
    sunny: '☀️',
    'partly-cloudy': '⛅',
    cloudy: '☁️',
    rainy: '🌧️',
    stormy: '⛈️',
    snowy: '❄️',
  };

  // Format temperature based on trip settings (default to F)
  const formatTemp = (temp: number) => {
    // Could read from trip settings in the future
    return `${temp}°F`;
  };

  return (
    <div
      className={`
        ${isSticky ? 'sticky top-0 z-10' : ''}
        py-4 px-6
        bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm
        border-b border-gray-100 dark:border-gray-800/50
        transition-colors duration-200
        ${className}
      `}
    >
      {/* Top Row: Date and Weather */}
      <div className="flex items-center justify-between">
        {/* Left: Date Info */}
        <div className="flex items-center gap-2">
          {/* Date badge */}
          {formattedDate && (
            <span className="text-xs font-semibold tracking-wide text-gray-900 dark:text-white">
              {formattedDate}
            </span>
          )}
          {/* Separator */}
          {dayOfWeek && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {dayOfWeek}
              </span>
            </>
          )}
          {/* Day number */}
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="font-display italic text-base text-gray-900 dark:text-white">
            Day {dayNumber}
          </span>
        </div>

        {/* Right: Weather */}
        {weather && (
          <div className="flex items-center gap-2">
            <span className="text-xl">{weatherIcons[weather.condition] || '☀️'}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatTemp(weather.tempHigh)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {weather.description}
            </span>
          </div>
        )}

        {/* Expand/Collapse indicator (when no weather) */}
        {!weather && (
          <ChevronDown
            className={`
              w-4 h-4 text-gray-300 dark:text-gray-600
              transition-transform duration-300
              ${isExpanded ? 'rotate-0' : '-rotate-90'}
            `}
          />
        )}
      </div>

      {/* Bottom Row: Stats */}
      {(stats.locationCount > 0 || stats.plannedMinutes > 0) && (
        <div className="flex items-center gap-4 mt-2">
          {/* Location count */}
          {stats.locationCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5" />
              {stats.locationCount} {stats.locationCount === 1 ? 'location' : 'locations'}
            </span>
          )}

          {/* Planned time */}
          {stats.plannedMinutes > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(stats.plannedMinutes)} planned
            </span>
          )}

          {/* Walking distance */}
          {stats.walkingDistanceKm > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Footprints className="w-3.5 h-3.5" />
              {formatDistance(stats.walkingDistanceKm)}
            </span>
          )}

          {/* Estimated spend */}
          {stats.estimatedSpend > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <DollarSign className="w-3.5 h-3.5" />
              ~${stats.estimatedSpend}
            </span>
          )}
        </div>
      )}

      {/* Minimal stats when no detailed items */}
      {stats.locationCount === 0 && itemCount > 0 && (
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {itemCount} {itemCount === 1 ? 'stop' : 'stops'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Calculate day statistics from itinerary items
 */
interface DayStats {
  locationCount: number;
  plannedMinutes: number;
  walkingDistanceKm: number;
  estimatedSpend: number;
}

function calculateDayStats(items: EnrichedItineraryItem[]): DayStats {
  let locationCount = 0;
  let plannedMinutes = 0;
  let walkingDistanceKm = 0;
  let estimatedSpend = 0;

  for (const item of items) {
    const notes = item.parsedNotes;
    const itemType = notes?.type;

    // Count locations (exclude minimal items like activities, flights, etc.)
    if (itemType === 'place' || itemType === 'hotel' || !itemType) {
      locationCount++;
    }

    // Sum durations
    if (notes?.duration) {
      plannedMinutes += notes.duration;
    }

    // Sum walking distances (only for walking mode)
    if (notes?.travelModeToNext === 'walking' && notes?.travelDistanceToNext) {
      walkingDistanceKm += notes.travelDistanceToNext;
    }

    // Sum cost estimates (would need to add cost_estimate to notes type)
    // For now, we'll estimate based on price_level from destination
    if (item.destination?.price_level) {
      const priceEstimates = [0, 15, 35, 75, 150]; // Rough estimates per price level
      estimatedSpend += priceEstimates[item.destination.price_level] || 0;
    }
  }

  return {
    locationCount,
    plannedMinutes,
    walkingDistanceKm,
    estimatedSpend,
  };
}

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format distance in km to human-readable string
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}
