'use client';

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
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {suggestions.map((suggestion, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && <span className="text-gray-300 dark:text-gray-600 text-xs mx-1">·</span>}
          <button
            onClick={() => onSuggestionClick(suggestion.text)}
            disabled={isLoading}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion.text}
          </button>
        </span>
      ))}
    </div>
  );
}

