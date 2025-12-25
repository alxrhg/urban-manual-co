'use client';

import { Search, Sparkles, MessageSquarePlus, MapPin } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

interface SmartEmptyStateProps {
  query: string;
  intent?: {
    city?: string | null;
    category?: string | null;
  };
  onAlternativeClick: (alternative: string) => void;
}

// Available cities for suggestions
const AVAILABLE_CITIES = [
  'London', 'Paris', 'Tokyo', 'New York', 'Los Angeles', 'Barcelona',
  'Rome', 'Amsterdam', 'Berlin', 'Copenhagen', 'Melbourne', 'Singapore'
];

export function SmartEmptyState({ query, intent, onAlternativeClick }: SmartEmptyStateProps) {
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [suggestedCities, setSuggestedCities] = useState<string[]>([]);
  const [showRequestSent, setShowRequestSent] = useState(false);

  useEffect(() => {
    // Generate smart alternatives based on the query and intent
    const suggestions: string[] = [];
    const cityMatches: string[] = [];

    // If they searched for a specific category, suggest related categories
    if (intent?.category) {
      const categoryAlternatives: Record<string, string[]> = {
        restaurant: ['cafe', 'bar', 'bistro'],
        cafe: ['restaurant', 'bakery', 'tea house'],
        hotel: ['hostel', 'boutique hotel', 'resort'],
        bar: ['pub', 'lounge', 'cocktail bar'],
        museum: ['gallery', 'art space', 'cultural center'],
      };

      const alts = categoryAlternatives[intent.category.toLowerCase()];
      if (alts) {
        suggestions.push(...alts);
      }
    }

    // If they searched in a specific city, suggest nearby cities
    if (intent?.city) {
      const cityAlternatives: Record<string, string[]> = {
        'new-york': ['Brooklyn', 'Jersey City', 'Williamsburg'],
        'tokyo': ['Shibuya', 'Shinjuku', 'Harajuku'],
        'paris': ['Montmartre', 'Le Marais', 'Saint-Germain'],
        'london': ['Shoreditch', 'Camden', 'Notting Hill'],
      };

      const alts = cityAlternatives[intent.city.toLowerCase()];
      if (alts) {
        suggestions.push(...alts.map(area => `${intent.category || 'places'} in ${area}`));
      }

      // Suggest similar cities with the same category
      const similarCities = AVAILABLE_CITIES.filter(
        c => c.toLowerCase() !== intent.city?.toLowerCase()
      ).slice(0, 3);
      cityMatches.push(...similarCities);
    }

    // Generic fallback suggestions
    if (suggestions.length === 0) {
      if (query.toLowerCase().includes('italian')) {
        suggestions.push('Japanese restaurants', 'French bistros', 'Mediterranean cuisine');
      } else if (query.toLowerCase().includes('coffee')) {
        suggestions.push('tea houses', 'bakeries', 'breakfast spots');
      } else if (query.toLowerCase().includes('luxury')) {
        suggestions.push('boutique options', 'mid-range alternatives', 'hidden gems');
      } else if (query.toLowerCase().includes('romantic')) {
        suggestions.push('fine dining', 'rooftop bars', 'boutique hotels');
      } else {
        suggestions.push(
          'Try removing some filters',
          'Expand your search area',
          'Browse all categories'
        );
      }
    }

    setAlternatives(suggestions.slice(0, 3));
    setSuggestedCities(cityMatches);
  }, [query, intent]);

  const handleRequestCity = useCallback(async () => {
    // In a real implementation, this would submit to an API
    // For now, we show a success message
    setShowRequestSent(true);

    // Reset after 3 seconds
    setTimeout(() => setShowRequestSent(false), 3000);
  }, []);

  const cityName = intent?.city ?
    intent.city.charAt(0).toUpperCase() + intent.city.slice(1).replace(/-/g, ' ') :
    null;
  const categoryName = intent?.category || 'places';

  return (
    <div className="text-center py-16 px-4">
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Search className="h-8 w-8 text-gray-400 dark:text-gray-600" />
          </div>
        </div>

        {/* Message */}
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
          No results found
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          We couldn't find any {categoryName}
          {cityName && ` in ${cityName}`} matching "{query}"
        </p>

        {/* Suggested cities with same category */}
        {suggestedCities.length > 0 && intent?.category && (
          <div className="mb-6 p-4 bg-[var(--editorial-accent)]/5 border border-[var(--editorial-accent)]/20 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--editorial-accent)] uppercase tracking-[2px] font-medium mb-3">
              <MapPin className="h-3.5 w-3.5" />
              <span>Try {categoryName} in:</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedCities.map((city) => (
                <button
                  key={city}
                  onClick={() => onAlternativeClick(`${categoryName} in ${city}`)}
                  className="px-4 py-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 transition-all"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Try instead:</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {alternatives.map((alt, index) => (
                <button
                  key={index}
                  onClick={() => onAlternativeClick(alt)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-all"
                >
                  {alt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Request this city/category CTA */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          {showRequestSent ? (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
              <span className="inline-block w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</span>
              Request received! We'll add this soon.
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Can't find what you're looking for?
              </p>
              <button
                onClick={handleRequestCity}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-full text-sm font-medium transition-all"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Request {cityName ? `${cityName}` : 'this destination'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
