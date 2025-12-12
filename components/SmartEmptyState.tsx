'use client';

import { Search, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SmartEmptyStateProps {
  query: string;
  intent?: {
    city?: string | null;
    category?: string | null;
  };
  onAlternativeClick: (alternative: string) => void;
}

export function SmartEmptyState({ query, intent, onAlternativeClick }: SmartEmptyStateProps) {
  const [alternatives, setAlternatives] = useState<string[]>([]);

  useEffect(() => {
    // Generate smart alternatives based on the query and intent
    const suggestions: string[] = [];

    // If they searched for a specific category, suggest related categories
    if (intent?.category) {
      const categoryAlternatives: Record<string, string[]> = {
        restaurant: ['cafe', 'bar', 'bistro'],
        cafe: ['restaurant', 'bakery', 'tea house'],
        hotel: ['hostel', 'boutique hotel', 'resort'],
        bar: ['pub', 'lounge', 'cocktail bar'],
        museum: ['gallery', 'art space', 'cultural center'],
      };

      const alts = categoryAlternatives[(intent.category || '').toLowerCase()];
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

      const alts = cityAlternatives[(intent.city || '').toLowerCase()];
      if (alts) {
        suggestions.push(...alts.map(area => `${intent.category || 'places'} in ${area}`));
      }
    }

    // Generic fallback suggestions
    if (suggestions.length === 0) {
      if (query.toLowerCase().includes('italian')) {
        suggestions.push('Japanese restaurants', 'French bistros', 'Mediterranean cuisine');
      } else if (query.toLowerCase().includes('coffee')) {
        suggestions.push('tea houses', 'bakeries', 'breakfast spots');
      } else if (query.toLowerCase().includes('luxury')) {
        suggestions.push('boutique options', 'mid-range alternatives', 'hidden gems');
      } else {
        suggestions.push(
          'Try removing some filters',
          'Expand your search area',
          'Browse all categories'
        );
      }
    }

    setAlternatives(suggestions.slice(0, 3));
  }, [query, intent]);

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
          We couldn't find any {intent?.category || 'places'}
          {intent?.city && ` in ${intent.city}`} matching "{query}"
        </p>

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <div className="space-y-3">
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
      </div>
    </div>
  );
}
