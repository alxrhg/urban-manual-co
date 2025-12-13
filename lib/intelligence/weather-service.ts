/**
 * Weather Service
 * Analyzes weather impact on travel activities and provides recommendations
 */

// =============================================================================
// Schema Definitions
// =============================================================================

/**
 * Weather impact types
 */
export type WeatherImpactType = 'rain' | 'heat' | 'cold' | 'wind' | 'snow' | 'storm' | 'fog' | 'humidity';

/**
 * Activity category for weather matching
 */
export type ActivityCategory =
  | 'outdoor_walking'
  | 'outdoor_seated'
  | 'indoor'
  | 'beach'
  | 'hiking'
  | 'water_sports'
  | 'photography'
  | 'dining_outdoor'
  | 'dining_indoor'
  | 'museum'
  | 'shopping'
  | 'nightlife'
  | 'sports'
  | 'sightseeing';

/**
 * Severity level for weather alerts
 */
export type WeatherSeverity = 'low' | 'moderate' | 'high' | 'severe';

/**
 * Weather condition data
 */
export interface WeatherCondition {
  /** Main condition (e.g., "rain", "clear", "cloudy") */
  main: string;
  /** Detailed description */
  description?: string;
  /** Temperature in Celsius */
  tempC: number;
  /** Feels like temperature in Celsius */
  feelsLikeC?: number;
  /** Wind speed in km/h */
  windSpeedKmh?: number;
  /** Precipitation probability (0-100) */
  precipProbability?: number;
  /** Precipitation amount in mm */
  precipMm?: number;
  /** Humidity percentage (0-100) */
  humidity?: number;
  /** UV index (0-11+) */
  uvIndex?: number;
  /** Visibility in km */
  visibilityKm?: number;
}

/**
 * Weather forecast for a specific time slot
 */
export interface WeatherForecast {
  /** ISO datetime string */
  datetime: string;
  /** Hour of day (0-23) */
  hour?: number;
  /** Weather conditions */
  condition: WeatherCondition;
  /** Icon code for display */
  iconCode?: string;
}

/**
 * Weather impact analysis result
 */
export interface WeatherImpact {
  /** Type of weather impact */
  type: WeatherImpactType;
  /** Severity of the impact */
  severity: WeatherSeverity;
  /** Impact score (0-100, higher = worse) */
  impactScore: number;
  /** Human-readable message */
  message: string;
  /** Affected activity categories */
  affectedCategories: ActivityCategory[];
}

/**
 * Weather alert for an activity
 */
export interface WeatherAlert {
  /** Alert ID */
  id: string;
  /** Activity or item this applies to */
  activityName?: string;
  /** Time slot this applies to */
  timeSlot?: string;
  /** The weather impact causing the alert */
  impact: WeatherImpact;
  /** Recommendation for the user */
  recommendation: string;
  /** Alternative suggestion if applicable */
  alternative?: {
    type: 'reschedule' | 'replace' | 'prepare';
    suggestion: string;
    /** Suggested replacement activity category */
    alternativeCategory?: ActivityCategory;
  };
}

/**
 * Activity definition for weather analysis
 */
export interface Activity {
  /** Activity name */
  name: string;
  /** Category for weather matching */
  category: ActivityCategory;
  /** Whether the activity is outdoor */
  isOutdoor: boolean;
  /** Scheduled time (ISO datetime) */
  scheduledTime?: string;
  /** Duration in minutes */
  durationMinutes?: number;
}

/**
 * Day weather analysis result
 */
export interface DayWeatherAnalysis {
  /** Date of analysis */
  date: string;
  /** Overall day recommendation */
  overallRecommendation: string;
  /** Weather summary */
  weatherSummary: string;
  /** Best time slots for outdoor activities */
  bestOutdoorTimes: string[];
  /** Times to avoid for outdoor activities */
  avoidOutdoorTimes: string[];
  /** All weather alerts for the day */
  alerts: WeatherAlert[];
  /** General packing suggestions */
  packingSuggestions: string[];
}

// =============================================================================
// Weather Impact Thresholds
// =============================================================================

const THRESHOLDS = {
  rain: {
    light: 0.5, // mm/h
    moderate: 2.5,
    heavy: 7.5,
  },
  temp: {
    cold: 10, // Celsius
    cool: 15,
    warm: 25,
    hot: 30,
    extreme: 35,
  },
  wind: {
    light: 15, // km/h
    moderate: 30,
    strong: 50,
    severe: 75,
  },
  humidity: {
    uncomfortable: 70, // percentage
    oppressive: 85,
  },
  uv: {
    moderate: 3,
    high: 6,
    veryHigh: 8,
    extreme: 11,
  },
} as const;

// =============================================================================
// Category-Weather Sensitivity Matrix
// =============================================================================

const CATEGORY_SENSITIVITY: Record<ActivityCategory, {
  rainSensitivity: number;
  tempSensitivity: number;
  windSensitivity: number;
  idealConditions: string[];
}> = {
  outdoor_walking: {
    rainSensitivity: 0.8,
    tempSensitivity: 0.6,
    windSensitivity: 0.5,
    idealConditions: ['clear', 'partly_cloudy'],
  },
  outdoor_seated: {
    rainSensitivity: 1.0,
    tempSensitivity: 0.7,
    windSensitivity: 0.8,
    idealConditions: ['clear', 'partly_cloudy'],
  },
  indoor: {
    rainSensitivity: 0.1,
    tempSensitivity: 0.1,
    windSensitivity: 0.0,
    idealConditions: ['any'],
  },
  beach: {
    rainSensitivity: 1.0,
    tempSensitivity: 0.5,
    windSensitivity: 0.7,
    idealConditions: ['clear', 'partly_cloudy'],
  },
  hiking: {
    rainSensitivity: 0.9,
    tempSensitivity: 0.7,
    windSensitivity: 0.4,
    idealConditions: ['clear', 'partly_cloudy', 'overcast'],
  },
  water_sports: {
    rainSensitivity: 0.6,
    tempSensitivity: 0.4,
    windSensitivity: 0.9,
    idealConditions: ['clear', 'partly_cloudy'],
  },
  photography: {
    rainSensitivity: 0.7,
    tempSensitivity: 0.3,
    windSensitivity: 0.3,
    idealConditions: ['partly_cloudy', 'overcast', 'golden_hour'],
  },
  dining_outdoor: {
    rainSensitivity: 1.0,
    tempSensitivity: 0.6,
    windSensitivity: 0.7,
    idealConditions: ['clear', 'partly_cloudy'],
  },
  dining_indoor: {
    rainSensitivity: 0.0,
    tempSensitivity: 0.0,
    windSensitivity: 0.0,
    idealConditions: ['any'],
  },
  museum: {
    rainSensitivity: 0.0,
    tempSensitivity: 0.0,
    windSensitivity: 0.0,
    idealConditions: ['any'],
  },
  shopping: {
    rainSensitivity: 0.2,
    tempSensitivity: 0.1,
    windSensitivity: 0.1,
    idealConditions: ['any'],
  },
  nightlife: {
    rainSensitivity: 0.3,
    tempSensitivity: 0.2,
    windSensitivity: 0.1,
    idealConditions: ['any'],
  },
  sports: {
    rainSensitivity: 0.8,
    tempSensitivity: 0.7,
    windSensitivity: 0.6,
    idealConditions: ['clear', 'partly_cloudy'],
  },
  sightseeing: {
    rainSensitivity: 0.7,
    tempSensitivity: 0.5,
    windSensitivity: 0.4,
    idealConditions: ['clear', 'partly_cloudy'],
  },
};

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze weather impact on planned activities
 * @param forecast - Weather forecast data
 * @param activities - List of planned activities
 * @returns Array of weather alerts with recommendations
 */
export function analyzeWeatherImpact(
  forecast: WeatherForecast[],
  activities: Activity[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  for (const activity of activities) {
    // Find matching forecast for activity time
    const relevantForecast = findRelevantForecast(forecast, activity.scheduledTime);
    if (!relevantForecast) continue;

    // Analyze impacts for this activity
    const impacts = analyzeConditionImpacts(
      relevantForecast.condition,
      activity.category
    );

    // Generate alerts for significant impacts
    for (const impact of impacts) {
      if (impact.severity !== 'low') {
        const alert = createAlert(activity, impact, relevantForecast);
        alerts.push(alert);
      }
    }
  }

  // Sort by severity (severe first)
  return alerts.sort((a, b) => {
    const severityOrder: Record<WeatherSeverity, number> = {
      severe: 0,
      high: 1,
      moderate: 2,
      low: 3,
    };
    return severityOrder[a.impact.severity] - severityOrder[b.impact.severity];
  });
}

/**
 * Analyze a full day's weather for general recommendations
 * @param date - Date to analyze
 * @param forecasts - Hourly forecasts for the day
 * @returns Complete day analysis
 */
export function analyzeDayWeather(
  date: string,
  forecasts: WeatherForecast[]
): DayWeatherAnalysis {
  const dayForecasts = forecasts.filter((f) => f.datetime.startsWith(date));

  if (dayForecasts.length === 0) {
    return {
      date,
      overallRecommendation: 'No forecast data available',
      weatherSummary: 'Unable to provide weather analysis',
      bestOutdoorTimes: [],
      avoidOutdoorTimes: [],
      alerts: [],
      packingSuggestions: [],
    };
  }

  // Find best and worst times
  const hourlyScores = dayForecasts.map((f) => ({
    hour: f.hour ?? new Date(f.datetime).getHours(),
    score: calculateOutdoorScore(f.condition),
    condition: f.condition,
  }));

  const bestTimes = hourlyScores
    .filter((h) => h.score >= 70)
    .map((h) => formatHour(h.hour));

  const worstTimes = hourlyScores
    .filter((h) => h.score < 40)
    .map((h) => formatHour(h.hour));

  // Generate overall recommendation
  const avgScore = hourlyScores.reduce((sum, h) => sum + h.score, 0) / hourlyScores.length;
  const overallRecommendation = getOverallRecommendation(avgScore, dayForecasts);

  // Generate weather summary
  const weatherSummary = generateWeatherSummary(dayForecasts);

  // Generate packing suggestions
  const packingSuggestions = generatePackingSuggestions(dayForecasts);

  return {
    date,
    overallRecommendation,
    weatherSummary,
    bestOutdoorTimes: bestTimes,
    avoidOutdoorTimes: worstTimes,
    alerts: [],
    packingSuggestions,
  };
}

/**
 * Get indoor activity recommendations based on weather
 * @param condition - Current weather condition
 * @returns List of recommended indoor activities
 */
export function getIndoorRecommendations(condition: WeatherCondition): string[] {
  const recommendations: string[] = [];

  // Always good indoor options
  recommendations.push('Museum day recommended');

  if (condition.main.toLowerCase().includes('rain')) {
    recommendations.push('Perfect weather for indoor markets or covered attractions');
    recommendations.push('Consider a cooking class or workshop');
  }

  if (condition.tempC < THRESHOLDS.temp.cold) {
    recommendations.push('Warm up with a cafe visit or indoor spa');
  }

  if (condition.tempC > THRESHOLDS.temp.hot) {
    recommendations.push('Stay cool in air-conditioned shopping centers');
    recommendations.push('Indoor cinema or theater recommended');
  }

  return recommendations;
}

// =============================================================================
// Helper Functions
// =============================================================================

function findRelevantForecast(
  forecasts: WeatherForecast[],
  scheduledTime?: string
): WeatherForecast | undefined {
  if (!scheduledTime) {
    return forecasts[0]; // Default to first available
  }

  const scheduled = new Date(scheduledTime);

  // Find closest forecast
  return forecasts.reduce((closest, current) => {
    const currentTime = new Date(current.datetime);
    const closestTime = closest ? new Date(closest.datetime) : null;

    if (!closestTime) return current;

    const currentDiff = Math.abs(currentTime.getTime() - scheduled.getTime());
    const closestDiff = Math.abs(closestTime.getTime() - scheduled.getTime());

    return currentDiff < closestDiff ? current : closest;
  }, undefined as WeatherForecast | undefined);
}

function analyzeConditionImpacts(
  condition: WeatherCondition,
  category: ActivityCategory
): WeatherImpact[] {
  const impacts: WeatherImpact[] = [];
  const sensitivity = CATEGORY_SENSITIVITY[category];

  // Rain impact
  if (condition.precipProbability && condition.precipProbability > 30) {
    const rainImpact = calculateRainImpact(condition, sensitivity.rainSensitivity);
    if (rainImpact) impacts.push(rainImpact);
  }

  // Temperature impact
  const tempImpact = calculateTempImpact(condition, sensitivity.tempSensitivity);
  if (tempImpact) impacts.push(tempImpact);

  // Wind impact
  if (condition.windSpeedKmh && condition.windSpeedKmh > THRESHOLDS.wind.light) {
    const windImpact = calculateWindImpact(condition, sensitivity.windSensitivity);
    if (windImpact) impacts.push(windImpact);
  }

  return impacts;
}

function calculateRainImpact(
  condition: WeatherCondition,
  sensitivity: number
): WeatherImpact | null {
  const precipProb = condition.precipProbability ?? 0;
  const precipMm = condition.precipMm ?? 0;

  if (precipProb < 30 && precipMm < THRESHOLDS.rain.light) {
    return null;
  }

  let severity: WeatherSeverity = 'low';
  let message = 'Light rain possible';

  if (precipMm >= THRESHOLDS.rain.heavy || precipProb >= 80) {
    severity = 'severe';
    message = 'Heavy rain expected';
  } else if (precipMm >= THRESHOLDS.rain.moderate || precipProb >= 60) {
    severity = 'high';
    message = 'Rain likely';
  } else if (precipProb >= 40) {
    severity = 'moderate';
    message = 'Rain possible';
  }

  // Adjust severity based on activity sensitivity
  if (sensitivity < 0.5 && severity !== 'severe') {
    severity = 'low';
  }

  const impactScore = Math.min(100, Math.round(precipProb * sensitivity));

  return {
    type: 'rain',
    severity,
    impactScore,
    message,
    affectedCategories: ['outdoor_walking', 'outdoor_seated', 'beach', 'dining_outdoor'],
  };
}

function calculateTempImpact(
  condition: WeatherCondition,
  sensitivity: number
): WeatherImpact | null {
  const temp = condition.tempC;
  const feelsLike = condition.feelsLikeC ?? temp;

  if (feelsLike >= THRESHOLDS.temp.extreme) {
    return {
      type: 'heat',
      severity: 'severe',
      impactScore: Math.round(90 * sensitivity),
      message: 'Extreme heat warning - limit outdoor exposure',
      affectedCategories: ['outdoor_walking', 'hiking', 'sports', 'beach'],
    };
  }

  if (feelsLike >= THRESHOLDS.temp.hot) {
    return {
      type: 'heat',
      severity: 'moderate',
      impactScore: Math.round(60 * sensitivity),
      message: 'Hot conditions - stay hydrated',
      affectedCategories: ['outdoor_walking', 'hiking', 'sports'],
    };
  }

  if (feelsLike <= THRESHOLDS.temp.cold) {
    return {
      type: 'cold',
      severity: feelsLike <= 0 ? 'high' : 'moderate',
      impactScore: Math.round((1 - (feelsLike + 10) / 20) * 100 * sensitivity),
      message: feelsLike <= 0 ? 'Freezing conditions - dress warmly' : 'Cold conditions - bring layers',
      affectedCategories: ['outdoor_seated', 'beach', 'dining_outdoor'],
    };
  }

  return null;
}

function calculateWindImpact(
  condition: WeatherCondition,
  sensitivity: number
): WeatherImpact | null {
  const wind = condition.windSpeedKmh ?? 0;

  if (wind < THRESHOLDS.wind.light) {
    return null;
  }

  let severity: WeatherSeverity = 'low';
  let message = 'Breezy conditions';

  if (wind >= THRESHOLDS.wind.severe) {
    severity = 'severe';
    message = 'Dangerous wind conditions';
  } else if (wind >= THRESHOLDS.wind.strong) {
    severity = 'high';
    message = 'Strong winds expected';
  } else if (wind >= THRESHOLDS.wind.moderate) {
    severity = 'moderate';
    message = 'Windy conditions';
  }

  const impactScore = Math.round((wind / THRESHOLDS.wind.severe) * 100 * sensitivity);

  return {
    type: 'wind',
    severity,
    impactScore: Math.min(100, impactScore),
    message,
    affectedCategories: ['beach', 'water_sports', 'outdoor_seated', 'photography'],
  };
}

function createAlert(
  activity: Activity,
  impact: WeatherImpact,
  forecast: WeatherForecast
): WeatherAlert {
  const recommendation = generateRecommendation(impact, activity);
  const alternative = generateAlternative(impact, activity);

  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    activityName: activity.name,
    timeSlot: formatTimeSlot(forecast.datetime),
    impact,
    recommendation,
    alternative,
  };
}

function generateRecommendation(impact: WeatherImpact, activity: Activity): string {
  switch (impact.type) {
    case 'rain':
      if (impact.severity === 'severe') {
        return `Consider rescheduling ${activity.name} or have an indoor backup plan`;
      }
      return `Bring an umbrella for ${activity.name}`;
    case 'heat':
      return `Plan ${activity.name} for early morning or evening to avoid peak heat`;
    case 'cold':
      return `Dress in warm layers for ${activity.name}`;
    case 'wind':
      return impact.severity === 'severe'
        ? `${activity.name} may be affected by dangerous winds - consider alternatives`
        : `Secure loose items and dress appropriately for windy conditions`;
    default:
      return 'Check weather conditions before heading out';
  }
}

function generateAlternative(
  impact: WeatherImpact,
  activity: Activity
): WeatherAlert['alternative'] | undefined {
  if (impact.severity === 'low') return undefined;

  if (activity.isOutdoor && impact.type === 'rain') {
    return {
      type: 'replace',
      suggestion: 'Museum day recommended due to rain',
      alternativeCategory: 'museum',
    };
  }

  if (impact.severity === 'severe') {
    return {
      type: 'reschedule',
      suggestion: 'Consider moving this activity to a different day',
    };
  }

  return {
    type: 'prepare',
    suggestion: 'Pack appropriate gear and check conditions before heading out',
  };
}

function calculateOutdoorScore(condition: WeatherCondition): number {
  let score = 100;

  // Rain penalty
  if (condition.precipProbability) {
    score -= condition.precipProbability * 0.5;
  }

  // Temperature penalty
  const temp = condition.feelsLikeC ?? condition.tempC;
  if (temp < THRESHOLDS.temp.cool) {
    score -= (THRESHOLDS.temp.cool - temp) * 2;
  } else if (temp > THRESHOLDS.temp.warm) {
    score -= (temp - THRESHOLDS.temp.warm) * 3;
  }

  // Wind penalty
  if (condition.windSpeedKmh && condition.windSpeedKmh > THRESHOLDS.wind.light) {
    score -= (condition.windSpeedKmh - THRESHOLDS.wind.light) * 0.5;
  }

  return Math.max(0, Math.min(100, score));
}

function getOverallRecommendation(avgScore: number, forecasts: WeatherForecast[]): string {
  if (avgScore >= 80) {
    return 'Excellent day for outdoor activities';
  }
  if (avgScore >= 60) {
    return 'Good conditions for most activities';
  }
  if (avgScore >= 40) {
    return 'Mixed conditions - plan indoor alternatives';
  }
  return 'Indoor activities recommended today';
}

function generateWeatherSummary(forecasts: WeatherForecast[]): string {
  if (forecasts.length === 0) return 'No data available';

  const temps = forecasts.map((f) => f.condition.tempC);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);

  const hasRain = forecasts.some(
    (f) => f.condition.precipProbability && f.condition.precipProbability > 50
  );

  let summary = `${Math.round(minTemp)}-${Math.round(maxTemp)}°C`;
  if (hasRain) {
    summary += ', rain expected';
  }

  return summary;
}

function generatePackingSuggestions(forecasts: WeatherForecast[]): string[] {
  const suggestions: string[] = [];

  const hasRain = forecasts.some(
    (f) => f.condition.precipProbability && f.condition.precipProbability > 40
  );
  const temps = forecasts.map((f) => f.condition.tempC);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const hasHighUV = forecasts.some(
    (f) => f.condition.uvIndex && f.condition.uvIndex >= THRESHOLDS.uv.high
  );

  if (hasRain) {
    suggestions.push('Umbrella');
    suggestions.push('Waterproof jacket');
  }

  if (minTemp < THRESHOLDS.temp.cool) {
    suggestions.push('Warm layers');
  }

  if (maxTemp > THRESHOLDS.temp.warm) {
    suggestions.push('Light, breathable clothing');
    suggestions.push('Water bottle');
  }

  if (hasHighUV) {
    suggestions.push('Sunscreen');
    suggestions.push('Sunglasses');
    suggestions.push('Hat');
  }

  return suggestions;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}${period}`;
}

function formatTimeSlot(datetime: string): string {
  const date = new Date(datetime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
