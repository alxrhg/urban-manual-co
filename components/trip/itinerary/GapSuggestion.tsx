'use client';

import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import type { ActivityType } from '@/types/trip';

interface GapSuggestionProps {
  gapMinutes: number;
  hotelName?: string;
  hotelHasPool?: boolean;
  hotelHasSpa?: boolean;
  hotelHasGym?: boolean;
  suggestions?: SuggestionItem[];
  onAddActivity?: (activityType: ActivityType) => void;
  onAddCustom?: () => void;
  className?: string;
}

interface SuggestionItem {
  type: ActivityType | 'custom';
  emoji: string;
  label: string;
  sublabel?: string;
}

// Activity suggestions based on time of day and available amenities
const getDefaultSuggestions = (
  gapMinutes: number,
  hotelName?: string,
  hotelHasPool?: boolean,
  hotelHasSpa?: boolean,
  hotelHasGym?: boolean
): SuggestionItem[] => {
  const suggestions: SuggestionItem[] = [];

  // Hotel-based suggestions (if hotel is linked)
  if (hotelName) {
    if (hotelHasPool && gapMinutes >= 60) {
      suggestions.push({
        type: 'pool',
        emoji: '🏊',
        label: 'Pool time',
        sublabel: hotelName,
      });
    }
    if (hotelHasSpa && gapMinutes >= 90) {
      suggestions.push({
        type: 'spa',
        emoji: '💆',
        label: 'Spa session',
        sublabel: hotelName,
      });
    }
    if (hotelHasGym && gapMinutes >= 45) {
      suggestions.push({
        type: 'gym',
        emoji: '🏋️',
        label: 'Workout',
        sublabel: hotelName,
      });
    }
    if (gapMinutes >= 60) {
      suggestions.push({
        type: 'nap',
        emoji: '😴',
        label: 'Rest at hotel',
        sublabel: hotelName,
      });
    }
  }

  // General suggestions
  if (gapMinutes >= 120) {
    suggestions.push({
      type: 'free-time',
      emoji: '☀️',
      label: 'Free time',
      sublabel: 'Explore the area',
    });
  }

  if (gapMinutes >= 30) {
    suggestions.push({
      type: 'photo-walk',
      emoji: '📸',
      label: 'Photo walk',
    });
  }

  if (gapMinutes >= 45) {
    suggestions.push({
      type: 'shopping-time',
      emoji: '🛍️',
      label: 'Shopping',
    });
  }

  return suggestions;
};

/**
 * GapSuggestion - Shows suggestions for free time gaps > 2 hours
 * Displays: "☀️ 5h free · Pool at hotel" style with quick add options
 */
export default function GapSuggestion({
  gapMinutes,
  hotelName,
  hotelHasPool,
  hotelHasSpa,
  hotelHasGym,
  suggestions: customSuggestions,
  onAddActivity,
  onAddCustom,
  className = '',
}: GapSuggestionProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

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

  const suggestions = customSuggestions || getDefaultSuggestions(
    gapMinutes,
    hotelName,
    hotelHasPool,
    hotelHasSpa,
    hotelHasGym
  );

  // Get primary suggestion for collapsed view
  const primarySuggestion = suggestions[0];

  return (
    <div className={`py-3 ${className}`}>
      {/* Collapsed View */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-3 group"
      >
        {/* Dashed line left */}
        <div className="flex-1 border-t border-dashed border-stone-200 dark:border-gray-700" />

        {/* Gap indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100/80 dark:bg-gray-800/80 border border-stone-200 dark:border-gray-700 transition-all group-hover:bg-stone-200/80 dark:group-hover:bg-gray-700/80">
          <span className="text-sm">{primarySuggestion?.emoji || '☀️'}</span>
          <span className="text-xs font-medium text-stone-600 dark:text-gray-300">
            {formatGap(gapMinutes)} free
          </span>
          {primarySuggestion && (
            <>
              <span className="text-stone-400 dark:text-gray-500">·</span>
              <span className="text-xs text-stone-500 dark:text-gray-400">
                {primarySuggestion.label}
                {primarySuggestion.sublabel && ` at ${primarySuggestion.sublabel}`}
              </span>
            </>
          )}
          <Plus className={`w-3 h-3 text-stone-400 dark:text-gray-500 transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
        </div>

        {/* Dashed line right */}
        <div className="flex-1 border-t border-dashed border-stone-200 dark:border-gray-700" />
      </button>

      {/* Expanded View - Suggestions */}
      {isExpanded && suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${index}`}
              onClick={() => {
                if (suggestion.type === 'custom') {
                  onAddCustom?.();
                } else {
                  onAddActivity?.(suggestion.type as ActivityType);
                }
                setIsExpanded(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 hover:border-stone-300 dark:hover:border-gray-600 transition-colors text-xs"
            >
              <span>{suggestion.emoji}</span>
              <span className="text-stone-700 dark:text-gray-300">{suggestion.label}</span>
            </button>
          ))}

          {/* Custom option */}
          {onAddCustom && (
            <button
              onClick={() => {
                onAddCustom();
                setIsExpanded(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-dashed border-stone-300 dark:border-gray-600 hover:border-stone-400 dark:hover:border-gray-500 transition-colors text-xs text-stone-500 dark:text-gray-400"
            >
              <Plus className="w-3 h-3" />
              <span>Custom</span>
            </button>
          )}
        </div>
      )}
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
