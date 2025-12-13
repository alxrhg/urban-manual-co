'use client';

import { useMemo } from 'react';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  Thermometer,
  Umbrella,
  AlertTriangle,
  Shirt,
  MapPin,
} from 'lucide-react';
import type {
  WeatherForecast,
  WeatherAlert,
  WeatherCondition,
  DayWeatherAnalysis,
} from '@/lib/intelligence/weather-service';
import {
  analyzeWeatherImpact,
  analyzeDayWeather,
  getIndoorRecommendations,
} from '@/lib/intelligence/weather-service';

// =============================================================================
// Types
// =============================================================================

interface SmartWeatherWidgetProps {
  /** Weather forecasts for the day */
  forecasts: WeatherForecast[];
  /** Date for the forecast (ISO date string) */
  date?: string;
  /** Planned activities for alert generation */
  activities?: Array<{
    name: string;
    category: string;
    isOutdoor: boolean;
    scheduledTime?: string;
  }>;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Show packing suggestions */
  showPackingSuggestions?: boolean;
  /** Show activity-specific alerts */
  showAlerts?: boolean;
  /** Optional class name */
  className?: string;
}

interface WeatherIconProps {
  condition: string;
  className?: string;
}

// =============================================================================
// Weather Icon Component
// =============================================================================

function WeatherIcon({ condition, className = 'w-6 h-6' }: WeatherIconProps) {
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return <CloudRain className={`${className} text-blue-500`} />;
  }
  if (lowerCondition.includes('snow') || lowerCondition.includes('sleet')) {
    return <CloudSnow className={`${className} text-blue-200`} />;
  }
  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
    return <Cloud className={`${className} text-gray-400`} />;
  }
  if (lowerCondition.includes('wind')) {
    return <Wind className={`${className} text-teal-500`} />;
  }
  // Default to sun for clear/sunny
  return <Sun className={`${className} text-amber-400`} />;
}

// =============================================================================
// Alert Badge Component
// =============================================================================

interface AlertBadgeProps {
  alert: WeatherAlert;
}

function AlertBadge({ alert }: AlertBadgeProps) {
  const severityColors = {
    low: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    moderate: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    high: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    severe: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const severityIcons = {
    low: null,
    moderate: <AlertTriangle className="w-3 h-3" />,
    high: <AlertTriangle className="w-3 h-3" />,
    severe: <AlertTriangle className="w-3 h-3" />,
  };

  return (
    <div
      className={`
        flex items-start gap-2 p-3 rounded-xl
        ${severityColors[alert.impact.severity]}
      `}
    >
      <div className="flex-shrink-0 mt-0.5">
        {severityIcons[alert.impact.severity]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">
          {alert.activityName && (
            <span className="opacity-70">{alert.activityName}: </span>
          )}
          {alert.impact.message}
        </p>
        <p className="text-[10px] mt-1 opacity-80">{alert.recommendation}</p>
        {alert.alternative && (
          <p className="text-[10px] mt-1 font-medium">
            {alert.alternative.suggestion}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Widget Component
// =============================================================================

/**
 * SmartWeatherWidget - Displays weather impact and alerts
 *
 * Shows the impact of weather conditions rather than just raw data.
 * Provides actionable recommendations for travelers.
 */
export default function SmartWeatherWidget({
  forecasts,
  date,
  activities = [],
  compact = false,
  showPackingSuggestions = true,
  showAlerts = true,
  className = '',
}: SmartWeatherWidgetProps) {
  // Analyze weather for the day
  const dayAnalysis = useMemo<DayWeatherAnalysis | null>(() => {
    if (!forecasts.length) return null;
    const targetDate = date || new Date().toISOString().split('T')[0];
    return analyzeDayWeather(targetDate, forecasts);
  }, [forecasts, date]);

  // Generate alerts for activities
  const alerts = useMemo<WeatherAlert[]>(() => {
    if (!showAlerts || !activities.length || !forecasts.length) return [];

    const mappedActivities = activities.map((a) => ({
      name: a.name,
      category: a.category as import('@/lib/intelligence/weather-service').ActivityCategory,
      isOutdoor: a.isOutdoor,
      scheduledTime: a.scheduledTime,
    }));

    return analyzeWeatherImpact(forecasts, mappedActivities);
  }, [forecasts, activities, showAlerts]);

  // Get current/representative weather condition
  const currentCondition = useMemo<WeatherCondition | null>(() => {
    if (!forecasts.length) return null;
    // Use midday forecast or first available
    const noonForecast = forecasts.find((f) => f.hour === 12);
    return noonForecast?.condition || forecasts[0]?.condition || null;
  }, [forecasts]);

  // Get indoor recommendations if weather is poor
  const indoorRecommendations = useMemo<string[]>(() => {
    if (!currentCondition) return [];
    const shouldShowIndoor =
      currentCondition.precipProbability && currentCondition.precipProbability > 50;
    return shouldShowIndoor ? getIndoorRecommendations(currentCondition) : [];
  }, [currentCondition]);

  // Empty state
  if (!forecasts.length || !currentCondition) {
    return (
      <div className={`p-4 rounded-2xl bg-stone-100 dark:bg-gray-800/50 ${className}`}>
        <p className="text-xs text-stone-500 dark:text-gray-400 text-center">
          Weather data unavailable
        </p>
      </div>
    );
  }

  // Format temperature
  const formatTemp = (tempC: number) => `${Math.round(tempC)}°`;

  // Compact mode
  if (compact) {
    return (
      <div className={`p-3 rounded-xl bg-stone-100 dark:bg-gray-800/50 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WeatherIcon condition={currentCondition.main} className="w-5 h-5" />
            <span className="text-sm font-medium text-stone-700 dark:text-gray-200">
              {formatTemp(currentCondition.tempC)}
            </span>
          </div>
          {dayAnalysis && (
            <p className="text-xs text-stone-500 dark:text-gray-400 truncate max-w-[150px]">
              {dayAnalysis.overallRecommendation}
            </p>
          )}
        </div>
        {/* Compact alerts summary */}
        {alerts.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span>{alerts.length} weather {alerts.length === 1 ? 'alert' : 'alerts'}</span>
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className={`rounded-2xl bg-stone-100 dark:bg-gray-800/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-stone-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white dark:bg-gray-700">
              <WeatherIcon condition={currentCondition.main} className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light text-stone-900 dark:text-white">
                  {formatTemp(currentCondition.tempC)}
                </span>
                {currentCondition.feelsLikeC && currentCondition.feelsLikeC !== currentCondition.tempC && (
                  <span className="text-xs text-stone-500 dark:text-gray-400">
                    Feels {formatTemp(currentCondition.feelsLikeC)}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-gray-400 capitalize">
                {currentCondition.description || currentCondition.main}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-col items-end gap-1 text-xs text-stone-500 dark:text-gray-400">
            {currentCondition.humidity && (
              <span>{currentCondition.humidity}% humidity</span>
            )}
            {currentCondition.windSpeedKmh && (
              <span>{currentCondition.windSpeedKmh} km/h wind</span>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {dayAnalysis && (
        <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/30">
          <p className="text-sm font-medium text-stone-700 dark:text-gray-200">
            {dayAnalysis.overallRecommendation}
          </p>
          {dayAnalysis.bestOutdoorTimes.length > 0 && (
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
              Best outdoor times: {dayAnalysis.bestOutdoorTimes.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Weather Alerts */}
      {alerts.length > 0 && (
        <div className="p-4 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400 mb-2">
            Weather Impacts
          </p>
          {alerts.slice(0, 3).map((alert) => (
            <AlertBadge key={alert.id} alert={alert} />
          ))}
          {alerts.length > 3 && (
            <p className="text-xs text-stone-500 dark:text-gray-400 text-center pt-1">
              +{alerts.length - 3} more alerts
            </p>
          )}
        </div>
      )}

      {/* Indoor Recommendations */}
      {indoorRecommendations.length > 0 && (
        <div className="px-4 pb-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Indoor Alternatives
              </p>
            </div>
            <ul className="space-y-1">
              {indoorRecommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="text-xs text-blue-600 dark:text-blue-300">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Packing Suggestions */}
      {showPackingSuggestions && dayAnalysis && dayAnalysis.packingSuggestions.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shirt className="w-4 h-4 text-stone-500 dark:text-gray-400" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400">
              Bring Today
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dayAnalysis.packingSuggestions.map((item, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-gray-700 text-stone-600 dark:text-gray-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
