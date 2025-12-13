'use client';

import { Sparkles, MapPin, Clock, DollarSign, Star, Search, Filter, Utensils, Compass, Award } from 'lucide-react';
import type { ActionPatch, ActionPatchIcon } from '@/types/action-patch';

/**
 * Legacy suggestion interface for backwards compatibility
 * @deprecated Use ActionPatch instead
 */
interface LegacyFollowUpSuggestion {
  text: string;
  icon?: 'location' | 'time' | 'price' | 'rating' | 'default';
  type?: 'refine' | 'expand' | 'related';
}

/**
 * Props for the FollowUpSuggestions component
 * Supports both ActionPatch (new) and legacy suggestion formats
 */
interface FollowUpSuggestionsProps {
  /** Suggestions in ActionPatch format (preferred) */
  suggestions?: ActionPatch[];
  /** Legacy suggestions format (deprecated) */
  legacySuggestions?: LegacyFollowUpSuggestion[];
  /** Callback when a suggestion is clicked - receives the ActionPatch */
  onPatchClick?: (patch: ActionPatch) => void;
  /** Legacy callback for string-based suggestions (deprecated) */
  onSuggestionClick?: (suggestion: string) => void;
  /** Whether suggestions are loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Optional label above suggestions */
  label?: string;
}

/**
 * Map ActionPatch icon types to Lucide icons
 */
const iconMap: Record<ActionPatchIcon | 'default', React.ComponentType<{ className?: string }>> = {
  location: MapPin,
  time: Clock,
  price: DollarSign,
  rating: Star,
  category: Utensils,
  cuisine: Utensils,
  vibe: Compass,
  trip: Compass,
  search: Search,
  filter: Filter,
  michelin: Award,
  default: Sparkles,
};

/**
 * Convert legacy suggestion to ActionPatch format
 */
function legacyToActionPatch(suggestion: LegacyFollowUpSuggestion): ActionPatch {
  const iconMapping: Record<string, ActionPatchIcon> = {
    location: 'location',
    time: 'time',
    price: 'price',
    rating: 'rating',
    default: 'default',
  };

  return {
    label: suggestion.text,
    patch: {
      query: { set: suggestion.text },
    },
    reason: {
      type: suggestion.type || 'related',
      text: 'Converted from legacy suggestion',
    },
    icon: iconMapping[suggestion.icon || 'default'] || 'default',
  };
}

/**
 * FollowUpSuggestions component
 *
 * Renders clickable suggestion pills that apply refinements deterministically
 * using the ActionPatch model.
 *
 * @example
 * // With ActionPatch suggestions (recommended)
 * <FollowUpSuggestions
 *   suggestions={actionPatches}
 *   onPatchClick={(patch) => applyPatch(currentState, patch)}
 * />
 *
 * @example
 * // With legacy suggestions (deprecated)
 * <FollowUpSuggestions
 *   legacySuggestions={oldSuggestions}
 *   onSuggestionClick={(text) => handleSearch(text)}
 * />
 */
export function FollowUpSuggestions({
  suggestions = [],
  legacySuggestions,
  onPatchClick,
  onSuggestionClick,
  isLoading = false,
  className = '',
  label = 'Try asking:',
}: FollowUpSuggestionsProps) {
  // Convert legacy suggestions to ActionPatch format if provided
  const normalizedSuggestions: ActionPatch[] = legacySuggestions
    ? legacySuggestions.map(legacyToActionPatch)
    : suggestions;

  if (normalizedSuggestions.length === 0 || isLoading) {
    return null;
  }

  const handleClick = (patch: ActionPatch) => {
    if (onPatchClick) {
      onPatchClick(patch);
    } else if (onSuggestionClick) {
      // Fallback to legacy string-based callback
      onSuggestionClick(patch.label);
    }
  };

  return (
    <div className={`mt-4 space-y-2 ${className}`}>
      {label && (
        <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
          {label}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {normalizedSuggestions.map((patch, index) => {
          const IconComponent = patch.icon ? iconMap[patch.icon] : iconMap.default;

          return (
            <button
              key={`${patch.label}-${index}`}
              onClick={() => handleClick(patch)}
              disabled={isLoading}
              title={patch.reason.text}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconComponent className="h-3 w-3" />
              <span>{patch.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact variant of FollowUpSuggestions for inline use
 */
export function FollowUpSuggestionsCompact({
  suggestions = [],
  onPatchClick,
  isLoading = false,
  className = '',
}: Omit<FollowUpSuggestionsProps, 'label' | 'legacySuggestions' | 'onSuggestionClick'>) {
  if (suggestions.length === 0 || isLoading) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {suggestions.map((patch, index) => {
        const IconComponent = patch.icon ? iconMap[patch.icon] : iconMap.default;

        return (
          <button
            key={`${patch.label}-${index}`}
            onClick={() => onPatchClick?.(patch)}
            disabled={isLoading}
            title={patch.reason.text}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconComponent className="h-2.5 w-2.5" />
            <span>{patch.label}</span>
          </button>
        );
      })}
    </div>
  );
}

