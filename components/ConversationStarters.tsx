'use client';

import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ConversationStartersProps {
  onStarterClick: (query: string) => void;
  city?: string;
  category?: string;
}

const DEFAULT_STARTERS = [
  'Best date spots in Brooklyn',
  'Hidden coffee shops in Tokyo',
  'Rooftop bars with a view in NYC',
  'Cozy restaurants for dinner tonight',
  'Museums with modern art in Paris',
  'Budget-friendly hotels in London',
];

const CITY_STARTERS: Record<string, string[]> = {
  'new-york': [
    'Best date spots in Brooklyn',
    'Rooftop bars with a view',
    'Hidden speakeasies in Manhattan',
    'Brunch spots in the West Village',
  ],
  'tokyo': [
    'Hidden coffee shops in Shibuya',
    'Best sushi under $50',
    'Quiet parks for relaxation',
    'Trendy cafes in Harajuku',
  ],
  'paris': [
    'Romantic restaurants in Montmartre',
    'Museums with modern art',
    'Best croissants in the city',
    'Hidden gardens and parks',
  ],
  'london': [
    'Afternoon tea spots',
    'Cozy pubs with history',
    'Art galleries in Shoreditch',
    'Markets for vintage shopping',
  ],
  'los-angeles': [
    'Beachside cafes in Venice',
    'Rooftop bars in DTLA',
    'Best tacos in the city',
    'Hiking trails with views',
  ],
};

const CATEGORY_STARTERS: Record<string, string[]> = {
  restaurant: [
    'Romantic dinner spots',
    'Best pasta in town',
    'Restaurants open late night',
    'Hidden gems under $30',
  ],
  cafe: [
    'Cozy cafes with wifi',
    'Best coffee and pastries',
    'Quiet spots for working',
    'Instagrammable cafes',
  ],
  hotel: [
    'Boutique hotels with character',
    'Budget-friendly stays',
    'Hotels with rooftop pools',
    'Historic hotels with charm',
  ],
  bar: [
    'Cocktail bars with craft drinks',
    'Dive bars with character',
    'Wine bars for date night',
    'Sports bars to watch the game',
  ],
  museum: [
    'Modern art museums',
    'Interactive museums for kids',
    'Free museum days',
    'Hidden gallery spaces',
  ],
};

export function ConversationStarters({ onStarterClick, city, category }: ConversationStartersProps) {
  const [starters, setStarters] = useState<string[]>(DEFAULT_STARTERS);

  useEffect(() => {
    // Prioritize category-specific starters, then city-specific, then default
    let selectedStarters: string[] = [];

    if (category && CATEGORY_STARTERS[category]) {
      selectedStarters = CATEGORY_STARTERS[category];
    } else if (city && CITY_STARTERS[city]) {
      selectedStarters = CITY_STARTERS[city];
    } else {
      selectedStarters = DEFAULT_STARTERS;
    }

    // Shuffle and pick 4
    const shuffled = [...selectedStarters].sort(() => Math.random() - 0.5);
    setStarters(shuffled.slice(0, 4));
  }, [city, category]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Try asking:</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {starters.map((starter, index) => (
          <button
            key={index}
            onClick={() => onStarterClick(starter)}
            className="group text-left px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200"
          >
            <span className="group-hover:text-black dark:group-hover:text-white transition-colors">
              "{starter}"
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
