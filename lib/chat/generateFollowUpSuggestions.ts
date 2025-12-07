/**
 * Generate contextual follow-up suggestions based on conversation history and results
 * Includes creative/outside-the-box suggestions for discovery
 */

interface FollowUpSuggestion {
  text: string;
  icon?: 'location' | 'time' | 'price' | 'rating' | 'default' | 'sparkle' | 'compass' | 'story' | 'mood';
  type?: 'refine' | 'expand' | 'related' | 'creative' | 'serendipity' | 'contrarian';
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
    tags?: string[];
  }>;
  conversationHistory?: Array<{ role: string; content: string }>;
  userContext?: {
    favoriteCities?: string[];
    favoriteCategories?: string[];
    preferredStyles?: string[];
    visitedCount?: number;
  };
  creativeMode?: {
    enabled: boolean;
    type?: string;
    intensity?: number;
  };
}

export function generateFollowUpSuggestions({
  query,
  intent,
  destinations = [],
  conversationHistory = [],
  userContext,
  creativeMode,
}: GenerateSuggestionsParams): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const creativeSuggestions: FollowUpSuggestion[] = [];
  const queryLower = query.toLowerCase();

  // Extract context from conversation history for better suggestions
  const conversationText = conversationHistory
    .slice(-6) // Last 6 messages (3 turns)
    .map(msg => msg.content.toLowerCase())
    .join(' ');
  
  const fullContext = `${queryLower} ${conversationText}`;
  
  const hasCity = intent?.city || fullContext.match(/\b(tokyo|taipei|new york|london|paris|barcelona|rome|milan|berlin|amsterdam|seoul|singapore|hong kong|bangkok|bali|sydney|melbourne)\b/i);
  const hasCategory = intent?.category || fullContext.match(/\b(restaurant|hotel|cafe|bar|shop|museum|gallery|park|beach|temple|shrine)\b/i);
  const hasPrice = intent?.filters?.priceLevel;
  const hasRating = fullContext.match(/\b(rating|rated|stars|michelin)\b/i);
  const hasTime = fullContext.match(/\b(breakfast|lunch|dinner|brunch|late night|open|closing)\b/i);
  const hasLocation = fullContext.match(/\b(near|close|walking|distance|area|neighborhood|district)\b/i);
  
  // Detect conversational patterns
  const isFollowUp = queryLower.match(/\b(more|another|different|also|and|plus|show me|what about|how about)\b/i);
  const isRefinement = queryLower.match(/\b(with|without|that|this|these|those|like|similar)\b/i);
  const isComparison = queryLower.match(/\b(compare|versus|vs|better|best|difference)\b/i);

  // Get unique cities and categories from results
  const resultCities = [...new Set(destinations.map(d => d.city).filter(Boolean))];
  const resultCategories = [...new Set(destinations.map(d => d.category).filter(Boolean))];
  const hasMichelin = destinations.some(d => d.michelin_stars && d.michelin_stars > 0);
  const hasHighRating = destinations.some(d => d.rating && d.rating >= 4.5);

  // Type 1: Refinement suggestions (narrow down)
  if (hasCity && !hasCategory) {
    suggestions.push({
      text: `Show me ${resultCategories[0] || 'restaurants'} in ${intent?.city || 'this city'}`,
      icon: 'location',
      type: 'refine',
    });
  }

  if (hasCategory && !hasPrice) {
    suggestions.push({
      text: 'Show me budget-friendly options',
      icon: 'price',
      type: 'refine',
    });
  }

  if (!hasTime && hasCategory) {
    suggestions.push({
      text: 'What\'s good for dinner?',
      icon: 'time',
      type: 'refine',
    });
  }

  if (!hasRating && hasCategory) {
    suggestions.push({
      text: 'Show me highly rated places',
      icon: 'rating',
      type: 'refine',
    });
  }

  if (hasCity && !hasLocation) {
    suggestions.push({
      text: 'Show me places near the city center',
      icon: 'location',
      type: 'refine',
    });
  }

  // Type 2: Expansion suggestions (broaden search)
  if (hasCity && resultCities.length === 1) {
    suggestions.push({
      text: `Show me places in nearby cities`,
      icon: 'location',
      type: 'expand',
    });
  }

  if (hasCategory && resultCategories.length === 1) {
    suggestions.push({
      text: `What else is good in ${intent?.city || 'this area'}?`,
      icon: 'default',
      type: 'expand',
    });
  }

  // Type 3: Related suggestions (contextual)
  if (hasMichelin) {
    suggestions.push({
      text: 'Show me more Michelin-starred restaurants',
      icon: 'rating',
      type: 'related',
    });
  }

  if (hasHighRating && !hasRating) {
    suggestions.push({
      text: 'Show me the highest rated places',
      icon: 'rating',
      type: 'related',
    });
  }

  // Context-aware suggestions based on user preferences
  if (userContext?.favoriteCities && userContext.favoriteCities.length > 0) {
    const favoriteCity = userContext.favoriteCities[0];
    if (!hasCity || intent?.city?.toLowerCase() !== favoriteCity.toLowerCase()) {
      suggestions.push({
        text: `What's good in ${favoriteCity}?`,
        icon: 'location',
        type: 'related',
      });
    }
  }

  if (userContext?.favoriteCategories && userContext.favoriteCategories.length > 0) {
    const favoriteCategory = userContext.favoriteCategories[0];
    if (!hasCategory || intent?.category?.toLowerCase() !== favoriteCategory.toLowerCase()) {
      suggestions.push({
        text: `Show me ${favoriteCategory}`,
        icon: 'default',
        type: 'related',
      });
    }
  }

  // Conversation-aware suggestions based on history
  if (isFollowUp && conversationHistory.length > 0) {
    // If user is asking for more, suggest related but different options
    suggestions.push({
      text: 'Show me something different',
      icon: 'default',
      type: 'expand',
    });
  }
  
  if (isRefinement && conversationHistory.length > 0) {
    // If refining, suggest removing filters
    suggestions.push({
      text: 'Show me all options',
      icon: 'default',
      type: 'expand',
    });
  }
  
  if (isComparison) {
    suggestions.push({
      text: 'Show me the best rated',
      icon: 'rating',
      type: 'refine',
    });
  }

  // Generic fallback suggestions
  if (suggestions.length < 3) {
    if (!hasTime) {
      suggestions.push({
        text: 'What\'s open now?',
        icon: 'time',
        type: 'refine',
      });
    }

    if (hasCity) {
      suggestions.push({
        text: 'Show me hidden gems',
        icon: 'default',
        type: 'expand',
      });
    }

    if (hasCategory) {
      suggestions.push({
        text: 'Show me with outdoor seating',
        icon: 'location',
        type: 'refine',
      });
    }
  }

  // === CREATIVE / OUTSIDE-THE-BOX SUGGESTIONS ===

  // Always offer at least one creative option to encourage exploration
  const hasCreativeQuery = queryLower.match(/\b(surprise|unexpected|different|random|wild card|dealer's choice|feeling lucky)\b/i);
  const hasExploredEnough = (userContext?.visitedCount || 0) > 10; // User has explored a bit
  const isStandardSearch = !hasCreativeQuery && !creativeMode?.enabled;

  // Serendipity suggestions
  if (isStandardSearch && !hasCreativeQuery) {
    creativeSuggestions.push({
      text: 'Surprise me with something unexpected',
      icon: 'sparkle',
      type: 'serendipity',
    });
  }

  // Contrarian suggestions (if user has preferences established)
  if (hasExploredEnough && userContext?.preferredStyles?.length) {
    creativeSuggestions.push({
      text: 'Challenge my usual taste',
      icon: 'compass',
      type: 'contrarian',
    });
  }

  // Story-based discovery
  if (hasCity && !queryLower.includes('history') && !queryLower.includes('story')) {
    creativeSuggestions.push({
      text: 'Find places with fascinating backstories',
      icon: 'story',
      type: 'creative',
    });
  }

  // Cross-domain inspiration
  if (hasCategory) {
    const category = intent?.category?.toLowerCase() || resultCategories[0]?.toLowerCase();
    if (category === 'restaurant') {
      creativeSuggestions.push({
        text: 'Restaurants that feel like art galleries',
        icon: 'sparkle',
        type: 'creative',
      });
    } else if (category === 'hotel') {
      creativeSuggestions.push({
        text: 'Hotels with bookstore vibes',
        icon: 'sparkle',
        type: 'creative',
      });
    } else if (category === 'cafe') {
      creativeSuggestions.push({
        text: "Cafes that feel like someone's living room",
        icon: 'sparkle',
        type: 'creative',
      });
    } else if (category === 'bar') {
      creativeSuggestions.push({
        text: 'Bars with museum energy',
        icon: 'sparkle',
        type: 'creative',
      });
    }
  }

  // Mood-based suggestions
  if (isStandardSearch) {
    creativeSuggestions.push({
      text: 'I need somewhere calming',
      icon: 'mood',
      type: 'creative',
    });
  }

  // Future trends
  if (hasCity) {
    creativeSuggestions.push({
      text: "What's about to blow up here?",
      icon: 'sparkle',
      type: 'creative',
    });
  }

  // Cultural reference suggestions (rotate these)
  const culturalSuggestions = [
    { text: 'Where would Wes Anderson eat?', icon: 'sparkle' as const, type: 'creative' as const },
    { text: 'Places Anthony Bourdain would love', icon: 'sparkle' as const, type: 'creative' as const },
    { text: 'The opposite of a chain restaurant', icon: 'compass' as const, type: 'contrarian' as const },
  ];

  // Pick one cultural suggestion based on query hash for variety
  const culturalIndex = query.length % culturalSuggestions.length;
  if (hasCategory && creativeSuggestions.length < 3) {
    creativeSuggestions.push(culturalSuggestions[culturalIndex]);
  }

  // "What am I missing" for experienced users
  if (hasExploredEnough && hasCity) {
    creativeSuggestions.push({
      text: 'What am I missing in this city?',
      icon: 'compass',
      type: 'contrarian',
    });
  }

  // Limit to 3-4 suggestions and prioritize by type
  // Mix in 1 creative suggestion with regular suggestions
  const regularPrioritized = [
    ...suggestions.filter(s => s.type === 'refine'),
    ...suggestions.filter(s => s.type === 'expand'),
    ...suggestions.filter(s => s.type === 'related'),
  ].slice(0, 3);

  // Add one creative suggestion if we have regular ones
  const topCreative = creativeSuggestions.slice(0, 1);

  const finalSuggestions = [...regularPrioritized, ...topCreative].slice(0, 4);

  return finalSuggestions.length > 0 ? finalSuggestions : [
    { text: 'Show me more options', icon: 'default', type: 'expand' },
    { text: 'Surprise me with something unexpected', icon: 'sparkle', type: 'serendipity' },
  ];
}

