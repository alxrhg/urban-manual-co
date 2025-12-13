/**
 * Trip Intelligence Utilities
 * Smart time-boxing, weather routing, and crowd prediction
 */

// Default duration estimates by category (in minutes)
export const CATEGORY_DURATIONS: Record<string, number> = {
  // Museums & Culture
  'museum': 180,
  'art museum': 180,
  'history museum': 150,
  'science museum': 180,
  'gallery': 90,
  'exhibition': 120,
  'cultural center': 90,
  'heritage site': 120,

  // Food & Drink
  'restaurant': 90,
  'fine dining': 150,
  'cafe': 45,
  'coffee shop': 30,
  'bakery': 30,
  'bar': 90,
  'wine bar': 90,
  'cocktail bar': 90,
  'pub': 90,
  'food market': 120,
  'street food': 45,

  // Shopping
  'shopping': 90,
  'department store': 120,
  'boutique': 45,
  'market': 90,
  'flea market': 120,

  // Outdoor & Nature
  'park': 90,
  'garden': 75,
  'botanical garden': 120,
  'beach': 180,
  'hiking': 240,
  'nature reserve': 180,
  'viewpoint': 30,
  'observation deck': 45,

  // Entertainment
  'theater': 180,
  'cinema': 150,
  'concert hall': 180,
  'nightclub': 180,
  'comedy club': 120,

  // Landmarks & Attractions
  'landmark': 60,
  'monument': 30,
  'temple': 60,
  'shrine': 45,
  'church': 45,
  'cathedral': 60,
  'castle': 120,
  'palace': 150,
  'historic site': 90,
  'zoo': 240,
  'aquarium': 180,
  'theme park': 360,
  'amusement park': 360,

  // Wellness
  'spa': 180,
  'onsen': 150,
  'gym': 90,

  // Default
  'default': 60,
};

// Categories that are primarily outdoor activities
export const OUTDOOR_CATEGORIES = new Set([
  'park',
  'garden',
  'botanical garden',
  'beach',
  'hiking',
  'nature reserve',
  'viewpoint',
  'outdoor market',
  'flea market',
  'street food',
  'rooftop bar',
  'zoo',
  'theme park',
  'amusement park',
]);

// Categories that are primarily indoor activities
export const INDOOR_CATEGORIES = new Set([
  'museum',
  'art museum',
  'history museum',
  'science museum',
  'gallery',
  'exhibition',
  'restaurant',
  'fine dining',
  'cafe',
  'coffee shop',
  'bar',
  'wine bar',
  'cocktail bar',
  'pub',
  'shopping',
  'department store',
  'boutique',
  'theater',
  'cinema',
  'concert hall',
  'spa',
  'aquarium',
]);

// Activity intensity scores (physical effort 0-10, mental effort 0-10)
// Used for fatigue prediction and activity balancing
export const CATEGORY_INTENSITY: Record<string, { physical: number; mental: number; type: 'cultural' | 'dining' | 'active' | 'leisure' | 'nightlife' }> = {
  // Cultural - high mental, low physical (standing fatigue)
  'museum': { physical: 4, mental: 7, type: 'cultural' },
  'art museum': { physical: 4, mental: 8, type: 'cultural' },
  'history museum': { physical: 4, mental: 7, type: 'cultural' },
  'science museum': { physical: 5, mental: 7, type: 'cultural' },
  'gallery': { physical: 3, mental: 6, type: 'cultural' },
  'exhibition': { physical: 3, mental: 6, type: 'cultural' },
  'cultural center': { physical: 3, mental: 5, type: 'cultural' },
  'heritage site': { physical: 5, mental: 6, type: 'cultural' },
  'temple': { physical: 4, mental: 4, type: 'cultural' },
  'shrine': { physical: 4, mental: 4, type: 'cultural' },
  'church': { physical: 2, mental: 3, type: 'cultural' },
  'cathedral': { physical: 3, mental: 4, type: 'cultural' },
  'castle': { physical: 6, mental: 5, type: 'cultural' },
  'palace': { physical: 5, mental: 6, type: 'cultural' },
  'historic site': { physical: 5, mental: 5, type: 'cultural' },

  // Active/Outdoor - high physical
  'park': { physical: 4, mental: 2, type: 'active' },
  'garden': { physical: 4, mental: 3, type: 'active' },
  'botanical garden': { physical: 5, mental: 4, type: 'active' },
  'beach': { physical: 3, mental: 1, type: 'leisure' },
  'hiking': { physical: 9, mental: 3, type: 'active' },
  'nature reserve': { physical: 7, mental: 3, type: 'active' },
  'viewpoint': { physical: 3, mental: 2, type: 'active' },
  'observation deck': { physical: 2, mental: 2, type: 'active' },
  'zoo': { physical: 7, mental: 4, type: 'active' },
  'aquarium': { physical: 4, mental: 4, type: 'cultural' },
  'theme park': { physical: 8, mental: 3, type: 'active' },
  'amusement park': { physical: 8, mental: 3, type: 'active' },

  // Dining - low intensity, restorative
  'restaurant': { physical: 1, mental: 2, type: 'dining' },
  'fine dining': { physical: 1, mental: 3, type: 'dining' },
  'cafe': { physical: 1, mental: 1, type: 'dining' },
  'coffee shop': { physical: 1, mental: 1, type: 'dining' },
  'bakery': { physical: 1, mental: 1, type: 'dining' },
  'bar': { physical: 1, mental: 2, type: 'nightlife' },
  'wine bar': { physical: 1, mental: 2, type: 'nightlife' },
  'cocktail bar': { physical: 1, mental: 2, type: 'nightlife' },
  'pub': { physical: 1, mental: 2, type: 'nightlife' },
  'food market': { physical: 4, mental: 3, type: 'active' },
  'street food': { physical: 2, mental: 2, type: 'dining' },

  // Shopping - moderate physical (walking/standing)
  'shopping': { physical: 5, mental: 3, type: 'active' },
  'department store': { physical: 5, mental: 3, type: 'active' },
  'boutique': { physical: 3, mental: 2, type: 'leisure' },
  'market': { physical: 5, mental: 3, type: 'active' },
  'flea market': { physical: 6, mental: 3, type: 'active' },

  // Entertainment - seated, mentally engaging
  'theater': { physical: 1, mental: 5, type: 'cultural' },
  'cinema': { physical: 1, mental: 4, type: 'leisure' },
  'concert hall': { physical: 1, mental: 5, type: 'cultural' },
  'nightclub': { physical: 6, mental: 2, type: 'nightlife' },
  'comedy club': { physical: 1, mental: 3, type: 'leisure' },

  // Wellness - restorative
  'spa': { physical: 1, mental: 1, type: 'leisure' },
  'onsen': { physical: 1, mental: 1, type: 'leisure' },
  'gym': { physical: 8, mental: 2, type: 'active' },

  // Landmarks
  'landmark': { physical: 3, mental: 3, type: 'cultural' },
  'monument': { physical: 2, mental: 2, type: 'cultural' },

  // Default
  'default': { physical: 3, mental: 3, type: 'leisure' },
};

/**
 * Get estimated duration for a place based on its category
 */
export function getEstimatedDuration(category?: string | null): number {
  if (!category) return CATEGORY_DURATIONS.default;

  const normalizedCategory = category.toLowerCase().trim();

  // Try exact match first
  if (CATEGORY_DURATIONS[normalizedCategory]) {
    return CATEGORY_DURATIONS[normalizedCategory];
  }

  // Try partial match
  for (const [key, duration] of Object.entries(CATEGORY_DURATIONS)) {
    if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
      return duration;
    }
  }

  return CATEGORY_DURATIONS.default;
}

/**
 * Check if a category is primarily outdoor
 */
export function isOutdoorCategory(category?: string | null): boolean {
  if (!category) return false;
  const normalized = category.toLowerCase().trim();

  for (const outdoor of OUTDOOR_CATEGORIES) {
    if (normalized.includes(outdoor) || outdoor.includes(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a category is primarily indoor
 */
export function isIndoorCategory(category?: string | null): boolean {
  if (!category) return false;
  const normalized = category.toLowerCase().trim();

  for (const indoor of INDOOR_CATEGORIES) {
    if (normalized.includes(indoor) || indoor.includes(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Get activity intensity for a category
 */
export function getActivityIntensity(category?: string | null): { physical: number; mental: number; type: string } {
  if (!category) return CATEGORY_INTENSITY.default;

  const normalized = category.toLowerCase().trim();

  // Try exact match first
  if (CATEGORY_INTENSITY[normalized]) {
    return CATEGORY_INTENSITY[normalized];
  }

  // Try partial match
  for (const [key, intensity] of Object.entries(CATEGORY_INTENSITY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return intensity;
    }
  }

  return CATEGORY_INTENSITY.default;
}

/**
 * Calculate fatigue score for a day's activities
 * Returns a score from 0-100 where higher = more fatiguing
 * Also estimates total walking distance based on travel times
 */
export interface DayFatigue {
  score: number; // 0-100
  label: 'Light' | 'Moderate' | 'Demanding' | 'Exhausting';
  physicalLoad: number; // 0-100
  mentalLoad: number; // 0-100
  estimatedWalkingKm: number;
  estimatedStandingHours: number;
  warnings: string[];
}

export function calculateDayFatigue(
  items: Array<{
    category?: string | null;
    duration: number; // minutes
    travelTimeFromPrev?: number;
  }>
): DayFatigue {
  let totalPhysical = 0;
  let totalMental = 0;
  let totalStandingMinutes = 0;
  let totalWalkingMinutes = 0;
  const warnings: string[] = [];

  items.forEach((item, index) => {
    const intensity = getActivityIntensity(item.category);
    const durationHours = item.duration / 60;

    // Weight intensity by duration
    totalPhysical += intensity.physical * durationHours;
    totalMental += intensity.mental * durationHours;

    // Standing time estimate (museums, galleries, shopping = mostly standing)
    if (intensity.type === 'cultural' || intensity.type === 'active') {
      totalStandingMinutes += item.duration * 0.7; // 70% standing time
    }

    // Walking from travel
    if (item.travelTimeFromPrev) {
      totalWalkingMinutes += item.travelTimeFromPrev;
    }
  });

  // Normalize to 0-100 scale
  // Assume a typical intense day is ~8 hours of activities
  const maxDailyLoad = 8 * 7; // 8 hours at intensity 7
  const physicalLoad = Math.min(100, Math.round((totalPhysical / maxDailyLoad) * 100));
  const mentalLoad = Math.min(100, Math.round((totalMental / maxDailyLoad) * 100));

  // Combined score (physical weighs slightly more)
  const score = Math.min(100, Math.round(physicalLoad * 0.6 + mentalLoad * 0.4));

  // Estimate walking distance (5 km/h average walking speed)
  const estimatedWalkingKm = Math.round((totalWalkingMinutes / 60) * 5 * 10) / 10;

  // Standing hours
  const estimatedStandingHours = Math.round((totalStandingMinutes / 60) * 10) / 10;

  // Generate warnings
  if (score >= 80) {
    warnings.push('This day is exhausting - consider removing an activity or adding rest');
  } else if (score >= 65) {
    warnings.push('Demanding day ahead - pace yourself');
  }

  if (estimatedWalkingKm > 10) {
    warnings.push(`High walking day (~${estimatedWalkingKm}km) - wear comfortable shoes`);
  }

  if (estimatedStandingHours > 5) {
    warnings.push(`~${estimatedStandingHours}h of standing - consider seated breaks`);
  }

  // Determine label
  let label: DayFatigue['label'];
  if (score < 30) label = 'Light';
  else if (score < 55) label = 'Moderate';
  else if (score < 75) label = 'Demanding';
  else label = 'Exhausting';

  return {
    score,
    label,
    physicalLoad,
    mentalLoad,
    estimatedWalkingKm,
    estimatedStandingHours,
    warnings,
  };
}

/**
 * Detect "intensity marathons" - consecutive activities of the same high-intensity type
 * e.g., 3 museums back-to-back = museum marathon
 */
export interface IntensityMarathon {
  type: string;
  count: number;
  items: string[];
  warning: string;
}

export function detectIntensityMarathons(
  items: Array<{
    name: string;
    category?: string | null;
  }>
): IntensityMarathon[] {
  const marathons: IntensityMarathon[] = [];
  if (items.length < 2) return marathons;

  let currentType: string | null = null;
  let currentStreak: string[] = [];

  // Activity types that cause fatigue when consecutive
  const fatigueTypes = new Set(['cultural', 'active']);

  items.forEach((item) => {
    const intensity = getActivityIntensity(item.category);
    const isRestingType = intensity.type === 'dining' || intensity.type === 'leisure';

    if (isRestingType) {
      // Dining/leisure breaks the streak
      if (currentStreak.length >= 3 && currentType && fatigueTypes.has(currentType)) {
        marathons.push(createMarathonWarning(currentType, currentStreak));
      }
      currentStreak = [];
      currentType = null;
    } else if (currentType === intensity.type) {
      // Continue streak
      currentStreak.push(item.name);
    } else {
      // New type - check if previous streak was a marathon
      if (currentStreak.length >= 3 && currentType && fatigueTypes.has(currentType)) {
        marathons.push(createMarathonWarning(currentType, currentStreak));
      }
      currentStreak = [item.name];
      currentType = intensity.type;
    }
  });

  // Check final streak
  if (currentStreak.length >= 3 && currentType && fatigueTypes.has(currentType)) {
    marathons.push(createMarathonWarning(currentType, currentStreak));
  }

  return marathons;
}

function createMarathonWarning(type: string, items: string[]): IntensityMarathon {
  const typeLabels: Record<string, string> = {
    cultural: 'museum/gallery',
    active: 'walking-heavy',
  };

  const label = typeLabels[type] || type;

  return {
    type,
    count: items.length,
    items: [...items],
    warning: `${items.length} ${label} activities back-to-back without a break`,
  };
}

/**
 * Check if first day should have adjusted schedule for jet lag
 * Returns adjustment suggestions based on flight duration
 */
export interface JetLagAdjustment {
  shouldAdjust: boolean;
  suggestedStartTime: string;
  reason: string;
  tips: string[];
}

export function getJetLagAdjustment(
  flightDurationHours?: number,
  timezoneShiftHours?: number
): JetLagAdjustment {
  // Default: no adjustment
  if (!flightDurationHours && !timezoneShiftHours) {
    return {
      shouldAdjust: false,
      suggestedStartTime: '09:00',
      reason: '',
      tips: [],
    };
  }

  const isLongHaul = (flightDurationHours && flightDurationHours >= 6) ||
                     (timezoneShiftHours && Math.abs(timezoneShiftHours) >= 5);

  if (!isLongHaul) {
    return {
      shouldAdjust: false,
      suggestedStartTime: '09:00',
      reason: '',
      tips: [],
    };
  }

  const tips: string[] = [];

  // Significant timezone shift
  if (timezoneShiftHours && Math.abs(timezoneShiftHours) >= 8) {
    tips.push('Expect significant jet lag - stay hydrated and get sunlight');
    tips.push('Consider a power nap (20-30 min) if needed, but not after 3pm');
  }

  // Long flight fatigue
  if (flightDurationHours && flightDurationHours >= 10) {
    tips.push('Long flight recovery - keep first day light on physical activities');
  }

  return {
    shouldAdjust: true,
    suggestedStartTime: '11:00',
    reason: 'Long-haul arrival - starting later allows recovery time',
    tips,
  };
}

/**
 * Format duration in human readable form
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Calculate travel time between two coordinates (Haversine formula)
 * Returns time in minutes assuming average city speed
 */
export function calculateTravelTime(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null,
  mode: 'walking' | 'transit' | 'driving' = 'transit'
): { minutes: number; distance: number } | null {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Average speeds by mode (km/h)
  const speeds = {
    walking: 5,
    transit: 25,
    driving: 35,
  };

  const minutes = Math.round((distance / speeds[mode]) * 60);

  return { minutes, distance };
}

/**
 * Analyze a day's itinerary for time conflicts and overstuffing
 */
export interface TimeSlot {
  itemId: string;
  name: string;
  category?: string;
  startTime?: string;
  estimatedDuration: number;
  travelTimeFromPrev?: number;
  endTime?: string;
}

export interface DayAnalysis {
  totalActivityTime: number;
  totalTravelTime: number;
  totalTime: number;
  availableHours: number; // Typical day is ~12 active hours (8am-8pm)
  isOverstuffed: boolean;
  utilizationPercent: number;
  timeSlots: TimeSlot[];
  warnings: string[];
  suggestions: string[];
}

export function analyzeDayItinerary(
  items: Array<{
    id: string;
    title: string;
    time?: string | null;
    category?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    customDuration?: number;
  }>
): DayAnalysis {
  const availableHours = 12; // 8am to 8pm
  const availableMinutes = availableHours * 60;

  let totalActivityTime = 0;
  let totalTravelTime = 0;
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const timeSlots: TimeSlot[] = [];

  items.forEach((item, index) => {
    const duration = item.customDuration || getEstimatedDuration(item.category);
    totalActivityTime += duration;

    // Calculate travel time from previous item
    let travelTime = 0;
    if (index > 0) {
      const prevItem = items[index - 1];
      const travel = calculateTravelTime(
        prevItem.latitude,
        prevItem.longitude,
        item.latitude,
        item.longitude
      );
      if (travel && travel.minutes > 5) {
        travelTime = travel.minutes;
        totalTravelTime += travelTime;
      }
    }

    timeSlots.push({
      itemId: item.id,
      name: item.title,
      category: item.category || undefined,
      startTime: item.time || undefined,
      estimatedDuration: duration,
      travelTimeFromPrev: travelTime > 0 ? travelTime : undefined,
    });
  });

  const totalTime = totalActivityTime + totalTravelTime;
  const utilizationPercent = Math.round((totalTime / availableMinutes) * 100);
  const isOverstuffed = totalTime > availableMinutes;

  // Generate warnings
  if (isOverstuffed) {
    const overBy = totalTime - availableMinutes;
    warnings.push(`Day is overstuffed by ${formatDuration(overBy)}. Consider moving ${Math.ceil(overBy / 60)} item(s) to another day.`);
  }

  if (utilizationPercent > 85 && utilizationPercent <= 100) {
    warnings.push('Day is tightly packed. Little room for spontaneity or delays.');
  }

  // Check for long travel times
  timeSlots.forEach((slot) => {
    if (slot.travelTimeFromPrev && slot.travelTimeFromPrev > 45) {
      warnings.push(`Long travel time (${formatDuration(slot.travelTimeFromPrev)}) to reach ${slot.name}.`);
    }
  });

  // Generate suggestions
  if (utilizationPercent < 50 && items.length > 0) {
    suggestions.push('You have room to add more activities to this day.');
  }

  if (totalTravelTime > totalActivityTime * 0.3) {
    suggestions.push('Consider grouping nearby locations to reduce travel time.');
  }

  return {
    totalActivityTime,
    totalTravelTime,
    totalTime,
    availableHours,
    isOverstuffed,
    utilizationPercent,
    timeSlots,
    warnings,
    suggestions,
  };
}

/**
 * Popular times estimation (mock based on category and time)
 * Returns a crowd level from 0-100
 */
export interface CrowdPrediction {
  level: number; // 0-100
  label: 'Low' | 'Moderate' | 'Busy' | 'Very Busy' | 'Peak';
  suggestion?: string;
  bestTimes?: string[];
}

export function predictCrowdLevel(
  category?: string | null,
  scheduledTime?: string | null,
  dayOfWeek?: number // 0 = Sunday, 6 = Saturday
): CrowdPrediction {
  if (!scheduledTime) {
    return { level: 50, label: 'Moderate' };
  }

  const hour = parseInt(scheduledTime.split(':')[0], 10);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const normalizedCategory = (category || '').toLowerCase();

  // Base crowd patterns by hour
  let baseLevel = 30;

  // Morning (8-10): Generally quiet
  if (hour >= 8 && hour < 10) baseLevel = 25;
  // Late morning (10-12): Building up
  else if (hour >= 10 && hour < 12) baseLevel = 50;
  // Lunch (12-14): Peak for restaurants
  else if (hour >= 12 && hour < 14) baseLevel = 70;
  // Afternoon (14-17): Generally busy
  else if (hour >= 14 && hour < 17) baseLevel = 65;
  // Evening (17-19): Dinner rush
  else if (hour >= 17 && hour < 19) baseLevel = 75;
  // Night (19+): Varies
  else if (hour >= 19) baseLevel = 55;

  // Adjust for category
  if (normalizedCategory.includes('museum')) {
    // Museums are busiest late morning to early afternoon
    if (hour >= 11 && hour < 15) baseLevel += 20;
    if (hour >= 9 && hour < 11) baseLevel -= 15; // Best time
  } else if (normalizedCategory.includes('restaurant') || normalizedCategory.includes('dining')) {
    // Restaurants peak at meal times
    if ((hour >= 12 && hour < 14) || (hour >= 19 && hour < 21)) baseLevel += 25;
    if (hour >= 14 && hour < 18) baseLevel -= 20; // Off-peak
  } else if (normalizedCategory.includes('cafe') || normalizedCategory.includes('coffee')) {
    // Cafes busy in morning and afternoon
    if ((hour >= 8 && hour < 10) || (hour >= 14 && hour < 16)) baseLevel += 15;
  } else if (normalizedCategory.includes('park') || normalizedCategory.includes('beach')) {
    // Parks busiest on weekend afternoons
    if (isWeekend && hour >= 11 && hour < 17) baseLevel += 25;
  } else if (normalizedCategory.includes('bar') || normalizedCategory.includes('club')) {
    // Bars busy evening/night
    if (hour >= 21) baseLevel += 30;
    else if (hour < 17) baseLevel -= 30;
  }

  // Weekend adjustment
  if (isWeekend) baseLevel += 15;

  // Clamp to 0-100
  const level = Math.max(0, Math.min(100, baseLevel));

  // Determine label
  let label: CrowdPrediction['label'];
  if (level < 30) label = 'Low';
  else if (level < 50) label = 'Moderate';
  else if (level < 70) label = 'Busy';
  else if (level < 85) label = 'Very Busy';
  else label = 'Peak';

  // Generate suggestion if busy
  let suggestion: string | undefined;
  let bestTimes: string[] | undefined;

  if (level >= 70) {
    if (normalizedCategory.includes('museum')) {
      suggestion = 'Consider visiting earlier (9-10 AM) or in the last 2 hours before closing.';
      bestTimes = ['09:00', '10:00', '16:00', '17:00'];
    } else if (normalizedCategory.includes('restaurant')) {
      suggestion = 'Book a reservation or visit during off-peak hours (2-5 PM).';
      bestTimes = ['14:00', '15:00', '17:00'];
    } else if (normalizedCategory.includes('park')) {
      suggestion = 'Early morning or late afternoon offers a quieter experience.';
      bestTimes = ['08:00', '09:00', '17:00', '18:00'];
    } else {
      suggestion = 'This location is typically crowded at this time.';
    }
  }

  return { level, label, suggestion, bestTimes };
}

/**
 * Weather-based activity swapping suggestions
 */
export interface WeatherSwapSuggestion {
  affectedDay: number;
  affectedItem: { id: string; name: string; category?: string };
  targetDay: number;
  targetItem: { id: string; name: string; category?: string };
  reason: string;
}

export function suggestWeatherSwaps(
  days: Array<{
    dayNumber: number;
    date: string | null;
    weather?: { condition: string; isRainy: boolean };
    items: Array<{
      id: string;
      title: string;
      category?: string | null;
    }>;
  }>
): WeatherSwapSuggestion[] {
  const suggestions: WeatherSwapSuggestion[] = [];

  // Find rainy days with outdoor activities
  const rainyDaysWithOutdoor = days.filter(
    (day) => day.weather?.isRainy && day.items.some((item) => isOutdoorCategory(item.category))
  );

  // Find clear days with indoor activities
  const clearDaysWithIndoor = days.filter(
    (day) => !day.weather?.isRainy && day.items.some((item) => isIndoorCategory(item.category))
  );

  rainyDaysWithOutdoor.forEach((rainyDay) => {
    const outdoorItems = rainyDay.items.filter((item) => isOutdoorCategory(item.category));

    outdoorItems.forEach((outdoorItem) => {
      // Find a suitable swap from a clear day
      for (const clearDay of clearDaysWithIndoor) {
        const indoorItems = clearDay.items.filter((item) => isIndoorCategory(item.category));

        if (indoorItems.length > 0) {
          const indoorItem = indoorItems[0];
          suggestions.push({
            affectedDay: rainyDay.dayNumber,
            affectedItem: {
              id: outdoorItem.id,
              name: outdoorItem.title,
              category: outdoorItem.category || undefined,
            },
            targetDay: clearDay.dayNumber,
            targetItem: {
              id: indoorItem.id,
              name: indoorItem.title,
              category: indoorItem.category || undefined,
            },
            reason: `Rain forecasted on Day ${rainyDay.dayNumber}. Swap outdoor "${outdoorItem.title}" with indoor "${indoorItem.title}" from Day ${clearDay.dayNumber}.`,
          });
          break; // One suggestion per outdoor item
        }
      }
    });
  });

  return suggestions;
}

/**
 * Real-time availability estimation
 * Predicts wait times and suggests alternatives
 */
export interface AvailabilityPrediction {
  hasWait: boolean;
  waitMinutes: number;
  waitLabel: string;
  requiresReservation: boolean;
  reservationDifficulty: 'easy' | 'moderate' | 'hard' | 'very_hard';
  suggestion?: string;
  alternativeTime?: string;
  alternativeTimeWait?: number;
}

// Categories that typically require reservations
const RESERVATION_CATEGORIES = new Set([
  'fine dining',
  'michelin',
  'omakase',
  'tasting menu',
  'upscale restaurant',
  'high-end restaurant',
]);

// Categories with typical wait times
const WAIT_TIME_CATEGORIES: Record<string, { base: number; peakMultiplier: number }> = {
  'restaurant': { base: 15, peakMultiplier: 4 },
  'fine dining': { base: 0, peakMultiplier: 1 }, // Reservation required
  'cafe': { base: 5, peakMultiplier: 3 },
  'coffee shop': { base: 5, peakMultiplier: 2 },
  'bakery': { base: 10, peakMultiplier: 3 },
  'brunch': { base: 30, peakMultiplier: 3 },
  'ramen': { base: 20, peakMultiplier: 4 },
  'sushi': { base: 15, peakMultiplier: 3 },
  'pizza': { base: 15, peakMultiplier: 2.5 },
  'bar': { base: 0, peakMultiplier: 2 },
  'museum': { base: 10, peakMultiplier: 3 },
  'attraction': { base: 20, peakMultiplier: 4 },
  'theme park': { base: 30, peakMultiplier: 5 },
};

export function predictAvailability(
  category?: string | null,
  scheduledTime?: string | null,
  dayOfWeek?: number, // 0 = Sunday, 6 = Saturday
  popularity?: number // 0-100, optional popularity score
): AvailabilityPrediction {
  const normalizedCategory = (category || '').toLowerCase();
  const hour = scheduledTime ? parseInt(scheduledTime.split(':')[0], 10) : 12;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;

  // Check if reservation is required
  let requiresReservation = false;
  for (const resCategory of RESERVATION_CATEGORIES) {
    if (normalizedCategory.includes(resCategory)) {
      requiresReservation = true;
      break;
    }
  }

  // Find matching wait time category
  let waitConfig = { base: 10, peakMultiplier: 2 };
  for (const [cat, config] of Object.entries(WAIT_TIME_CATEGORIES)) {
    if (normalizedCategory.includes(cat)) {
      waitConfig = config;
      break;
    }
  }

  // Calculate peak factor based on time
  let peakFactor = 1;

  // Restaurant peak times
  if (normalizedCategory.includes('restaurant') || normalizedCategory.includes('dining')) {
    // Lunch peak: 12-14
    if (hour >= 12 && hour < 14) peakFactor = 2.5;
    // Dinner peak: 19-21
    else if (hour >= 19 && hour < 21) peakFactor = 3;
    // Early dinner: 17-19
    else if (hour >= 17 && hour < 19) peakFactor = 1.5;
    // Off-peak: 14-17
    else if (hour >= 14 && hour < 17) peakFactor = 0.5;
  }
  // Brunch peak
  else if (normalizedCategory.includes('brunch')) {
    if (isWeekend && hour >= 10 && hour < 14) peakFactor = 3;
  }
  // Cafe peaks
  else if (normalizedCategory.includes('cafe') || normalizedCategory.includes('coffee')) {
    if (hour >= 8 && hour < 10) peakFactor = 2;
    else if (hour >= 14 && hour < 16) peakFactor = 1.5;
  }
  // Museum/attraction peaks
  else if (normalizedCategory.includes('museum') || normalizedCategory.includes('attraction')) {
    if (hour >= 11 && hour < 15) peakFactor = 2;
  }

  // Weekend/Friday adjustment
  if (isWeekend) peakFactor *= 1.5;
  else if (isFriday && hour >= 18) peakFactor *= 1.3;

  // Popularity adjustment
  if (popularity) {
    peakFactor *= (0.5 + (popularity / 100));
  }

  // Calculate wait time
  let waitMinutes = Math.round(waitConfig.base * peakFactor);

  // Cap wait time reasonably
  waitMinutes = Math.min(waitMinutes, 120);

  // Generate wait label
  let waitLabel: string;
  if (waitMinutes === 0) waitLabel = 'No wait expected';
  else if (waitMinutes <= 10) waitLabel = 'Short wait (~10 min)';
  else if (waitMinutes <= 20) waitLabel = '15-20 min wait';
  else if (waitMinutes <= 30) waitLabel = '20-30 min wait';
  else if (waitMinutes <= 45) waitLabel = '30-45 min wait';
  else if (waitMinutes <= 60) waitLabel = '45-60 min wait';
  else if (waitMinutes <= 90) waitLabel = '1-1.5 hour wait';
  else waitLabel = '1.5-2 hour wait';

  // Reservation difficulty
  let reservationDifficulty: AvailabilityPrediction['reservationDifficulty'] = 'easy';
  if (requiresReservation) {
    if (peakFactor > 2.5) reservationDifficulty = 'very_hard';
    else if (peakFactor > 2) reservationDifficulty = 'hard';
    else if (peakFactor > 1.5) reservationDifficulty = 'moderate';
  }

  // Generate suggestions
  let suggestion: string | undefined;
  let alternativeTime: string | undefined;
  let alternativeTimeWait: number | undefined;

  if (waitMinutes > 30 || reservationDifficulty === 'hard' || reservationDifficulty === 'very_hard') {
    // Find a better time
    const betterTimes: { time: string; factor: number }[] = [];

    if (normalizedCategory.includes('restaurant') || normalizedCategory.includes('dining')) {
      betterTimes.push(
        { time: '17:30', factor: 0.6 },
        { time: '14:30', factor: 0.4 },
        { time: '21:30', factor: 0.7 },
      );
    } else if (normalizedCategory.includes('brunch')) {
      betterTimes.push(
        { time: '09:00', factor: 0.5 },
        { time: '14:30', factor: 0.6 },
      );
    } else if (normalizedCategory.includes('museum')) {
      betterTimes.push(
        { time: '09:00', factor: 0.4 },
        { time: '16:00', factor: 0.5 },
      );
    } else {
      betterTimes.push(
        { time: '09:00', factor: 0.5 },
        { time: '15:00', factor: 0.6 },
      );
    }

    // Find best alternative
    const best = betterTimes.sort((a, b) => a.factor - b.factor)[0];
    if (best) {
      alternativeTime = best.time;
      alternativeTimeWait = Math.round(waitConfig.base * best.factor);

      if (requiresReservation) {
        suggestion = `This restaurant usually has a ${waitLabel.toLowerCase()} at ${scheduledTime}. Try booking for ${alternativeTime} instead.`;
      } else {
        suggestion = `Expect a ${waitLabel.toLowerCase()} at ${scheduledTime}. Try arriving at ${alternativeTime} for a shorter ${alternativeTimeWait < 10 ? 'wait' : `${alternativeTimeWait} min wait`}.`;
      }
    }
  }

  return {
    hasWait: waitMinutes > 10,
    waitMinutes,
    waitLabel,
    requiresReservation,
    reservationDifficulty,
    suggestion,
    alternativeTime,
    alternativeTimeWait,
  };
}

/**
 * Find alternative places in the same category
 */
export interface AlternativePlace {
  slug: string;
  name: string;
  category: string;
  waitEstimate: string;
  reason: string;
}
