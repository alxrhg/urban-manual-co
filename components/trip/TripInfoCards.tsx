'use client';

import { Sun, Cloud, CloudRain, Snowflake, MapPin, Image as ImageIcon } from 'lucide-react';

interface WeatherData {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  unit?: 'F' | 'C';
}

interface TripInfoCardsProps {
  weather?: WeatherData;
  savedPlacesCount?: number;
  galleryImagesCount?: number;
  onWeatherClick?: () => void;
  onSavedPlacesClick?: () => void;
  onGalleryClick?: () => void;
}

/**
 * TripInfoCards - Row of info cards showing weather, saved places, and gallery
 */
export default function TripInfoCards({
  weather,
  savedPlacesCount = 0,
  galleryImagesCount = 0,
  onWeatherClick,
  onSavedPlacesClick,
  onGalleryClick,
}: TripInfoCardsProps) {
  const getWeatherIcon = () => {
    if (!weather) return <Sun className="w-6 h-6" />;
    switch (weather.condition) {
      case 'sunny':
        return <Sun className="w-6 h-6 text-amber-500" />;
      case 'cloudy':
        return <Cloud className="w-6 h-6 text-gray-400" />;
      case 'rainy':
        return <CloudRain className="w-6 h-6 text-blue-500" />;
      case 'snowy':
        return <Snowflake className="w-6 h-6 text-blue-400" />;
      default:
        return <Sun className="w-6 h-6 text-amber-500" />;
    }
  };

  const getConditionText = () => {
    if (!weather) return 'Weather';
    switch (weather.condition) {
      case 'sunny':
        return 'Sunny';
      case 'cloudy':
        return 'Cloudy';
      case 'rainy':
        return 'Rainy';
      case 'snowy':
        return 'Snowy';
      default:
        return 'Weather';
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
      {/* Weather Card */}
      {weather && (
        <button
          onClick={onWeatherClick}
          className="flex-shrink-0 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 min-w-[120px] text-left hover:border-amber-300 dark:hover:border-amber-500/40 transition-colors"
        >
          <div className="mb-3">
            {getWeatherIcon()}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
            {weather.temp}°
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {getConditionText()}
          </div>
        </button>
      )}

      {/* Saved Places Card */}
      <button
        onClick={onSavedPlacesClick}
        className="flex-shrink-0 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 min-w-[120px] text-left hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      >
        <div className="mb-3">
          <MapPin className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
          {savedPlacesCount}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Saved Places
        </div>
      </button>

      {/* Gallery Card */}
      <button
        onClick={onGalleryClick}
        className="flex-shrink-0 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 min-w-[120px] text-left hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      >
        <div className="mb-3 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          View Gallery
        </div>
      </button>
    </div>
  );
}
