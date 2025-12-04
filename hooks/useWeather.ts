'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWeather, type WeatherData } from '@/lib/enrichment/weather';

// City coordinates for common destinations
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Europe
  'london': { lat: 51.5074, lng: -0.1278 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'barcelona': { lat: 41.3851, lng: 2.1734 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'berlin': { lat: 52.52, lng: 13.405 },
  'vienna': { lat: 48.2082, lng: 16.3738 },
  'prague': { lat: 50.0755, lng: 14.4378 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'milan': { lat: 45.4642, lng: 9.19 },
  'copenhagen': { lat: 55.6761, lng: 12.5683 },
  'stockholm': { lat: 59.3293, lng: 18.0686 },

  // Asia
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'kyoto': { lat: 35.0116, lng: 135.7681 },
  'osaka': { lat: 34.6937, lng: 135.5023 },
  'seoul': { lat: 37.5665, lng: 126.978 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'taipei': { lat: 25.033, lng: 121.5654 },
  'shanghai': { lat: 31.2304, lng: 121.4737 },
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'bali': { lat: -8.4095, lng: 115.1889 },

  // Americas
  'new york': { lat: 40.7128, lng: -74.006 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'mexico city': { lat: 19.4326, lng: -99.1332 },
  'buenos aires': { lat: -34.6037, lng: -58.3816 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'sao paulo': { lat: -23.5505, lng: -46.6333 },

  // Oceania
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'auckland': { lat: -36.8509, lng: 174.7645 },

  // Africa
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'marrakech': { lat: 31.6295, lng: -7.9811 },
  'cairo': { lat: 30.0444, lng: 31.2357 },
};

export interface WeatherState {
  data: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  isRaining: boolean;
  isBadWeather: boolean;
}

/**
 * Normalize city name for lookup
 */
function normalizeCity(city: string): string {
  return city.toLowerCase().trim();
}

/**
 * Get coordinates for a city by name
 */
function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  const normalized = normalizeCity(city);

  // Direct match
  if (CITY_COORDINATES[normalized]) {
    return CITY_COORDINATES[normalized];
  }

  // Partial match
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }

  return null;
}

/**
 * Check if weather code indicates rain
 */
function isRainyWeatherCode(code: number): boolean {
  const rainyCodes = new Set([
    51, 53, 55, // Drizzle
    61, 63, 65, // Rain
    80, 81, 82, // Rain showers
    95, 96, 99, // Thunderstorm
  ]);
  return rainyCodes.has(code);
}

/**
 * Check if weather code indicates bad weather
 */
function isBadWeatherCode(code: number): boolean {
  const badCodes = new Set([
    45, 48, // Fog
    51, 53, 55, // Drizzle
    61, 63, 65, // Rain
    71, 73, 75, 77, // Snow
    80, 81, 82, // Rain showers
    85, 86, // Snow showers
    95, 96, 99, // Thunderstorm
  ]);
  return badCodes.has(code);
}

/**
 * Hook to fetch and manage weather data for a city
 */
export function useWeather(
  city?: string | null,
  coordinates?: { lat: number; lng: number } | null
): WeatherState {
  const [state, setState] = useState<WeatherState>({
    data: null,
    isLoading: false,
    error: null,
    isRaining: false,
    isBadWeather: false,
  });

  const fetchWeatherData = useCallback(async () => {
    // Get coordinates from city name or use provided coordinates
    let coords: { lat: number; lng: number } | null = null;

    if (coordinates) {
      coords = coordinates;
    } else if (city) {
      coords = getCityCoordinates(city);
    }

    if (!coords) {
      setState({
        data: null,
        isLoading: false,
        error: city ? `Weather not available for ${city}` : null,
        isRaining: false,
        isBadWeather: false,
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await fetchWeather(coords.lat, coords.lng);

      if (data) {
        const isRaining = isRainyWeatherCode(data.current.weatherCode);
        const isBadWeather = isBadWeatherCode(data.current.weatherCode);

        setState({
          data,
          isLoading: false,
          error: null,
          isRaining,
          isBadWeather,
        });
      } else {
        setState({
          data: null,
          isLoading: false,
          error: 'Failed to fetch weather data',
          isRaining: false,
          isBadWeather: false,
        });
      }
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: 'Failed to fetch weather data',
        isRaining: false,
        isBadWeather: false,
      });
    }
  }, [city, coordinates?.lat, coordinates?.lng]);

  // Fetch weather on mount and when city/coordinates change
  useEffect(() => {
    if (city || coordinates) {
      fetchWeatherData();
    }
  }, [fetchWeatherData, city, coordinates?.lat, coordinates?.lng]);

  return state;
}

/**
 * Hook to get weather for a trip's destination
 */
export function useTripWeather(destination?: string | null): WeatherState {
  return useWeather(destination);
}

export default useWeather;
