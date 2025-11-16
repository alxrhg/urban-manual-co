'use client';

import { Sparkles, MapPin, Clock, DollarSign, Star } from 'lucide-react';

interface FollowUpSuggestion {
  text: string;
  icon?: 'location' | 'time' | 'price' | 'rating' | 'default';
  type?: 'refine' | 'expand' | 'related';
}

interface FollowUpSuggestionsProps {
  suggestions: FollowUpSuggestion[];
  onSuggestionClick: (suggestion: string) => void;
  isLoading?: boolean;
  className?: string;
}

const iconMap = {
  location: MapPin,
  time: Clock,
  price: DollarSign,
  rating: Star,
  default: Sparkles,
};

export function FollowUpSuggestions({
  suggestions,
  onSuggestionClick,
  isLoading = false,
  className = '',
}: FollowUpSuggestionsProps) {
  if (suggestions.length === 0 || isLoading) {
    return null;
  }

  return (
    <div className={`mt-4 space-y-2 ${className}`}>
      <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
        Try asking:
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          const IconComponent = suggestion.icon ? iconMap[suggestion.icon] : iconMap.default;
          
          return (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion.text)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconComponent className="h-3 w-3" />
              <span>{suggestion.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

