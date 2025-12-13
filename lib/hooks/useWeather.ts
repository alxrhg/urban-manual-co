'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Weather data for a single day
 */
export interface DayWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  description: string;
  precipProbability: number;
}

/**
 * Weather API response shape
 */
interface WeatherAPIResponse {
  current: {
    temperature: number;
    weatherCode: number;
    weatherDescription: string;
    humidity: number;
    windSpeed: number;
    windDirection: number;
  };
  forecast: Array<{
    date: string;
    temperatureMax: number;
    temperatureMin: number;
    weatherCode: number;
    weatherDescription: string;
    precipitationProbability: number;
  }>;
  bestMonths: number[];
}

interface UseWeatherOptions {
  city: string;
  startDate?: string | null;
  enabled?: boolean;
}

interface UseWeatherResult {
  weatherByDate: Record<string, DayWeather>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Get weather code description
 */
function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    51: 'Light drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    80: 'Rain showers',
    95: 'Thunderstorm',
  };
  return weatherCodes[code] || 'Unknown';
}

/**
 * useWeather hook - fetches weather data using the server API endpoint
 *
 * Benefits over client-side fetch:
 * - Enables server-side caching
 * - Fewer re-renders (data is cached)
 * - Centralized error handling
 * - Consistent data format
 *
 * @param options - city name, start date, and enabled flag
 * @returns weather data by date, loading state, error, and refetch function
 */
export function useWeather({ city, startDate, enabled = true }: UseWeatherOptions): UseWeatherResult {
  const [weatherByDate, setWeatherByDate] = useState<Record<string, DayWeather>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!city || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      // First, geocode the city to get coordinates
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      );

      if (!geoResponse.ok) {
        throw new Error('Failed to geocode city');
      }

      const geoData = await geoResponse.json();
      if (!geoData.results?.[0]) {
        throw new Error(`City "${city}" not found`);
      }

      const { latitude, longitude } = geoData.results[0];

      // Fetch weather from our API endpoint (enables server-side caching)
      const weatherResponse = await fetch(
        `/api/weather?lat=${latitude}&lng=${longitude}`
      );

      if (!weatherResponse.ok) {
        // Fall back to direct Open-Meteo call if our API fails
        const directResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=14`
        );

        if (!directResponse.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const directData = await directResponse.json();

        if (directData.daily) {
          const weatherMap: Record<string, DayWeather> = {};

          directData.daily.time.forEach((date: string, i: number) => {
            weatherMap[date] = {
              date,
              tempMax: Math.round(directData.daily.temperature_2m_max[i]),
              tempMin: Math.round(directData.daily.temperature_2m_min[i]),
              weatherCode: directData.daily.weather_code[i],
              description: getWeatherDescription(directData.daily.weather_code[i]),
              precipProbability: directData.daily.precipitation_probability_max[i] || 0,
            };
          });

          setWeatherByDate(weatherMap);
        }
        return;
      }

      const weatherData: WeatherAPIResponse = await weatherResponse.json();

      // Convert API response to our format
      const weatherMap: Record<string, DayWeather> = {};

      weatherData.forecast.forEach((day) => {
        weatherMap[day.date] = {
          date: day.date,
          tempMax: Math.round(day.temperatureMax),
          tempMin: Math.round(day.temperatureMin),
          weatherCode: day.weatherCode,
          description: day.weatherDescription,
          precipProbability: day.precipitationProbability,
        };
      });

      setWeatherByDate(weatherMap);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch weather'));
    } finally {
      setLoading(false);
    }
  }, [city, enabled]);

  // Fetch weather when city or enabled state changes
  useEffect(() => {
    if (enabled && city && Object.keys(weatherByDate).length === 0) {
      fetchWeather();
    }
  }, [city, enabled, fetchWeather, weatherByDate]);

  return {
    weatherByDate,
    loading,
    error,
    refetch: fetchWeather,
  };
}

/**
 * Get weather icon component props based on weather code
 */
export function getWeatherIconProps(code: number): { name: string; className: string } {
  if (code === 0) return { name: 'Sun', className: 'text-yellow-500' };
  if (code === 1) return { name: 'CloudSun', className: 'text-yellow-400' };
  if (code === 2 || code === 3) return { name: 'Cloud', className: 'text-gray-400' };
  if (code === 45 || code === 48) return { name: 'Cloud', className: 'text-gray-500' };
  if (code >= 51 && code <= 65) return { name: 'CloudRain', className: 'text-blue-400' };
  if (code >= 71 && code <= 77) return { name: 'CloudSnow', className: 'text-blue-200' };
  if (code >= 80 && code <= 82) return { name: 'CloudRain', className: 'text-blue-500' };
  if (code >= 95) return { name: 'CloudLightning', className: 'text-yellow-600' };
  return { name: 'Cloud', className: 'text-gray-400' };
}
