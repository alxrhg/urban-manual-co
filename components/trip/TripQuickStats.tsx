'use client';

import { Cloud, Sun, CloudRain, Snowflake, MapPin, Thermometer } from 'lucide-react';
import type { TripWeatherForecast } from '@/types/trip';

interface TripQuickStatsProps {
  weather?: TripWeatherForecast & { formatted?: string };
  savedPlacesCount?: number;
  onWeatherClick?: () => void;
  onSavedClick?: () => void;
  className?: string;
}

/**
 * Get weather icon based on condition
 */
function getWeatherIcon(condition: string): React.ReactNode {
  const normalizedCondition = condition.toLowerCase();

  if (normalizedCondition.includes('rain') || normalizedCondition.includes('thunder')) {
    return <CloudRain className="w-6 h-6 text-blue-500" />;
  }
  if (normalizedCondition.includes('snow')) {
    return <Snowflake className="w-6 h-6 text-blue-300" />;
  }
  if (normalizedCondition.includes('cloud') || normalizedCondition.includes('overcast')) {
    return <Cloud className="w-6 h-6 text-gray-400" />;
  }
  return <Sun className="w-6 h-6 text-amber-500" />;
}

/**
 * TripQuickStats - O3Pack-inspired quick stat cards
 * Shows weather and saved places count
 */
export default function TripQuickStats({
  weather,
  savedPlacesCount = 0,
  onWeatherClick,
  onSavedClick,
  className = '',
}: TripQuickStatsProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {/* Weather Card */}
      <button
        onClick={onWeatherClick}
        className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors text-center"
      >
        {weather ? (
          <>
            {getWeatherIcon(weather.condition)}
            <span className="mt-2 font-semibold text-gray-900 dark:text-white text-sm">
              {weather.formatted || `${weather.tempLow}°${weather.tempUnit}-${weather.tempHigh}°${weather.tempUnit}`}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Weather</span>
          </>
        ) : (
          <>
            <Thermometer className="w-6 h-6 text-gray-400" />
            <span className="mt-2 font-semibold text-gray-900 dark:text-white text-sm">--</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Weather</span>
          </>
        )}
      </button>

      {/* Saved Places Card */}
      <button
        onClick={onSavedClick}
        className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors text-center"
      >
        <MapPin className="w-6 h-6 text-gray-400" />
        <span className="mt-2 font-semibold text-gray-900 dark:text-white text-sm">
          {savedPlacesCount} Saved
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Explore places to go</span>
      </button>
    </div>
  );
}
