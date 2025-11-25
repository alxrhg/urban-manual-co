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
    const fetchWeather = async () => {
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

      try {
        // Use Open-Meteo API (free, no API key required)
        let lat = latitude;
        let lon = longitude;

        // If no coordinates, try to geocode the destination
        if (!lat || !lon) {
          if (!destination) {
            setError('No destination set');
            setLoading(false);
            return;
          }

          // Use Open-Meteo geocoding
          const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1`
          );
          const geoData = await geoResponse.json();

          if (!geoData.results?.[0]) {
            setError('Location not found');
            setLoading(false);
            return;
          }

          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
        }

        // Fetch weather forecast
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max,relative_humidity_2m_mean&timezone=auto&forecast_days=16`
        );
        const weatherData = await weatherResponse.json();

        if (!weatherData.daily) {
          setError('Weather data unavailable');
          setLoading(false);
          return;
        }

        // Map weather codes to conditions
        const getCondition = (code: number): { condition: string; icon: string } => {
          if (code === 0) return { condition: 'Clear', icon: 'sun' };
          if (code <= 3) return { condition: 'Partly Cloudy', icon: 'cloud' };
          if (code <= 49) return { condition: 'Foggy', icon: 'cloud' };
          if (code <= 59) return { condition: 'Drizzle', icon: 'rain' };
          if (code <= 69) return { condition: 'Rain', icon: 'rain' };
          if (code <= 79) return { condition: 'Snow', icon: 'snow' };
          if (code <= 99) return { condition: 'Thunderstorm', icon: 'rain' };
          return { condition: 'Unknown', icon: 'cloud' };
        };

        // Filter to trip dates
        const tripStart = parseDateString(startDate);
        const tripEnd = parseDateString(endDate) || tripStart;

        const forecastDays: WeatherDay[] = [];
        weatherData.daily.time.forEach((date: string, i: number) => {
          const dayDate = parseDateString(date);
          if (dayDate && tripStart && tripEnd && dayDate >= tripStart && dayDate <= tripEnd) {
            const { condition, icon } = getCondition(weatherData.daily.weathercode[i]);
            forecastDays.push({
              date,
              temp: {
                min: Math.round(weatherData.daily.temperature_2m_min[i]),
                max: Math.round(weatherData.daily.temperature_2m_max[i]),
              },
              condition,
              icon,
              humidity: Math.round(weatherData.daily.relative_humidity_2m_mean[i]),
              windSpeed: Math.round(weatherData.daily.windspeed_10m_max[i]),
              precipitation: Math.round(weatherData.daily.precipitation_sum[i] * 10) / 10,
            });
          }
        });

        if (forecastDays.length === 0) {
          setError('Forecast not yet available');
        } else {
          setWeather(forecastDays);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Failed to load weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
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
        return <Cloud className="w-5 h-5 text-gray-400" />;
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
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading weather...</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Cloud className="w-3 h-3" />
          <span>{error}</span>
        </div>
      );
    }
    return (
      <div className="text-center py-6 px-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
        <Cloud className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-500">{error}</p>
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
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
          <Sun className="w-4 h-4 text-yellow-500" />
          <span className="font-medium">{avgTemp}°C avg</span>
          {rainyDays > 0 && (
            <>
              <span className="text-gray-300">|</span>
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
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0"
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
      <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">Weather Forecast</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {weather.map((day) => (
          <div
            key={day.date}
            className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-center"
          >
            <p className="text-[10px] text-gray-500 mb-1">{formatDate(day.date)}</p>
            <div className="flex justify-center mb-1">{getWeatherIcon(day.icon)}</div>
            <p className="text-xs font-medium">
              {day.temp.max}° / {day.temp.min}°
            </p>
            <p className="text-[10px] text-gray-500 mt-1">{day.condition}</p>
            {day.precipitation > 0 && (
              <p className="text-[10px] text-blue-500 mt-0.5">{day.precipitation}mm</p>
            )}
          </div>
        ))}
      </div>

      {/* Weather summary */}
      {weather.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2">
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
