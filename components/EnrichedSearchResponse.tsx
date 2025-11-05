'use client';

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
  // Build a natural text response
  const buildResponse = (): string => {
    const parts: string[] = [];

    // Main result count
    if (resultCount === 0) {
      parts.push('No results found. Try refining your search or adjusting your filters.');
      return parts.join(' ');
    }

    // Result count with weather
    let mainText = `I found ${resultCount} ${resultCount === 1 ? 'result' : 'results'}`;
    if (weather) {
      mainText += ` at ${weather.temperature}°C, ${weather.weatherDescription.toLowerCase()}`;
    }
    mainText += '.';
    parts.push(mainText);

    // Weather insight
    if (weather) {
      const code = weather.weatherCode;
      if (code === 0 || code === 1) {
        parts.push('Perfect weather for outdoor dining or rooftop experiences!');
      } else if (code === 2 || code === 3) {
        parts.push('Pleasant conditions - good for exploring.');
      } else if (code >= 61 && code <= 86) {
        parts.push('Consider indoor options or places with covered seating.');
      }
    }

    // Trending opportunities
    if (opportunities && opportunities.length > 0) {
      const trendingText = opportunities.slice(0, 3).map(opp => {
        if (opp.reason) {
          return `${opp.name} (${opp.reason})`;
        }
        return opp.name;
      }).join(', ');
      parts.push(`Trending this week: ${trendingText}.`);
    }

    // Nearby events
    if (enriched?.totalEvents && enriched.totalEvents > 0) {
      parts.push(`${enriched.totalEvents} ${enriched.totalEvents === 1 ? 'destination has' : 'destinations have'} nearby upcoming events.`);
    }

    // Forecast insight
    if (forecast && forecast.trend) {
      if (forecast.trend === 'increasing') {
        parts.push('These spots are getting more popular - book ahead!');
      } else if (forecast.trend === 'decreasing') {
        parts.push('Good timing - these spots are less busy than usual.');
      }

      if (forecast.peakTimes && forecast.peakTimes.length > 0) {
        parts.push(`Peak times: ${forecast.peakTimes.join(', ')}.`);
      }
    }

    return parts.join(' ');
  };

  return (
    <div className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${className}`}>
      {buildResponse()}
    </div>
  );
}
