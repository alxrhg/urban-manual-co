'use client';

import { TrendingUp, Calendar, CloudSun, MapPin, Sparkles, AlertCircle } from 'lucide-react';

export interface WeatherData {
  temperature: number;
  weatherDescription: string;
  weatherCode: number;
  humidity?: number;
}

export interface OpportunityData {
  id: string | number;
  name: string;
  reason: string;
  type: 'trending' | 'hidden_gem' | 'price_drop' | 'new';
  score?: number;
}

export interface EventData {
  name: string;
  date?: string;
  venue?: string;
}

export interface ForecastData {
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence?: number;
  peakTimes?: string[];
}

export interface EnrichedMetadata {
  hasWeather: boolean;
  hasEvents: boolean;
  hasRoutes: boolean;
  hasPhotos: boolean;
  totalPhotos?: number;
  totalEvents?: number;
}

interface EnrichedSearchResponseProps {
  resultCount: number;
  weather?: WeatherData | null;
  opportunities?: OpportunityData[];
  eventsNearby?: EventData[];
  forecast?: ForecastData | null;
  enriched?: EnrichedMetadata;
  className?: string;
}

export function EnrichedSearchResponse({
  resultCount,
  weather,
  opportunities,
  eventsNearby,
  forecast,
  enriched,
  className = '',
}: EnrichedSearchResponseProps) {
  // Weather-aware messaging
  const getWeatherInsight = (weather: WeatherData): string | null => {
    const code = weather.weatherCode;

    // Clear weather (0-1)
    if (code === 0 || code === 1) {
      return '☀️ Perfect weather for outdoor dining or rooftop experiences!';
    }

    // Partly cloudy (2-3)
    if (code === 2 || code === 3) {
      return '⛅ Pleasant conditions - good for exploring!';
    }

    // Rainy/snowy (61-86)
    if (code >= 61 && code <= 86) {
      return '🌧️ Consider indoor options or places with covered seating.';
    }

    return null;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main result count with context */}
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <span className="font-medium">
          {resultCount === 0 ? 'No results found' : `I found ${resultCount} ${resultCount === 1 ? 'result' : 'results'}`}
        </span>
        {resultCount > 0 && weather && (
          <span className="ml-2">
            at {weather.temperature}°C, {weather.weatherDescription.toLowerCase()}
          </span>
        )}
      </div>

      {/* Weather insight */}
      {weather && (
        <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
          <CloudSun className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{getWeatherInsight(weather)}</span>
        </div>
      )}

      {/* Trending opportunities */}
      {opportunities && opportunities.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-900 dark:text-purple-200">
              Trending this week
            </span>
          </div>
          <div className="space-y-1">
            {opportunities.slice(0, 3).map((opp, index) => (
              <div
                key={opp.id || index}
                className="text-xs text-purple-800 dark:text-purple-300 flex items-start gap-2"
              >
                <span className="opacity-50">•</span>
                <span>
                  <strong>{opp.name}</strong>
                  {opp.reason && <span className="text-purple-600 dark:text-purple-400"> - {opp.reason}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby events */}
      {enriched?.totalEvents && enriched.totalEvents > 0 && (
        <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
          <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
          <span>
            {enriched.totalEvents} {enriched.totalEvents === 1 ? 'destination near' : 'destinations near'} upcoming events
          </span>
        </div>
      )}

      {/* Walking distances available */}
      {enriched?.hasRoutes && (
        <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Walking times from city center shown below</span>
        </div>
      )}

      {/* Forecast insight */}
      {forecast && forecast.trend && resultCount > 0 && (
        <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
          <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
          <span>
            {forecast.trend === 'increasing' && 'These spots are getting more popular - book ahead!'}
            {forecast.trend === 'decreasing' && 'Good timing - these spots are less busy than usual.'}
            {forecast.trend === 'stable' && 'Consistently popular destinations.'}
            {forecast.peakTimes && forecast.peakTimes.length > 0 && (
              <span className="block mt-1 text-gray-500 dark:text-gray-500">
                Peak times: {forecast.peakTimes.join(', ')}
              </span>
            )}
          </span>
        </div>
      )}

      {/* No results messaging */}
      {resultCount === 0 && (
        <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Try refining your search or adjusting your filters</span>
        </div>
      )}
    </div>
  );
}
