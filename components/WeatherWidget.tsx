'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye } from 'lucide-react';

interface WeatherData {
  temperature: number;
  feels_like: number;
  humidity: number;
  description: string;
  wind_speed: number;
  visibility: number;
  icon: string;
}

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  locationName?: string;
}

export function WeatherWidget({ lat, lng, locationName }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!lat || !lng) {
      setLoading(false);
      return;
    }

    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then(res => {
        if (!res.ok) throw new Error('Weather not available');
        return res.json();
      })
      .then(data => {
        setWeather(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [lat, lng]);

  if (loading) {
    return (
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain')) return <CloudRain className="h-8 w-8 text-blue-500" />;
    if (desc.includes('cloud')) return <Cloud className="h-8 w-8 text-gray-500" />;
    return <Sun className="h-8 w-8 text-yellow-500" />;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Current Weather
          </h3>
          {locationName && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{locationName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getWeatherIcon(weather.description)}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {Math.round(weather.temperature)}°
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
            {weather.description}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Wind className="h-3.5 w-3.5" />
            <span>Wind: {Math.round(weather.wind_speed)} km/h</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Droplets className="h-3.5 w-3.5" />
            <span>Humidity: {weather.humidity}%</span>
          </div>
        </div>

        {weather.feels_like && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
            Feels like {Math.round(weather.feels_like)}°
          </div>
        )}
      </div>
    </div>
  );
}
