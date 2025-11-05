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
  city?: string;
  category?: string;
  weather?: WeatherData | null;
  opportunities?: OpportunityData[];
  eventsNearby?: EventData[];
  forecast?: ForecastData | null;
  enriched?: EnrichedMetadata;
  className?: string;
}

export function EnrichedSearchResponse({
  resultCount,
  city,
  category,
  weather,
  opportunities,
  eventsNearby,
  forecast,
  enriched,
  className = '',
}: EnrichedSearchResponseProps) {
  // Build a conversational response like a helpful travel assistant
  const buildResponse = (): string => {
    const parts: string[] = [];

    // No results case
    if (resultCount === 0) {
      parts.push('No results found. Try refining your search or adjusting your filters.');
      return parts.join(' ');
    }

    // Main opener - mention city if known
    const cityName = city ? city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
    let opener = `I found ${resultCount} ${resultCount === 1 ? 'spot' : 'spots'}`;
    if (cityName) {
      opener += ` in ${cityName}`;
    }
    parts.push(opener + '.');

    // Weather description - conversational with insights
    if (weather) {
      const temp = weather.temperature;
      const code = weather.weatherCode;

      let weatherText = 'The weather ';

      // Temperature feel
      if (temp < 5) {
        weatherText += 'is quite chilly';
      } else if (temp < 12) {
        weatherText += 'is a bit cool';
      } else if (temp < 20) {
        weatherText += 'looks pleasant';
      } else if (temp < 28) {
        weatherText += 'looks great';
      } else {
        weatherText += 'is quite warm';
      }

      weatherText += ` at ${temp}°C`;

      // Weather conditions with helpful insights
      if (code === 0 || code === 1) {
        weatherText += ' with clear skies. ☀️ Perfect weather for outdoor dining or rooftop experiences!';
      } else if (code === 2 || code === 3) {
        weatherText += ' with some clouds. ⛅ Still nice for exploring and outdoor spots.';
      } else if (code >= 61 && code <= 86) {
        weatherText += ' but it might rain. 🌧️ Consider indoor options or places with covered seating.';
      } else {
        weatherText += '.';
      }

      parts.push(weatherText);
    }

    // Events - conversational
    if (enriched?.totalEvents && enriched.totalEvents > 0) {
      parts.push(`Also, there ${enriched.totalEvents === 1 ? 'is a nearby event' : `are ${enriched.totalEvents} nearby events`} happening if you're into that!`);
    }

    // Trending spots
    if (opportunities && opportunities.length > 0) {
      const firstSpot = opportunities[0];
      parts.push(`${firstSpot.name} is trending right now${firstSpot.reason ? ` (${firstSpot.reason.toLowerCase()})` : ''}.`);
    }

    // Follow-up questions based on category
    if (category === 'Dining' || category === 'restaurant') {
      parts.push('Are you looking for anything specific? French, Japanese, Italian?');
    } else if (category === 'Hotel') {
      parts.push('Looking for luxury, boutique, or budget-friendly?');
    } else if (category === 'Cafe') {
      parts.push('Coffee, brunch, or something cozy to work from?');
    } else if (!category && cityName) {
      // No specific category - suggest options
      parts.push('Looking for dining, hotels, or just exploring?');
    }

    return parts.join(' ');
  };

  return (
    <div className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${className}`}>
      {buildResponse()}
    </div>
  );
}
