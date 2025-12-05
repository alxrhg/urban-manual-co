'use client';

import { MapPin, Calendar, X } from 'lucide-react';

interface SearchFilters {
  michelin?: boolean;
  crown?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
}

interface IntentData {
  city?: string;
  category?: string;
  filters?: SearchFilters;
  intent?: string;
  confidence?: number;
  clarifications?: string[];
  keywords?: string[];
  resultCount?: number;
  hasResults?: boolean;
}

interface IntelligentSearchFeedbackProps {
  intent?: IntentData;
  isSearching?: boolean;
  onRefine?: (suggestion: string) => void;
  onRemoveFilter?: (filter: string) => void;
  seasonalContext?: {
    event?: string;
    description?: string;
    start?: string;
    end?: string;
  };
}

export function IntelligentSearchFeedback({
  intent,
  isSearching,
  onRefine,
  onRemoveFilter,
  seasonalContext
}: IntelligentSearchFeedbackProps) {
  if (!intent || isSearching) {
    return null;
  }

  const hasFilters = intent.city || intent.category || (intent.keywords && intent.keywords.length > 0);

  // Build refinement suggestions as inline text
  const refinements: string[] = [];
  if (intent.city && !intent.category) {
    refinements.push('add category');
  }
  if (intent.category && !intent.city) {
    refinements.push('add location');
  }
  if (!intent.keywords?.includes('romantic')) {
    refinements.push('romantic');
  }
  if (!intent.keywords?.includes('highly rated')) {
    refinements.push('highly rated');
  }
  if (!intent.filters?.openNow) {
    refinements.push('open now');
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Active filters as removable chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {intent.city && (
            <button
              onClick={() => onRemoveFilter?.(intent.city!)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <MapPin className="h-3 w-3" />
              {intent.city}
              <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {intent.category && (
            <button
              onClick={() => onRemoveFilter?.(intent.category!)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {intent.category}
              <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {intent.keywords?.slice(0, 3).map((keyword, idx) => (
            <button
              key={idx}
              onClick={() => onRemoveFilter?.(keyword)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {keyword}
              <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
            </button>
          ))}
          {intent.filters?.michelin && (
            <button
              onClick={() => onRemoveFilter?.('michelin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Michelin starred
              <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      )}

      {/* Inline refinement suggestions - text links, not buttons */}
      {refinements.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {refinements.slice(0, 5).map((suggestion, i) => (
            <span key={suggestion} className="flex items-center">
              {i > 0 && <span className="text-gray-300 dark:text-gray-600 text-xs mx-1">·</span>}
              <button
                onClick={() => onRefine?.(suggestion)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-all"
              >
                {suggestion}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Clarifications - simplified */}
      {intent.clarifications && intent.clarifications.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {intent.clarifications.slice(0, 3).map((clarification, idx) => (
            <span key={idx} className="flex items-center">
              {idx > 0 && <span className="text-gray-300 dark:text-gray-600 text-xs mx-1">·</span>}
              <button
                onClick={() => onRefine?.(clarification)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-all"
              >
                {clarification}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Seasonal context - subtle, not a card */}
      {seasonalContext?.event && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="h-3.5 w-3.5" />
          <span>{seasonalContext.event}</span>
          {seasonalContext.start && seasonalContext.end && (
            <span className="text-gray-400 dark:text-gray-500">
              ({new Date(seasonalContext.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(seasonalContext.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

