'use client';

import { Clock, TrendingUp, Calendar, CloudSun, Cloud, CloudRain, Sun } from 'lucide-react';

interface WeatherData {
  temperature?: number;
  weatherCode?: number;
  weatherDescription?: string;
}

interface EnrichedDestinationBadgesProps {
  walkingTime?: number | null;
  weather?: WeatherData | null;
  hasEvents?: boolean;
  eventCount?: number;
  isTrending?: boolean;
  trendingScore?: number;
  className?: string;
}

/**
 * Enrichment badges for destination cards
 * Shows walking time, weather, events, and trending status
 */
export function EnrichedDestinationBadges({
  walkingTime,
  weather,
  hasEvents,
  eventCount = 0,
  isTrending,
  trendingScore,
  className = '',
}: EnrichedDestinationBadgesProps) {
  // Get weather icon based on weather code
  const getWeatherIcon = (code?: number) => {
    if (!code) return null;

    // Clear (0-1)
    if (code <= 1) return <Sun className="h-3 w-3" />;

    // Partly cloudy (2-3)
    if (code <= 3) return <Cloud className="h-3 w-3" />;

    // Rainy/snowy (61-86)
    if (code >= 61 && code <= 86) return <CloudRain className="h-3 w-3" />;

    // Default
    return <CloudSun className="h-3 w-3" />;
  };

  // Don't render if no enrichment data
  if (!walkingTime && !weather && !hasEvents && !isTrending) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 mt-2 ${className}`}>
      {/* Walking time badge */}
      {walkingTime && walkingTime > 0 && (
        <div className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
          <Clock className="h-3 w-3" />
          <span>{walkingTime} min</span>
        </div>
      )}

      {/* Weather badge */}
      {weather && weather.weatherCode !== undefined && (
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            weather.weatherCode <= 1
              ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              : weather.weatherCode >= 61
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              : 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400'
          }`}
          title={weather.weatherDescription}
        >
          {getWeatherIcon(weather.weatherCode)}
          {weather.temperature && <span>{weather.temperature}°C</span>}
        </div>
      )}

      {/* Events badge */}
      {hasEvents && eventCount > 0 && (
        <div
          className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full text-[10px] font-medium"
          title={`${eventCount} nearby event${eventCount > 1 ? 's' : ''}`}
        >
          <Calendar className="h-3 w-3" />
          <span>{eventCount}</span>
        </div>
      )}

      {/* Trending badge */}
      {isTrending && (
        <div
          className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-[10px] font-medium"
          title={trendingScore ? `Trending score: ${Math.round(trendingScore * 100)}%` : 'Trending'}
        >
          <TrendingUp className="h-3 w-3" />
          <span>Trending</span>
        </div>
      )}
    </div>
  );
}
