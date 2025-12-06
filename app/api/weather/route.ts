/**
 * API Route: Get weather for a location
 * GET /api/weather?lat=...&lng=...
 * GET /api/weather?destination=...&startDate=...&endDate=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchWeather } from '@/lib/enrichment/weather';
import { withErrorHandling } from '@/lib/errors';

/**
 * Geocode a destination name to coordinates using Open-Meteo
 */
async function geocodeDestination(destination: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1`
    );
    const data = await response.json();

    if (data.results?.[0]) {
      return {
        lat: data.results[0].latitude,
        lng: data.results[0].longitude,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch extended forecast for trip dates
 */
async function fetchTripForecast(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<any> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max,relative_humidity_2m_mean&timezone=auto&forecast_days=16`
  );

  if (!response.ok) {
    throw new Error('Weather API error');
  }

  const data = await response.json();

  if (!data.daily) {
    return null;
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

  // Parse dates
  const tripStart = new Date(startDate);
  const tripEnd = endDate ? new Date(endDate) : tripStart;

  // Filter to trip dates and format response
  const forecast: any[] = [];
  data.daily.time.forEach((date: string, i: number) => {
    const dayDate = new Date(date);
    if (dayDate >= tripStart && dayDate <= tripEnd) {
      const { condition, icon } = getCondition(data.daily.weathercode[i]);
      forecast.push({
        date,
        temp: {
          min: Math.round(data.daily.temperature_2m_min[i]),
          max: Math.round(data.daily.temperature_2m_max[i]),
        },
        condition,
        icon,
        humidity: Math.round(data.daily.relative_humidity_2m_mean[i]),
        windSpeed: Math.round(data.daily.windspeed_10m_max[i]),
        precipitation: Math.round(data.daily.precipitation_sum[i] * 10) / 10,
      });
    }
  });

  return { forecast, coordinates: { lat, lng } };
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destination = searchParams.get('destination');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    let lat = parseFloat(searchParams.get('lat') || '0');
    let lng = parseFloat(searchParams.get('lng') || '0');

    // If destination provided, geocode it
    if (destination && (!lat || !lng)) {
      const coords = await geocodeDestination(destination);
      if (!coords) {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        );
      }
      lat = coords.lat;
      lng = coords.lng;
    }

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Location required (lat/lng or destination)' },
        { status: 400 }
      );
    }

    // If trip dates provided, return trip-specific forecast
    if (startDate) {
      const tripForecast = await fetchTripForecast(lat, lng, startDate, endDate || startDate);
      if (!tripForecast) {
        return NextResponse.json(
          { error: 'Weather data not available' },
          { status: 404 }
        );
      }
      return NextResponse.json(tripForecast);
    }

    // Otherwise return standard weather data
    const weather = await fetchWeather(lat, lng);

    if (!weather) {
      return NextResponse.json(
        { error: 'Weather data not available' },
        { status: 404 }
      );
    }

    return NextResponse.json(weather);
  } catch (error: any) {
    console.error('Error fetching weather:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather' },
      { status: 500 }
    );
  }
});

