'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSnow, Loader2, Sun, Wind } from 'lucide-react';
import { parseDateString } from '@/lib/utils';

interface WeatherDay {
  date: string;
  temp: { min: number; max: number };
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
}

interface TripWeatherForecastProps {
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  latitude?: number;
  longitude?: number;
  compact?: boolean;
}

export default function TripWeatherForecast({
  destination,
  startDate,
  endDate,
  latitude,
  longitude,
  compact = false,
}: TripWeatherForecastProps) {
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!startDate) {
        setError('No trip dates set');
        setLoading(false);
        return;
      }

      // Check if trip is in the future (within 16 days for forecast)
      const start = parseDateString(startDate);
      const now = new Date();
      if (!start) {
        setError('Invalid date');
        setLoading(false);
        return;
      }

      const daysUntilTrip = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilTrip > 14) {
        setError('Weather available closer to trip');
        setLoading(false);
        return;
      }

      if (daysUntilTrip < -30) {
        setError('Trip has passed');
        setLoading(false);
        return;
      }

      if (!destination && !latitude && !longitude) {
        setError('No destination set');
        setLoading(false);
        return;
      }

      try {
        // Use internal API route to fetch weather (handles geocoding server-side)
        const params = new URLSearchParams();
        if (destination) params.set('destination', destination);
        if (latitude) params.set('lat', String(latitude));
        if (longitude) params.set('lng', String(longitude));
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const response = await fetch(`/api/weather?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || 'Weather data unavailable');
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.forecast || data.forecast.length === 0) {
          setError('Forecast not yet available');
        } else {
          setWeather(data.forecast);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Failed to load weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [destination, startDate, endDate, latitude, longitude]);

  const getWeatherIcon = (icon: string) => {
    switch (icon) {
      case 'sun':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'rain':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'snow':
        return <CloudSnow className="w-5 h-5 text-blue-300" />;
      default:
        return <Cloud className="w-5 h-5 text-stone-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = parseDateString(dateStr);
    if (!date) return dateStr;
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading weather...</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Cloud className="w-3 h-3" />
          <span>{error}</span>
        </div>
      );
    }
    return (
      <div className="text-center py-6 px-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
        <Cloud className="w-8 h-8 text-stone-300 mx-auto mb-2" />
        <p className="text-xs text-stone-500">{error}</p>
      </div>
    );
  }

  // Compact view: horizontal scrollable strip
  if (compact) {
    const avgTemp = Math.round(weather.reduce((sum, d) => sum + d.temp.max, 0) / weather.length);
    const rainyDays = weather.filter((d) => d.precipitation > 0).length;

    return (
      <div className="flex items-center gap-4 overflow-x-auto">
        {/* Summary */}
        <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 flex-shrink-0">
          <Sun className="w-4 h-4 text-yellow-500" />
          <span className="font-medium">{avgTemp}°C avg</span>
          {rainyDays > 0 && (
            <>
              <span className="text-stone-300">|</span>
              <CloudRain className="w-4 h-4 text-blue-500" />
              <span>{rainyDays} rainy {rainyDays === 1 ? 'day' : 'days'}</span>
            </>
          )}
        </div>

        {/* Compact day pills */}
        <div className="flex gap-1.5 overflow-x-auto">
          {weather.slice(0, 7).map((day) => (
            <div
              key={day.date}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 flex-shrink-0"
            >
              {getWeatherIcon(day.icon)}
              <span className="text-[10px] font-medium">{day.temp.max}°</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400">Weather Forecast</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {weather.map((day) => (
          <div
            key={day.date}
            className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-center"
          >
            <p className="text-[10px] text-stone-500 mb-1">{formatDate(day.date)}</p>
            <div className="flex justify-center mb-1">{getWeatherIcon(day.icon)}</div>
            <p className="text-xs font-medium">
              {day.temp.max}° / {day.temp.min}°
            </p>
            <p className="text-[10px] text-stone-500 mt-1">{day.condition}</p>
            {day.precipitation > 0 && (
              <p className="text-[10px] text-blue-500 mt-0.5">{day.precipitation}mm</p>
            )}
          </div>
        ))}
      </div>

      {/* Weather summary */}
      {weather.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-stone-500 pt-2">
          <div className="flex items-center gap-1">
            <Sun className="w-3 h-3" />
            <span>
              Avg: {Math.round(weather.reduce((sum, d) => sum + d.temp.max, 0) / weather.length)}°C
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3" />
            <span>
              Wind: {Math.round(weather.reduce((sum, d) => sum + d.windSpeed, 0) / weather.length)} km/h
            </span>
          </div>
          {weather.some((d) => d.precipitation > 0) && (
            <div className="flex items-center gap-1">
              <CloudRain className="w-3 h-3" />
              <span>
                Rain: {weather.filter((d) => d.precipitation > 0).length} days
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
