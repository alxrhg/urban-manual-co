'use client';

import { Sparkles, MapPin, Filter, Lightbulb, TrendingUp, Calendar, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  seasonalContext
}: IntelligentSearchFeedbackProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!intent || isSearching) {
    return null;
  }

  const hasFilters = intent.city || intent.category || (intent.filters && Object.keys(intent.filters).length > 0);
  const confidence = intent.confidence ?? 1.0;
  const isLowConfidence = confidence < 0.6;

  return (
    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Main Feedback Card */}
      <div className={`p-4 rounded-lg border transition-all ${
        isLowConfidence
          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
          : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${
            isLowConfidence ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
          }`}>
            {isLowConfidence ? <HelpCircle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            {/* Intent Understanding */}
            {intent.intent && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {intent.intent}
                </p>
                {intent.confidence !== undefined && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          confidence >= 0.8 ? 'bg-green-500' : confidence >= 0.6 ? 'bg-yellow-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(confidence * 100)}% confidence
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Extracted Criteria */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mt-2">
                {intent.city && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <MapPin className="h-3 w-3" />
                    {intent.city}
                  </span>
                )}
                {intent.category && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <Filter className="h-3 w-3" />
                    {intent.category}
                  </span>
                )}
                {intent.keywords && intent.keywords.length > 0 && (
                  intent.keywords.slice(0, 3).map((keyword, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                      {keyword}
                    </span>
                  ))
                )}
                {intent.filters?.michelin && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    ⭐ {intent.filters.michelin} Michelin
                  </span>
                )}
                {intent.filters?.rating && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    ⭐ {intent.filters.rating}+ rating
                  </span>
                )}
              </div>
            )}

            {/* Result Count */}
            {intent.hasResults !== undefined && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {intent.resultCount === 0 ? (
                  <span>No results found. Try refining your search.</span>
                ) : (
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Found {intent.resultCount} {intent.resultCount === 1 ? 'result' : 'results'}
                  </span>
                )}
              </div>
            )}

            {/* Clarifications for ambiguous queries */}
            {intent.clarifications && intent.clarifications.length > 0 && (
              <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Need more information:
                </p>
                <div className="space-y-1">
                  {intent.clarifications.map((clarification, idx) => (
                    <button
                      key={idx}
                      onClick={() => onRefine?.(clarification)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 block text-left w-full"
                    >
                      💡 {clarification}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seasonal Intelligence */}
      {seasonalContext && seasonalContext.event && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {seasonalContext.event}
              </p>
              {seasonalContext.description && (
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                  {seasonalContext.description}
                </p>
              )}
              {seasonalContext.start && seasonalContext.end && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {new Date(seasonalContext.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(seasonalContext.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Refinement Suggestions */}
      {intent.hasResults && intent.resultCount && intent.resultCount > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Refine your search:
          </p>
          <div className="flex flex-wrap gap-2">
            {intent.city && !intent.category && (
              <button
                onClick={() => onRefine?.(`${intent.city} ${intent.category || 'restaurants'}`)}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-700 transition-colors"
              >
                Add category filter
              </button>
            )}
            {intent.category && !intent.city && (
              <button
                onClick={() => onRefine?.(`${intent.category} in Tokyo`)}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-700 transition-colors"
              >
                Add city
              </button>
            )}
            <button
              onClick={() => onRefine?.(`${intent.city || ''} ${intent.category || ''} romantic`.trim())}
              className="text-xs px-2 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-700 transition-colors"
            >
              Add "romantic"
            </button>
            <button
              onClick={() => onRefine?.(`${intent.city || ''} ${intent.category || ''} with good views`.trim())}
              className="text-xs px-2 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-700 transition-colors"
            >
              Add "with good views"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

