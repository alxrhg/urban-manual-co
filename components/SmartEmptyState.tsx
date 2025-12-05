'use client';

import { Search } from 'lucide-react';
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
          'remove some filters',
          'expand search area',
          'browse all categories'
        );
      }
    }

    setAlternatives(suggestions.slice(0, 5));
  }, [query, intent]);

  return (
    <div className="text-center py-16 px-4">
      <div className="max-w-md mx-auto">
        {/* Minimal icon */}
        <div className="mb-4 flex justify-center">
          <Search className="h-6 w-6 text-gray-300 dark:text-gray-600" />
        </div>

        {/* Simple message */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          No {intent?.category || 'results'}
          {intent?.city && ` in ${intent.city}`}
        </p>

        {/* Inline alternatives - text links, not buttons */}
        {alternatives.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {alternatives.map((alt, index) => (
              <span key={index} className="flex items-center">
                {index > 0 && <span className="text-gray-300 dark:text-gray-600 text-xs mx-1">·</span>}
                <button
                  onClick={() => onAlternativeClick(alt)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-all"
                >
                  {alt}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
