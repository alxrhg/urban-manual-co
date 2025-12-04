/**
 * Contextual AI Suggestions
 * Generates smart, context-aware suggestions based on:
 * - Hotel location (breakfast near hotel)
 * - Current location/map position (what's nearby?)
 * - Current time (open now filter)
 * - Weather conditions (indoor suggestions when raining)
 */

import { isIndoorCategory, isOutdoorCategory } from './trip-intelligence';

export interface ContextualSuggestion {
  id: string;
  type: 'hotel_breakfast' | 'nearby' | 'open_now' | 'weather_aware' | 'time_based';
  text: string;
  subtext?: string;
  priority: number;
  action: {
    type: 'search' | 'filter' | 'add_place';
    category?: string;
    location?: { lat: number; lng: number };
    radiusKm?: number;
    filters?: Record<string, unknown>;
  };
  icon?: 'coffee' | 'map-pin' | 'clock' | 'cloud-rain' | 'sun';
}

export interface TripContext {
  hotels: Array<{
    id: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    checkInDate?: string | null;
    checkOutDate?: string | null;
  }>;
  currentDayNumber: number;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  existingCategories: Set<string>;
  city?: string;
}

export interface WeatherContext {
  isRaining: boolean;
  weatherCode: number;
  temperature: number;
  description: string;
}

export interface TimeContext {
  currentHour: number;
  currentMinute: number;
  dayOfWeek: number; // 0 = Sunday
  isWeekend: boolean;
}

/**
 * Weather codes that indicate rain/bad weather
 * Based on Open-Meteo weather codes
 */
const RAINY_WEATHER_CODES = new Set([
  51, 53, 55, // Drizzle
  61, 63, 65, // Rain
  80, 81, 82, // Rain showers
  95, 96, 99, // Thunderstorm
]);

const BAD_WEATHER_CODES = new Set([
  ...RAINY_WEATHER_CODES,
  45, 48, // Fog
  71, 73, 75, 77, // Snow
  85, 86, // Snow showers
]);

/**
 * Check if weather code indicates rain
 */
export function isRainyWeather(weatherCode: number): boolean {
  return RAINY_WEATHER_CODES.has(weatherCode);
}

/**
 * Check if weather code indicates bad weather (rain, snow, fog)
 */
export function isBadWeather(weatherCode: number): boolean {
  return BAD_WEATHER_CODES.has(weatherCode);
}

/**
 * Get time of day label
 */
export function getTimeOfDayLabel(hour: number): string {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get category suggestions based on time of day
 */
export function getTimeBasedCategories(hour: number): string[] {
  const timeOfDay = getTimeOfDayLabel(hour);

  switch (timeOfDay) {
    case 'morning':
      return ['cafe', 'bakery', 'coffee shop', 'breakfast'];
    case 'lunch':
      return ['restaurant', 'cafe', 'food market'];
    case 'afternoon':
      return ['museum', 'gallery', 'park', 'shopping'];
    case 'evening':
      return ['restaurant', 'fine dining', 'bar'];
    case 'night':
      return ['bar', 'cocktail bar', 'nightclub'];
    default:
      return ['cafe', 'restaurant'];
  }
}

/**
 * Generate hotel-based suggestions (e.g., "Add breakfast near [hotel]")
 */
export function generateHotelSuggestions(
  tripContext: TripContext,
  timeContext: TimeContext
): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = [];

  if (tripContext.hotels.length === 0) return suggestions;

  // Find the hotel for the current day
  const currentHotel = tripContext.hotels.find((hotel) => {
    // Simple logic: use the first hotel with coordinates
    return hotel.latitude && hotel.longitude;
  });

  if (!currentHotel || !currentHotel.latitude || !currentHotel.longitude) {
    return suggestions;
  }

  const timeOfDay = getTimeOfDayLabel(timeContext.currentHour);

  // Morning suggestions near hotel
  if (timeOfDay === 'morning' && !tripContext.existingCategories.has('cafe') && !tripContext.existingCategories.has('breakfast')) {
    suggestions.push({
      id: `breakfast-near-${currentHotel.id}`,
      type: 'hotel_breakfast',
      text: `Add breakfast near ${currentHotel.name}`,
      subtext: 'Start your day with a great cafe nearby',
      priority: 10,
      action: {
        type: 'search',
        category: 'cafe',
        location: { lat: currentHotel.latitude, lng: currentHotel.longitude },
        radiusKm: 0.5,
      },
      icon: 'coffee',
    });
  }

  // Evening suggestions near hotel
  if (timeOfDay === 'evening' && !tripContext.existingCategories.has('bar')) {
    suggestions.push({
      id: `drinks-near-${currentHotel.id}`,
      type: 'hotel_breakfast',
      text: `Add evening drinks near ${currentHotel.name}`,
      subtext: 'End your day with a nightcap nearby',
      priority: 7,
      action: {
        type: 'search',
        category: 'bar',
        location: { lat: currentHotel.latitude, lng: currentHotel.longitude },
        radiusKm: 0.5,
      },
      icon: 'map-pin',
    });
  }

  return suggestions;
}

/**
 * Generate "What's nearby?" suggestions based on a location
 */
export function generateNearbySuggestions(
  location: { lat: number; lng: number },
  timeContext: TimeContext,
  existingCategories: Set<string>
): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = [];
  const timeBasedCategories = getTimeBasedCategories(timeContext.currentHour);

  // Main "What's nearby?" suggestion
  suggestions.push({
    id: 'whats-nearby',
    type: 'nearby',
    text: "What's nearby?",
    subtext: 'Discover places within walking distance',
    priority: 9,
    action: {
      type: 'search',
      location,
      radiusKm: 1,
    },
    icon: 'map-pin',
  });

  // Time-appropriate nearby suggestions
  const relevantCategory = timeBasedCategories.find(cat => !existingCategories.has(cat));
  if (relevantCategory) {
    suggestions.push({
      id: `nearby-${relevantCategory}`,
      type: 'nearby',
      text: `Find ${relevantCategory} nearby`,
      subtext: `Perfect for ${getTimeOfDayLabel(timeContext.currentHour)}`,
      priority: 8,
      action: {
        type: 'search',
        category: relevantCategory,
        location,
        radiusKm: 0.8,
      },
      icon: 'map-pin',
    });
  }

  return suggestions;
}

/**
 * Generate "Open now" time-aware suggestions
 */
export function generateOpenNowSuggestions(
  timeContext: TimeContext,
  city?: string
): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = [];
  const timeOfDay = getTimeOfDayLabel(timeContext.currentHour);
  const categories = getTimeBasedCategories(timeContext.currentHour);

  // Primary "Open now" filter suggestion
  suggestions.push({
    id: 'open-now-filter',
    type: 'open_now',
    text: 'Show places open now',
    subtext: `Filter to places open at ${formatTime(timeContext.currentHour, timeContext.currentMinute)}`,
    priority: 8,
    action: {
      type: 'filter',
      filters: {
        openNow: true,
        currentHour: timeContext.currentHour,
      },
    },
    icon: 'clock',
  });

  // Time-specific suggestions
  if (timeOfDay === 'morning' && timeContext.currentHour >= 7 && timeContext.currentHour < 10) {
    suggestions.push({
      id: 'breakfast-open',
      type: 'time_based',
      text: 'Breakfast spots open now',
      subtext: 'Cafes and bakeries serving now',
      priority: 9,
      action: {
        type: 'search',
        category: 'cafe',
        filters: { openNow: true },
      },
      icon: 'coffee',
    });
  }

  if (timeOfDay === 'lunch') {
    suggestions.push({
      id: 'lunch-open',
      type: 'time_based',
      text: 'Lunch options open now',
      subtext: 'Restaurants ready to serve',
      priority: 9,
      action: {
        type: 'search',
        category: 'restaurant',
        filters: { openNow: true },
      },
      icon: 'clock',
    });
  }

  if (timeOfDay === 'evening' || timeOfDay === 'night') {
    suggestions.push({
      id: 'dinner-open',
      type: 'time_based',
      text: 'Dinner spots open now',
      subtext: 'Restaurants accepting diners',
      priority: 9,
      action: {
        type: 'search',
        category: 'restaurant',
        filters: { openNow: true },
      },
      icon: 'clock',
    });
  }

  // Late night suggestions
  if (timeContext.currentHour >= 22 || timeContext.currentHour < 2) {
    suggestions.push({
      id: 'late-night',
      type: 'time_based',
      text: 'Late night spots',
      subtext: 'Bars and venues open late',
      priority: 7,
      action: {
        type: 'search',
        category: 'bar',
        filters: { openNow: true },
      },
      icon: 'clock',
    });
  }

  return suggestions;
}

/**
 * Generate weather-aware suggestions
 */
export function generateWeatherSuggestions(
  weatherContext: WeatherContext,
  existingCategories: Set<string>
): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = [];

  if (isRainyWeather(weatherContext.weatherCode)) {
    // Indoor activity suggestions when raining
    const indoorCategories = ['museum', 'gallery', 'cafe', 'shopping', 'spa'];
    const availableIndoor = indoorCategories.filter(cat => !existingCategories.has(cat));

    suggestions.push({
      id: 'rainy-indoor',
      type: 'weather_aware',
      text: 'Indoor activities for rainy weather',
      subtext: `It's ${weatherContext.description.toLowerCase()} - stay dry!`,
      priority: 10,
      action: {
        type: 'filter',
        filters: {
          indoor: true,
          categories: availableIndoor,
        },
      },
      icon: 'cloud-rain',
    });

    if (!existingCategories.has('museum') && !existingCategories.has('gallery')) {
      suggestions.push({
        id: 'rainy-museum',
        type: 'weather_aware',
        text: 'Visit a museum',
        subtext: 'Perfect weather for exploring exhibitions',
        priority: 9,
        action: {
          type: 'search',
          category: 'museum',
        },
        icon: 'cloud-rain',
      });
    }

    if (!existingCategories.has('cafe')) {
      suggestions.push({
        id: 'rainy-cafe',
        type: 'weather_aware',
        text: 'Cozy cafe retreat',
        subtext: 'Wait out the rain with good coffee',
        priority: 8,
        action: {
          type: 'search',
          category: 'cafe',
        },
        icon: 'coffee',
      });
    }
  } else if (weatherContext.temperature > 25) {
    // Hot weather suggestions
    suggestions.push({
      id: 'hot-indoor',
      type: 'weather_aware',
      text: 'Beat the heat indoors',
      subtext: `${weatherContext.temperature}°C - cool off inside`,
      priority: 7,
      action: {
        type: 'filter',
        filters: { indoor: true },
      },
      icon: 'sun',
    });
  } else if (!isBadWeather(weatherContext.weatherCode) && weatherContext.temperature >= 15 && weatherContext.temperature <= 25) {
    // Perfect weather for outdoor activities
    if (!existingCategories.has('park') && !existingCategories.has('garden')) {
      suggestions.push({
        id: 'good-weather-outdoor',
        type: 'weather_aware',
        text: 'Great weather for outdoors',
        subtext: `${weatherContext.temperature}°C and ${weatherContext.description.toLowerCase()}`,
        priority: 6,
        action: {
          type: 'search',
          category: 'park',
        },
        icon: 'sun',
      });
    }
  }

  return suggestions;
}

/**
 * Get all contextual suggestions based on current context
 */
export function getContextualSuggestions(
  tripContext: TripContext,
  timeContext: TimeContext,
  weatherContext?: WeatherContext | null,
  userLocation?: { lat: number; lng: number } | null
): ContextualSuggestion[] {
  const allSuggestions: ContextualSuggestion[] = [];

  // Hotel-based suggestions
  const hotelSuggestions = generateHotelSuggestions(tripContext, timeContext);
  allSuggestions.push(...hotelSuggestions);

  // Nearby suggestions if user location is available
  if (userLocation) {
    const nearbySuggestions = generateNearbySuggestions(
      userLocation,
      timeContext,
      tripContext.existingCategories
    );
    allSuggestions.push(...nearbySuggestions);
  }

  // Time-aware "Open now" suggestions
  const openNowSuggestions = generateOpenNowSuggestions(timeContext, tripContext.city);
  allSuggestions.push(...openNowSuggestions);

  // Weather-aware suggestions
  if (weatherContext) {
    const weatherSuggestions = generateWeatherSuggestions(
      weatherContext,
      tripContext.existingCategories
    );
    allSuggestions.push(...weatherSuggestions);
  }

  // Sort by priority (highest first) and limit to top suggestions
  return allSuggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);
}

/**
 * Get current time context
 */
export function getCurrentTimeContext(): TimeContext {
  const now = new Date();
  const dayOfWeek = now.getDay();

  return {
    currentHour: now.getHours(),
    currentMinute: now.getMinutes(),
    dayOfWeek,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  };
}

/**
 * Format time for display
 */
function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filter destinations by proximity to a location
 */
export function filterByProximity<T extends { latitude?: number | null; longitude?: number | null }>(
  items: T[],
  center: { lat: number; lng: number },
  radiusKm: number
): T[] {
  return items.filter(item => {
    if (!item.latitude || !item.longitude) return false;
    const distance = calculateDistanceKm(
      center.lat,
      center.lng,
      item.latitude,
      item.longitude
    );
    return distance <= radiusKm;
  });
}
