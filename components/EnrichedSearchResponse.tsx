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
  onFollowUp?: (query: string) => void;
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
  onFollowUp,
}: EnrichedSearchResponseProps) {
  // Build a conversational response like a helpful travel assistant
  const buildResponse = (): { text: string; followUpHint: string | null } => {
    const parts: string[] = [];
    let followUpHint: string | null = null;

    // No results case
    if (resultCount === 0) {
      return {
        text: 'No results found. Try refining your search or adjusting your filters.',
        followUpHint: 'Try another search...',
      };
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

    // Follow-up hint based on category (used as placeholder)
    if (category === 'Dining' || category === 'restaurant') {
      followUpHint = 'Anything specific? French, Japanese, Italian...';
    } else if (category === 'Hotel') {
      followUpHint = 'Looking for luxury, boutique, or budget-friendly?';
    } else if (category === 'Cafe') {
      followUpHint = 'Coffee, brunch, or cozy workspace?';
    } else if (!category && cityName) {
      followUpHint = 'Looking for dining, hotels, or just exploring?';
    } else {
      followUpHint = 'Tell me more about what you\'re looking for...';
    }

    return { text: parts.join(' '), followUpHint };
  };

  const { text, followUpHint } = buildResponse();

  const handleSend = (input: HTMLInputElement) => {
    const query = input.value.trim();
    if (query && onFollowUp) {
      onFollowUp(query);
      input.value = '';
    }
  };

  return (
    <div className={className}>
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
        {text}
      </div>

      {/* Follow-up input box - minimal borderless style matching main search */}
      {followUpHint && onFollowUp && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-900">
          <input
            type="text"
            placeholder={followUpHint}
            className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white transition-all duration-300 placeholder:opacity-60"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSend(e.currentTarget);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
