/**
 * Generate contextual follow-up suggestions based on conversation history and results
 *
 * This module generates ActionPatch objects for deterministic refinement suggestions.
 */

import type { ActionPatch, ActionPatchIcon, ActionPatchReasonType } from '@/types/action-patch';

/**
 * Legacy interface for backwards compatibility
 * @deprecated Use ActionPatch instead
 */
export interface FollowUpSuggestion {
  text: string;
  icon?: 'location' | 'time' | 'price' | 'rating' | 'default';
  type?: 'refine' | 'expand' | 'related';
}

interface GenerateSuggestionsParams {
  query: string;
  intent?: {
    city?: string;
    category?: string;
    filters?: {
      priceLevel?: string | number;
      openNow?: boolean;
    };
  };
  destinations?: Array<{
    city?: string;
    category?: string;
    michelin_stars?: number;
    rating?: number;
    name?: string;
    slug?: string;
  }>;
  conversationHistory?: Array<{ role: string; content: string }>;
  userContext?: {
    favoriteCities?: string[];
    favoriteCategories?: string[];
  };
}

/**
 * Map legacy icon types to ActionPatch icons
 */
const iconMap: Record<string, ActionPatchIcon> = {
  location: 'location',
  time: 'time',
  price: 'price',
  rating: 'rating',
  default: 'default',
};

/**
 * Map legacy types to ActionPatch reason types
 */
const reasonTypeMap: Record<string, ActionPatchReasonType> = {
  refine: 'refine',
  expand: 'expand',
  related: 'related',
};

/**
 * Generate ActionPatch-based follow-up suggestions
 */
export function generateFollowUpSuggestions({
  query,
  intent,
  destinations = [],
  conversationHistory = [],
  userContext,
}: GenerateSuggestionsParams): ActionPatch[] {
  const suggestions: ActionPatch[] = [];
  const queryLower = query.toLowerCase();

  // Extract context from conversation history for better suggestions
  const conversationText = conversationHistory
    .slice(-6) // Last 6 messages (3 turns)
    .map(msg => msg.content.toLowerCase())
    .join(' ');

  const fullContext = `${queryLower} ${conversationText}`;

  const cityMatch = fullContext.match(/\b(tokyo|taipei|new york|london|paris|barcelona|rome|milan|berlin|amsterdam|seoul|singapore|hong kong|bangkok|bali|sydney|melbourne)\b/i);
  const hasCity = intent?.city || cityMatch;
  const detectedCity = intent?.city || (cityMatch ? capitalize(cityMatch[1]) : null);

  const categoryMatch = fullContext.match(/\b(restaurant|hotel|cafe|bar|shop|museum|gallery|park|beach|temple|shrine)\b/i);
  const hasCategory = intent?.category || categoryMatch;
  const detectedCategory = intent?.category || (categoryMatch ? categoryMatch[1].toLowerCase() : null);

  const hasPrice = intent?.filters?.priceLevel;
  const hasRating = fullContext.match(/\b(rating|rated|stars|michelin)\b/i);
  const hasTime = fullContext.match(/\b(breakfast|lunch|dinner|brunch|late night|open|closing)\b/i);

  // Detect conversational patterns
  const isFollowUp = queryLower.match(/\b(more|another|different|also|and|plus|show me|what about|how about)\b/i);
  const isRefinement = queryLower.match(/\b(with|without|that|this|these|those|like|similar)\b/i);
  const isComparison = queryLower.match(/\b(compare|versus|vs|better|best|difference)\b/i);

  // Get unique cities and categories from results
  const resultCategories = [...new Set(destinations.map(d => d.category).filter(Boolean))];
  const hasMichelin = destinations.some(d => d.michelin_stars && d.michelin_stars > 0);
  const hasHighRating = destinations.some(d => d.rating && d.rating >= 4.5);
  const topResult = destinations[0];

  // Type 1: Refinement suggestions (narrow down)
  if (hasCity && !hasCategory) {
    const category = resultCategories[0] || 'restaurant';
    const city = detectedCity || 'this city';
    suggestions.push({
      label: `Show me ${category}s in ${city}`,
      patch: {
        filters: {
          city: detectedCity,
          category,
        },
      },
      reason: { type: 'refine', text: 'Add category filter' },
      icon: 'location',
      priority: 10,
    });
  }

  if (hasCategory && !hasPrice) {
    suggestions.push({
      label: 'Show me budget-friendly options',
      patch: {
        filters: {
          priceMax: 2,
        },
      },
      reason: { type: 'refine', text: 'Filter by price range' },
      icon: 'price',
      priority: 8,
    });
  }

  if (!hasTime && hasCategory) {
    suggestions.push({
      label: "What's good for dinner?",
      patch: {
        filters: {
          timeContext: 'dinner',
        },
      },
      reason: { type: 'refine', text: 'Filter by meal time' },
      icon: 'time',
      priority: 7,
    });
  }

  if (!hasRating && hasCategory) {
    suggestions.push({
      label: 'Show me highly rated places',
      patch: {
        filters: {
          ratingMin: 4.5,
        },
      },
      reason: { type: 'refine', text: 'Filter by rating' },
      icon: 'rating',
      priority: 7,
    });
  }

  // Type 2: Expansion suggestions (broaden search)
  if (hasCategory && detectedCity) {
    suggestions.push({
      label: `What else is good in ${detectedCity}?`,
      patch: {
        filters: {
          city: detectedCity,
          category: null, // Clear category to expand
        },
      },
      reason: { type: 'expand', text: 'Explore other categories' },
      icon: 'default',
      priority: 5,
    });
  }

  // Type 3: Related suggestions (contextual)
  if (hasMichelin) {
    suggestions.push({
      label: 'Show me Michelin-starred restaurants',
      patch: {
        filters: {
          michelin: true,
          category: 'restaurant',
        },
      },
      reason: { type: 'related', text: 'Results include Michelin restaurants' },
      icon: 'michelin',
      priority: 9,
    });
  }

  if (hasHighRating && !hasRating) {
    suggestions.push({
      label: 'Show me the highest rated places',
      patch: {
        filters: {
          ratingMin: 4.5,
        },
      },
      reason: { type: 'related', text: 'Results include highly rated places' },
      icon: 'rating',
      priority: 6,
    });
  }

  // "More like this" suggestion
  if (topResult?.name && topResult?.slug) {
    suggestions.push({
      label: `More like ${topResult.name}`,
      patch: {
        intent: {
          mode: 'more_like_this',
          referenceSlug: topResult.slug,
        },
      },
      reason: { type: 'related', text: `Find similar places to ${topResult.name}` },
      icon: 'search',
      priority: 8,
    });
  }

  // Context-aware suggestions based on user preferences
  if (userContext?.favoriteCities && userContext.favoriteCities.length > 0) {
    const favoriteCity = userContext.favoriteCities[0];
    if (!hasCity || intent?.city?.toLowerCase() !== favoriteCity.toLowerCase()) {
      suggestions.push({
        label: `What's good in ${favoriteCity}?`,
        patch: {
          filters: {
            city: favoriteCity,
          },
        },
        reason: { type: 'personalized', text: 'Based on your favorite cities' },
        icon: 'location',
        priority: 4,
      });
    }
  }

  if (userContext?.favoriteCategories && userContext.favoriteCategories.length > 0) {
    const favoriteCategory = userContext.favoriteCategories[0];
    if (!hasCategory || intent?.category?.toLowerCase() !== favoriteCategory.toLowerCase()) {
      suggestions.push({
        label: `Show me ${favoriteCategory}s`,
        patch: {
          filters: {
            category: favoriteCategory,
          },
        },
        reason: { type: 'personalized', text: 'Based on your preferences' },
        icon: 'default',
        priority: 4,
      });
    }
  }

  // Conversation-aware suggestions based on history
  if (isFollowUp && conversationHistory.length > 0) {
    suggestions.push({
      label: 'Show me something different',
      patch: {
        intent: {
          mode: 'discovery',
        },
      },
      reason: { type: 'expand', text: 'Explore different options' },
      icon: 'default',
      priority: 3,
    });
  }

  if (isRefinement && conversationHistory.length > 0) {
    suggestions.push({
      label: 'Show me all options',
      patch: {
        clearFilters: true,
      },
      reason: { type: 'expand', text: 'Remove all filters' },
      icon: 'filter',
      priority: 3,
    });
  }

  if (isComparison) {
    suggestions.push({
      label: 'Show me the best rated',
      patch: {
        filters: {
          ratingMin: 4.5,
        },
      },
      reason: { type: 'refine', text: 'Filter to top-rated options' },
      icon: 'rating',
      priority: 8,
    });
  }

  // Generic fallback suggestions
  if (suggestions.length < 3) {
    if (!hasTime) {
      suggestions.push({
        label: "What's open now?",
        patch: {
          filters: {
            openNow: true,
          },
        },
        reason: { type: 'refine', text: 'Show only open places' },
        icon: 'time',
        priority: 6,
      });
    }

    if (hasCity && detectedCity) {
      suggestions.push({
        label: 'Show me hidden gems',
        patch: {
          filters: {
            vibes: ['hidden_gem'],
            city: detectedCity,
          },
        },
        reason: { type: 'expand', text: 'Discover lesser-known places' },
        icon: 'default',
        priority: 5,
      });
    }

    // Itinerary suggestion
    if (detectedCity) {
      suggestions.push({
        label: `Plan my day in ${detectedCity}`,
        patch: {
          filters: { city: detectedCity },
          intent: { mode: 'itinerary', itineraryDuration: 'full_day' },
        },
        reason: { type: 'expand', text: 'Create a day itinerary' },
        icon: 'trip',
        priority: 4,
      });
    }
  }

  // Sort by priority and limit to 4 suggestions
  const prioritized = suggestions
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 4);

  // Provide fallbacks if no suggestions
  if (prioritized.length === 0) {
    return [
      {
        label: 'Show me more options',
        patch: {
          intent: { mode: 'discovery' },
        },
        reason: { type: 'expand', text: 'Explore more options' },
        icon: 'default',
      },
      {
        label: "What else is good here?",
        patch: {
          clearFilters: true,
        },
        reason: { type: 'related', text: 'Browse all options' },
        icon: 'default',
      },
    ];
  }

  return prioritized;
}

/**
 * Convert ActionPatch to legacy FollowUpSuggestion format
 * @deprecated Use ActionPatch directly in new code
 */
export function actionPatchToLegacy(patch: ActionPatch): FollowUpSuggestion {
  // Map ActionPatch icons to legacy icons
  const legacyIconMap: Record<string, FollowUpSuggestion['icon']> = {
    location: 'location',
    time: 'time',
    price: 'price',
    rating: 'rating',
    michelin: 'rating', // Map to rating since michelin relates to quality
    category: 'default',
    cuisine: 'default',
    vibe: 'default',
    trip: 'default',
    search: 'default',
    filter: 'default',
    default: 'default',
  };

  // Map ActionPatch reason types to legacy types
  const legacyTypeMap: Record<string, FollowUpSuggestion['type']> = {
    refine: 'refine',
    expand: 'expand',
    related: 'related',
    personalized: 'related',
    popular: 'related',
    contextual: 'related',
    clarification: 'refine',
    alternative: 'refine',
  };

  return {
    text: patch.label,
    icon: legacyIconMap[patch.icon || 'default'] || 'default',
    type: legacyTypeMap[patch.reason.type] || 'related',
  };
}

/**
 * Convert legacy FollowUpSuggestion to ActionPatch format
 */
export function legacyToActionPatch(suggestion: FollowUpSuggestion): ActionPatch {
  return {
    label: suggestion.text,
    patch: {
      query: { set: suggestion.text },
    },
    reason: {
      type: reasonTypeMap[suggestion.type || 'related'] || 'related',
      text: 'Converted from legacy suggestion',
    },
    icon: iconMap[suggestion.icon || 'default'] || 'default',
  };
}

// Helper function
function capitalize(str: string): string {
  return str.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

