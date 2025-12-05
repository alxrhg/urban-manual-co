'use client';

import React from 'react';
import { Plus, Sparkles, Coffee, MapPin, Camera, ShoppingBag, Waves, ChevronDown, ChevronUp } from 'lucide-react';
import type { ActivityType } from '@/types/trip';

interface GapSuggestionProps {
  gapMinutes: number;
  hotelName?: string;
  hotelHasPool?: boolean;
  hotelHasSpa?: boolean;
  hotelHasGym?: boolean;
  locationName?: string;
  suggestions?: SuggestionItem[];
  onAddActivity?: (activityType: ActivityType) => void;
  onAddCustom?: () => void;
  onGetAISuggestions?: () => void;
  className?: string;
}

interface SuggestionItem {
  type: ActivityType | 'custom';
  emoji: string;
  label: string;
  sublabel?: string;
}

// Quick suggestion chips for common activities
const quickSuggestions: SuggestionItem[] = [
  { type: 'cafe' as ActivityType, emoji: '☕', label: 'Nearby cafes' },
  { type: 'attraction' as ActivityType, emoji: '🏛️', label: 'Museums' },
  { type: 'shopping-time' as ActivityType, emoji: '🛍️', label: 'Shopping' },
  { type: 'photo-walk' as ActivityType, emoji: '📸', label: 'Photo spots' },
];

// Activity suggestions based on available amenities
const getHotelSuggestions = (
  hotelName?: string,
  hotelHasPool?: boolean,
  hotelHasSpa?: boolean,
  hotelHasGym?: boolean
): SuggestionItem[] => {
  const suggestions: SuggestionItem[] = [];

  if (hotelName) {
    if (hotelHasPool) {
      suggestions.push({ type: 'pool' as ActivityType, emoji: '🏊', label: 'Pool time', sublabel: hotelName });
    }
    if (hotelHasSpa) {
      suggestions.push({ type: 'spa' as ActivityType, emoji: '💆', label: 'Spa session', sublabel: hotelName });
    }
    if (hotelHasGym) {
      suggestions.push({ type: 'gym' as ActivityType, emoji: '🏋️', label: 'Workout', sublabel: hotelName });
    }
    suggestions.push({ type: 'nap' as ActivityType, emoji: '😴', label: 'Rest at hotel', sublabel: hotelName });
  }

  return suggestions;
};

/**
 * GapSuggestion - Prominent free time opportunity card
 * Shows free time as an opportunity with quick suggestions
 */
export default function GapSuggestion({
  gapMinutes,
  hotelName,
  hotelHasPool,
  hotelHasSpa,
  hotelHasGym,
  locationName,
  suggestions: customSuggestions,
  onAddActivity,
  onAddCustom,
  onGetAISuggestions,
  className = '',
}: GapSuggestionProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Only show for gaps >= 2 hours
  if (gapMinutes < 120) return null;

  // Format gap duration
  const formatGap = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const hotelSuggestions = getHotelSuggestions(hotelName, hotelHasPool, hotelHasSpa, hotelHasGym);
  const suggestions = customSuggestions || [...quickSuggestions, ...hotelSuggestions];

  return (
    <div className={`my-4 ${className}`}>
      {/* Main Free Time Card */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800/50 overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">☀️</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Free Time
                </span>
                <span className="text-base font-bold text-amber-900 dark:text-amber-300">
                  {formatGap(gapMinutes)}
                </span>
              </div>
              {locationName && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  You're at {locationName}. Here are some ideas:
                </p>
              )}
            </div>
          </div>
          <button className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 6).map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${index}`}
                  onClick={() => {
                    if (suggestion.type === 'custom') {
                      onAddCustom?.();
                    } else {
                      onAddActivity?.(suggestion.type as ActivityType);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all text-sm shadow-sm"
                >
                  <span>{suggestion.emoji}</span>
                  <span className="text-amber-800 dark:text-amber-200 font-medium">{suggestion.label}</span>
                </button>
              ))}
            </div>

            {/* AI Suggestions Button */}
            {onGetAISuggestions && (
              <button
                onClick={onGetAISuggestions}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-800 dark:bg-amber-700 text-white hover:bg-amber-900 dark:hover:bg-amber-600 transition-colors font-medium text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Get AI recommendations
              </button>
            )}

            {/* Add Custom */}
            {onAddCustom && !onGetAISuggestions && (
              <button
                onClick={onAddCustom}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add custom activity
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Gap Indicator (for smaller gaps)
// ============================================================================

interface CompactGapIndicatorProps {
  gapMinutes: number;
  onClick?: () => void;
  className?: string;
}

/**
 * CompactGapIndicator - Simple text indicator for gaps between items
 * Shows for gaps 30min - 2h
 */
export function CompactGapIndicator({
  gapMinutes,
  onClick,
  className = '',
}: CompactGapIndicatorProps) {
  // Only show for gaps between 30 min and 2 hours
  if (gapMinutes < 30 || gapMinutes >= 120) return null;

  const formatGap = (mins: number): string => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className={`flex items-center justify-center py-1 ${className}`}>
      <button
        onClick={onClick}
        className="text-[10px] text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-400 transition-colors"
      >
        {formatGap(gapMinutes)} gap
        {onClick && <span className="ml-1">+</span>}
      </button>
    </div>
  );
}

// ============================================================================
// AI Suggestion Banner
// ============================================================================

interface AISuggestionBannerProps {
  message: string;
  suggestions?: SuggestionItem[];
  onAccept?: (suggestion: SuggestionItem) => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * AISuggestionBanner - AI-powered suggestion for filling gaps
 * Shows personalized suggestions based on user preferences
 */
export function AISuggestionBanner({
  message,
  suggestions = [],
  onAccept,
  onDismiss,
  className = '',
}: AISuggestionBannerProps) {
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-r from-stone-50 to-gray-50 dark:from-gray-900/50 dark:to-gray-800/50 border border-stone-200/50 dark:border-gray-700/50 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-stone-500 dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-900 dark:text-gray-100">{message}</p>
          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onAccept?.(suggestion)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 hover:border-stone-300 dark:hover:border-gray-600 transition-colors text-xs"
                >
                  <span>{suggestion.emoji}</span>
                  <span className="text-stone-700 dark:text-gray-300">{suggestion.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <span className="text-lg">×</span>
          </button>
        )}
      </div>
    </div>
  );
}
