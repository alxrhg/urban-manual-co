import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { fetchWeather } from '@/lib/enrichment/weather';
import {
  getContextualSuggestions,
  getCurrentTimeContext,
  filterByProximity,
  isRainyWeather,
  type TripContext,
  type WeatherContext,
} from '@/lib/contextual-suggestions';
import { isIndoorCategory } from '@/lib/trip-intelligence';

// City coordinates for weather lookup
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'london': { lat: 51.5074, lng: -0.1278 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'new york': { lat: 40.7128, lng: -74.006 },
  'barcelona': { lat: 41.3851, lng: 2.1734 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'berlin': { lat: 52.52, lng: 13.405 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'seoul': { lat: 37.5665, lng: 126.978 },
  'taipei': { lat: 25.033, lng: 121.5654 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
};

/**
 * Get city coordinates by name
 */
function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  const normalized = city.toLowerCase().trim();

  if (CITY_COORDINATES[normalized]) {
    return CITY_COORDINATES[normalized];
  }

  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }

  return null;
}

interface RequestBody {
  city?: string;
  hotels?: Array<{
    id: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  existingCategories?: string[];
  currentDayNumber?: number;
  userLocation?: { lat: number; lng: number };
  includeWeather?: boolean;
}

/**
 * POST /api/intelligence/contextual-ai-suggestions
 * Get contextual AI suggestions based on trip context, weather, and time
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: RequestBody = await request.json();
  const {
    city,
    hotels = [],
    existingCategories = [],
    currentDayNumber = 1,
    userLocation,
    includeWeather = true,
  } = body;

  // Get current time context
  const timeContext = getCurrentTimeContext();

  // Fetch weather if city is provided
  let weatherContext: WeatherContext | null = null;

  if (city && includeWeather) {
    const coords = getCityCoordinates(city);
    if (coords) {
      const weatherData = await fetchWeather(coords.lat, coords.lng);
      if (weatherData) {
        weatherContext = {
          isRaining: isRainyWeather(weatherData.current.weatherCode),
          weatherCode: weatherData.current.weatherCode,
          temperature: weatherData.current.temperature,
          description: weatherData.current.weatherDescription,
        };
      }
    }
  }

  // Build trip context
  const tripContext: TripContext = {
    hotels,
    currentDayNumber,
    existingCategories: new Set(existingCategories),
    city: city || undefined,
  };

  // Generate suggestions
  const suggestions = getContextualSuggestions(
    tripContext,
    timeContext,
    weatherContext,
    userLocation
  );

  // If weather indicates rain, also fetch indoor destination suggestions
  let weatherAwarePlaces: any[] = [];

  if (city && weatherContext?.isRaining) {
    const supabase = await createServerClient();

    // Fetch indoor-friendly destinations
    const { data: destinations } = await supabase
      .from('destinations')
      .select('id, slug, name, category, rating, image_thumbnail, latitude, longitude')
      .ilike('city', `%${city}%`)
      .limit(20);

    if (destinations) {
      // Filter for indoor categories
      weatherAwarePlaces = destinations
        .filter(d => isIndoorCategory(d.category))
        .slice(0, 5);
    }
  }

  // If user location is provided, fetch nearby places
  let nearbyPlaces: any[] = [];

  if (userLocation && city) {
    const supabase = await createServerClient();

    const { data: destinations } = await supabase
      .from('destinations')
      .select('id, slug, name, category, rating, image_thumbnail, latitude, longitude')
      .ilike('city', `%${city}%`)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(50);

    if (destinations) {
      // Filter by proximity (within 1km)
      nearbyPlaces = filterByProximity(destinations, userLocation, 1).slice(0, 5);
    }
  }

  return NextResponse.json({
    suggestions,
    weather: weatherContext ? {
      temperature: weatherContext.temperature,
      description: weatherContext.description,
      isRaining: weatherContext.isRaining,
    } : null,
    weatherAwarePlaces,
    nearbyPlaces,
    timeContext: {
      currentHour: timeContext.currentHour,
      isWeekend: timeContext.isWeekend,
    },
  });
});

/**
 * GET /api/intelligence/contextual-ai-suggestions
 * Get contextual AI suggestions with query params
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;

  const city = searchParams.get('city') || undefined;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const includeWeather = searchParams.get('includeWeather') !== 'false';

  const userLocation = lat && lng
    ? { lat: parseFloat(lat), lng: parseFloat(lng) }
    : undefined;

  // Get current time context
  const timeContext = getCurrentTimeContext();

  // Fetch weather if city is provided
  let weatherContext: WeatherContext | null = null;

  if (city && includeWeather) {
    const coords = getCityCoordinates(city);
    if (coords) {
      const weatherData = await fetchWeather(coords.lat, coords.lng);
      if (weatherData) {
        weatherContext = {
          isRaining: isRainyWeather(weatherData.current.weatherCode),
          weatherCode: weatherData.current.weatherCode,
          temperature: weatherData.current.temperature,
          description: weatherData.current.weatherDescription,
        };
      }
    }
  }

  // Build minimal trip context
  const tripContext: TripContext = {
    hotels: [],
    currentDayNumber: 1,
    existingCategories: new Set(),
    city,
  };

  // Generate suggestions
  const suggestions = getContextualSuggestions(
    tripContext,
    timeContext,
    weatherContext,
    userLocation
  );

  return NextResponse.json({
    suggestions,
    weather: weatherContext ? {
      temperature: weatherContext.temperature,
      description: weatherContext.description,
      isRaining: weatherContext.isRaining,
    } : null,
    timeContext: {
      currentHour: timeContext.currentHour,
      isWeekend: timeContext.isWeekend,
    },
  });
});
