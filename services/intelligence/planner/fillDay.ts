import { recommendFromCurated, blendRecommendations } from './recommend';
import type { Recommendation } from './recommend';
import { estimateTransit, type Coordinates } from './transit';

interface Place {
  city: string;
  categories: string[];
  mealType?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

interface Day {
  city: string;
  date?: string;
  [key: string]: any;
}

// Legacy interface for backwards compatibility
interface DayPlan {
  breakfast: Place | null;
  lunch: Place | null;
  dinner: Place | null;
}

// New flexible TimeBlock interface
export interface TimeBlock {
  id: string;
  type: 'meal' | 'activity' | 'transit' | 'free';
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  place?: Place;
  isFlexible: boolean;
  /** Smart badge for UI display (e.g., "High Demand", "Rainy Day Option") */
  smartBadge?: string;
  /** Transit info to reach this block from previous */
  transitFromPrevious?: {
    durationMinutes: number;
    mode: string;
    distanceKm: number;
  };
}

export interface EnhancedDayPlan {
  dayNumber: number;
  date?: string;
  blocks: TimeBlock[];
  /** Total planned minutes */
  totalPlannedMinutes: number;
  /** Free time remaining in typical day (assuming 10 usable hours) */
  freeTimeMinutes: number;
  /** Weather consideration applied */
  weatherAdjusted?: boolean;
}

interface UserPreferences {
  cities: Record<string, number>;
  categories: Record<string, number>;
  priceLevels: Record<string, number>;
  michelinBias: number;
}

// Weather condition keywords
type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'hot' | 'cold';

// Categories to avoid in bad weather
const OUTDOOR_CATEGORIES = ['park', 'rooftop', 'walking tour', 'beach', 'garden', 'outdoor'];
// Categories to boost in bad weather
const INDOOR_CATEGORIES = ['museum', 'gallery', 'cafe', 'restaurant', 'spa', 'shopping', 'cinema'];

/**
 * Filter places based on weather conditions
 */
function applyWeatherFilter(
  places: Place[],
  weatherForecast?: string
): { filtered: Place[]; weatherAdjusted: boolean } {
  if (!weatherForecast) {
    return { filtered: places, weatherAdjusted: false };
  }

  const weather = weatherForecast.toLowerCase();
  const isBadWeather = weather.includes('rain') || weather.includes('snow') || weather.includes('storm');

  if (!isBadWeather) {
    return { filtered: places, weatherAdjusted: false };
  }

  // Filter out outdoor activities in bad weather
  const filtered = places.filter((place) => {
    const category = (place.categories?.[0] || '').toLowerCase();
    return !OUTDOOR_CATEGORIES.some((outdoor) => category.includes(outdoor));
  });

  // Boost indoor places to the front
  filtered.sort((a, b) => {
    const aCategory = (a.categories?.[0] || '').toLowerCase();
    const bCategory = (b.categories?.[0] || '').toLowerCase();
    const aIsIndoor = INDOOR_CATEGORIES.some((indoor) => aCategory.includes(indoor));
    const bIsIndoor = INDOOR_CATEGORIES.some((indoor) => bCategory.includes(indoor));

    if (aIsIndoor && !bIsIndoor) return -1;
    if (!aIsIndoor && bIsIndoor) return 1;
    return 0;
  });

  return { filtered, weatherAdjusted: true };
}

/**
 * Generate a unique ID for time blocks
 */
function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calculate transit block between two places
 */
function createTransitBlock(fromPlace: Place, toPlace: Place): TimeBlock | null {
  if (!fromPlace.latitude || !fromPlace.longitude || !toPlace.latitude || !toPlace.longitude) {
    return null;
  }

  const transit = estimateTransit(
    { lat: fromPlace.latitude, lng: fromPlace.longitude },
    { lat: toPlace.latitude, lng: toPlace.longitude }
  );

  // Only create transit block if distance is significant
  if (transit.distanceKm < 0.3) {
    return null;
  }

  return {
    id: generateBlockId(),
    type: 'transit',
    durationMinutes: transit.durationMinutes,
    isFlexible: false,
    transitFromPrevious: {
      durationMinutes: transit.durationMinutes,
      mode: transit.mode,
      distanceKm: transit.distanceKm,
    },
  };
}

/**
 * Legacy function: Generate day plan with meal slots
 * Kept for backwards compatibility
 */
export function generateDayPlan(
  day: Day,
  curated: Place[],
  google: Place[],
  userPrefs?: UserPreferences,
  weatherForecast?: string
): DayPlan {
  // Apply weather filtering
  const { filtered: filteredCurated, weatherAdjusted } = applyWeatherFilter(curated, weatherForecast);
  const { filtered: filteredGoogle } = applyWeatherFilter(google, weatherForecast);

  const meals = ['breakfast', 'lunch', 'dinner'];
  const output: DayPlan = {
    breakfast: null,
    lunch: null,
    dinner: null,
  };

  for (const meal of meals) {
    const curatedMeal = recommendFromCurated(day.city, meal, filteredCurated);
    const googleMeal: Recommendation[] = filteredGoogle
      .filter((p) => p.mealType === meal)
      .map((p) => ({ ...p, source: 'google' as const, score: 0.65 }));

    const suggestions = blendRecommendations(curatedMeal, googleMeal, userPrefs);
    const selected = suggestions[0] || null;

    // Add weather badge if adjusted
    if (selected && weatherAdjusted) {
      (selected as any).smartBadge = 'Rainy Day Option';
    }

    output[meal as keyof DayPlan] = selected;
  }

  return output;
}

/**
 * Generate enhanced day plan with flexible time blocks
 * New approach: context-aware, weather-adaptive scheduling
 */
export function generateEnhancedDayPlan(
  day: Day,
  curated: Place[],
  google: Place[],
  userPrefs?: UserPreferences,
  options?: {
    weatherForecast?: string;
    busyFactor?: number;
    includeTransit?: boolean;
  }
): EnhancedDayPlan {
  const { weatherForecast, busyFactor = 1.0, includeTransit = true } = options || {};

  // Apply weather filtering
  const { filtered: filteredCurated, weatherAdjusted } = applyWeatherFilter(curated, weatherForecast);
  const { filtered: filteredGoogle } = applyWeatherFilter(google, weatherForecast);

  const blocks: TimeBlock[] = [];
  let currentTime = 9 * 60; // Start at 9:00 AM (in minutes from midnight)

  // Define meal windows (in minutes from midnight)
  const mealWindows = [
    { type: 'breakfast', start: 8 * 60, end: 10 * 60, duration: 60 },
    { type: 'lunch', start: 12 * 60, end: 14 * 60, duration: 75 },
    { type: 'dinner', start: 19 * 60, end: 21 * 60, duration: 90 },
  ];

  // Add meal blocks
  let prevPlace: Place | null = null;
  for (const mealWindow of mealWindows) {
    const curatedMeal = recommendFromCurated(day.city, mealWindow.type, filteredCurated);
    const googleMeal: Recommendation[] = filteredGoogle
      .filter((p) => p.mealType === mealWindow.type)
      .map((p) => ({ ...p, source: 'google' as const, score: 0.65 }));

    const suggestions = blendRecommendations(curatedMeal, googleMeal, userPrefs);
    const selected = suggestions[0] || null;

    // Add transit block if needed
    if (includeTransit && prevPlace && selected) {
      const transitBlock = createTransitBlock(prevPlace, selected);
      if (transitBlock) {
        transitBlock.startTime = formatTime(currentTime);
        currentTime += transitBlock.durationMinutes;
        transitBlock.endTime = formatTime(currentTime);
        blocks.push(transitBlock);
      }
    }

    // Calculate duration with busy factor
    const adjustedDuration = Math.ceil(mealWindow.duration * busyFactor);

    const mealBlock: TimeBlock = {
      id: generateBlockId(),
      type: 'meal',
      startTime: formatTime(Math.max(currentTime, mealWindow.start)),
      durationMinutes: adjustedDuration,
      place: selected || undefined,
      isFlexible: true,
      smartBadge: weatherAdjusted && selected ? 'Rainy Day Option' : undefined,
    };

    currentTime = Math.max(currentTime, mealWindow.start) + adjustedDuration;
    mealBlock.endTime = formatTime(currentTime);
    blocks.push(mealBlock);

    if (selected) {
      prevPlace = selected;
    }
  }

  // Calculate totals
  const totalPlannedMinutes = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
  const usableDayMinutes = 10 * 60; // 10 hours
  const freeTimeMinutes = Math.max(0, usableDayMinutes - totalPlannedMinutes);

  return {
    dayNumber: 1,
    date: day.date,
    blocks,
    totalPlannedMinutes,
    freeTimeMinutes,
    weatherAdjusted,
  };
}

/**
 * Format minutes from midnight to HH:MM string
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

