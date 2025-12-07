/**
 * Travel Intelligence API v2
 *
 * A unified, conversational travel search endpoint that combines:
 * - Semantic vector search (Upstash)
 * - Natural language understanding
 * - 8-factor intelligent ranking
 * - Knowledge graph relationships
 * - Conversation memory
 * - Personalization
 * - LLM-powered conversational responses
 * - Itinerary planning mode
 * - Multi-turn clarification
 * - Taste profile learning
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling } from '@/lib/errors';
import { queryVectorIndex, VectorSearchResult } from '@/lib/upstash-vector';
import { generateTextEmbedding } from '@/lib/ml/embeddings';
import { searchRankingAlgorithm } from '@/services/intelligence/search-ranking';
import { knowledgeGraphService } from '@/services/intelligence/knowledge-graph';
import { generateText, generateJSON } from '@/lib/llm';
import { tasteProfileEvolutionService } from '@/services/intelligence/taste-profile-evolution';
import { searchRatelimit, memorySearchRatelimit, getIdentifier, createRateLimitResponse, isUpstashConfigured } from '@/lib/rate-limit';

// Types
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  metadata?: {
    intent?: string;
    filters?: SearchFilters;
    destinationIds?: number[];
  };
}

interface SearchFilters {
  city?: string | null;
  category?: string | null;
  neighborhood?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  michelin?: boolean;
  occasion?: string | null;
  vibe?: string[];
  openNow?: boolean;
}

interface TravelIntelligenceRequest {
  query: string;
  conversationHistory?: ConversationMessage[];
  filters?: SearchFilters;
  limit?: number;
}

interface ParsedIntent {
  searchQuery: string;
  filters: SearchFilters;
  intent: 'search' | 'recommendation' | 'discovery' | 'comparison' | 'more_like_this' | 'itinerary' | 'clarification_response' | 'group_recommendation' | 'serendipity' | 'experience_chain' | 'constraint_solve' | 'mood_based';
  occasion?: string;
  vibes: string[];
  timeContext?: 'breakfast' | 'lunch' | 'dinner' | 'late_night';
  priceContext?: 'budget' | 'mid_range' | 'splurge';
  socialContext?: 'solo' | 'date' | 'group' | 'business' | 'family';
  referenceDestination?: string;
  itineraryDuration?: 'half_day' | 'full_day' | 'multi_day';
  needsClarification?: boolean;
  clarificationType?: 'city' | 'category' | 'occasion' | 'price';
  // Collaborative trip planning
  groupPreferences?: GroupPreference[];
  // Advanced features
  mood?: MoodContext;
  chainFrom?: string; // "After X, where next?"
  constraints?: ConstraintSet;
  wantsSerendipity?: boolean;
  realTimeContext?: RealTimeContext;
}

// Mood/Emotional context
interface MoodContext {
  energy: 'low' | 'medium' | 'high';
  mood: 'relaxed' | 'adventurous' | 'celebratory' | 'romantic' | 'focused' | 'social' | 'contemplative';
  need?: 'comfort' | 'excitement' | 'peace' | 'connection' | 'inspiration';
}

// Real-time context
interface RealTimeContext {
  timeOfDay: 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'late_night';
  dayOfWeek: 'weekday' | 'weekend';
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  weather?: 'sunny' | 'rainy' | 'cold' | 'hot';
  justArrived?: boolean;
  limitedTime?: number; // minutes available
}

// Complex constraints for group/multi-variable optimization
interface ConstraintSet {
  dietary?: string[]; // vegetarian, vegan, gluten-free, halal, kosher
  accessibility?: boolean;
  budget?: { perPerson: number; currency: string };
  mustHave?: string[]; // outdoor seating, reservations, etc.
  mustAvoid?: string[]; // crowds, tourist traps, etc.
  groupSize?: number;
  languages?: string[];
}

interface GroupPreference {
  person: string; // 'me', 'friend', 'partner', etc.
  cuisines?: string[];
  vibes?: string[];
  priceContext?: 'budget' | 'mid_range' | 'splurge';
}

interface ItinerarySlot {
  timeSlot: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  label: string;
  category: string;
  destination?: any;
}

// Vibe keywords mapping
const VIBE_KEYWORDS: Record<string, string[]> = {
  romantic: ['romantic', 'intimate', 'cozy', 'date night', 'anniversary', 'special occasion'],
  trendy: ['trendy', 'hip', 'cool', 'instagram', 'hot spot', 'buzzy', 'scene'],
  hidden_gem: ['hidden gem', 'local', 'secret', 'off the beaten path', 'authentic', 'undiscovered'],
  upscale: ['upscale', 'fancy', 'luxury', 'fine dining', 'elegant', 'high-end', 'splurge'],
  casual: ['casual', 'relaxed', 'laid back', 'chill', 'easy going'],
  lively: ['lively', 'energetic', 'fun', 'vibrant', 'bustling'],
  quiet: ['quiet', 'peaceful', 'serene', 'calm', 'tranquil'],
  design: ['design', 'architecture', 'beautiful space', 'aesthetic', 'minimalist', 'interior'],
};

// Occasion keywords
const OCCASION_KEYWORDS: Record<string, string[]> = {
  anniversary: ['anniversary', 'celebration', 'special occasion', 'milestone'],
  birthday: ['birthday', 'celebration'],
  business: ['business', 'client', 'meeting', 'work', 'professional'],
  date: ['date', 'romantic', 'date night', 'first date'],
  family: ['family', 'kids', 'children', 'parents'],
  friends: ['friends', 'group', 'catch up', 'reunion'],
};

// City name variations
const CITY_VARIATIONS: Record<string, string[]> = {
  'tokyo': ['tokyo', 'tōkyō', 'shibuya', 'shinjuku', 'ginza', 'roppongi', 'harajuku', 'ebisu', 'nakameguro', 'aoyama', 'daikanyama'],
  'kyoto': ['kyoto', 'kyōto', 'gion', 'arashiyama', 'higashiyama'],
  'new york': ['new york', 'nyc', 'manhattan', 'brooklyn', 'soho', 'tribeca', 'williamsburg', 'greenwich village', 'east village', 'west village', 'lower east side', 'upper east side', 'upper west side', 'chelsea', 'flatiron', 'nolita', 'noho'],
  'london': ['london', 'soho', 'shoreditch', 'mayfair', 'notting hill', 'covent garden', 'chelsea', 'kensington', 'fitzrovia', 'marylebone', 'hackney', 'brixton'],
  'paris': ['paris', 'le marais', 'montmartre', 'saint-germain', 'bastille', 'belleville', 'pigalle', 'opera', 'chatelet'],
  'taipei': ['taipei', 'da\'an', 'xinyi', 'zhongshan', 'songshan', 'wanhua', 'shilin', 'beitou'],
  'los angeles': ['los angeles', 'la', 'silver lake', 'echo park', 'west hollywood', 'venice', 'santa monica', 'downtown la', 'dtla', 'highland park', 'los feliz', 'koreatown', 'beverly hills', 'culver city'],
  'hong kong': ['hong kong', 'hk', 'central', 'wan chai', 'causeway bay', 'tsim sha tsui', 'mong kok', 'sheung wan'],
  'singapore': ['singapore', 'orchard', 'marina bay', 'chinatown', 'little india', 'tiong bahru', 'kampong glam', 'dempsey'],
  'bangkok': ['bangkok', 'sukhumvit', 'silom', 'sathorn', 'thonglor', 'ekkamai', 'ari', 'chinatown'],
};

// Category variations
const CATEGORY_VARIATIONS: Record<string, string[]> = {
  'restaurant': ['restaurant', 'restaurants', 'food', 'dining', 'eat', 'eating', 'dinner', 'lunch', 'breakfast', 'brunch', 'cuisine', 'kitchen'],
  'hotel': ['hotel', 'hotels', 'stay', 'accommodation', 'lodging', 'sleep', 'boutique hotel', 'ryokan'],
  'bar': ['bar', 'bars', 'drinks', 'cocktails', 'cocktail bar', 'wine bar', 'speakeasy', 'nightlife', 'drinking'],
  'cafe': ['cafe', 'cafes', 'coffee', 'coffee shop', 'coffeehouse', 'espresso', 'specialty coffee'],
  'shop': ['shop', 'shopping', 'store', 'retail', 'boutique', 'buy'],
};

// Cuisine keywords for collaborative recommendations
const CUISINE_KEYWORDS: Record<string, string[]> = {
  'japanese': ['japanese', 'sushi', 'ramen', 'izakaya', 'omakase', 'kaiseki', 'tempura', 'udon', 'soba', 'yakitori', 'wagyu'],
  'italian': ['italian', 'pasta', 'pizza', 'trattoria', 'osteria', 'risotto', 'gelato'],
  'french': ['french', 'bistro', 'brasserie', 'patisserie', 'croissant', 'crepes'],
  'chinese': ['chinese', 'dim sum', 'cantonese', 'szechuan', 'dumpling', 'peking'],
  'korean': ['korean', 'bbq', 'bibimbap', 'kimchi', 'kbbq'],
  'thai': ['thai', 'pad thai', 'curry', 'som tam'],
  'mexican': ['mexican', 'tacos', 'taqueria', 'mezcal', 'margarita'],
  'indian': ['indian', 'curry', 'tandoori', 'naan', 'biryani'],
  'mediterranean': ['mediterranean', 'greek', 'hummus', 'falafel', 'mezze'],
  'american': ['american', 'burger', 'bbq', 'steakhouse', 'diner'],
  'seafood': ['seafood', 'fish', 'oyster', 'lobster', 'crab', 'sashimi'],
  'vegetarian': ['vegetarian', 'vegan', 'plant-based', 'veggie'],
  'fusion': ['fusion', 'modern', 'contemporary', 'innovative'],
};

// Mood/Emotional keywords for understanding user state
const MOOD_KEYWORDS: Record<string, { energy: MoodContext['energy']; mood: MoodContext['mood']; need?: MoodContext['need'] }> = {
  // Low energy states
  'exhausted': { energy: 'low', mood: 'relaxed', need: 'comfort' },
  'tired': { energy: 'low', mood: 'relaxed', need: 'comfort' },
  'jet-lagged': { energy: 'low', mood: 'relaxed', need: 'comfort' },
  'overwhelmed': { energy: 'low', mood: 'contemplative', need: 'peace' },
  'stressed': { energy: 'low', mood: 'relaxed', need: 'peace' },
  'need a break': { energy: 'low', mood: 'relaxed', need: 'peace' },
  'hungover': { energy: 'low', mood: 'relaxed', need: 'comfort' },
  // Medium energy states
  'relaxed': { energy: 'medium', mood: 'relaxed' },
  'curious': { energy: 'medium', mood: 'adventurous', need: 'inspiration' },
  'thoughtful': { energy: 'medium', mood: 'contemplative', need: 'inspiration' },
  'romantic': { energy: 'medium', mood: 'romantic', need: 'connection' },
  'nostalgic': { energy: 'medium', mood: 'contemplative', need: 'comfort' },
  // High energy states
  'excited': { energy: 'high', mood: 'adventurous', need: 'excitement' },
  'celebrating': { energy: 'high', mood: 'celebratory', need: 'excitement' },
  'adventurous': { energy: 'high', mood: 'adventurous', need: 'excitement' },
  'energized': { energy: 'high', mood: 'social', need: 'excitement' },
  'party': { energy: 'high', mood: 'social', need: 'excitement' },
  'big win': { energy: 'high', mood: 'celebratory', need: 'excitement' },
};

// Serendipity triggers - words that indicate user wants to be surprised
const SERENDIPITY_TRIGGERS = [
  'surprise me', 'something different', 'something new', 'never tried',
  'take me somewhere', 'you pick', 'your choice', 'dealer\'s choice',
  'off the beaten path', 'unexpected', 'random', 'adventure',
  'push my boundaries', 'outside my comfort zone', 'wild card',
  'what would you recommend', 'trust you', 'your favorite',
];

// Experience chaining patterns
const CHAIN_PATTERNS = [
  /after\s+(?:visiting|eating at|drinks at|dinner at|lunch at)?\s*(.+?)(?:,|\s+where|\s+what)/i,
  /(?:just (?:left|finished|had)|coming from)\s+(.+?)(?:,|\s+where|\s+what|\s+now)/i,
  /post[- ](.+?)\s+(?:drinks|food|activity|spot)/i,
  /following\s+(?:up on|my visit to)?\s*(.+)/i,
  /what (?:goes well|pairs) with\s+(.+)/i,
  /after\s+(.+?)\s*$/i,
];

// Constraint keywords
const DIETARY_KEYWORDS: Record<string, string[]> = {
  'vegetarian': ['vegetarian', 'veggie', 'no meat'],
  'vegan': ['vegan', 'plant-based', 'plant based', 'no animal'],
  'gluten-free': ['gluten-free', 'gluten free', 'celiac', 'no gluten'],
  'halal': ['halal'],
  'kosher': ['kosher'],
  'dairy-free': ['dairy-free', 'dairy free', 'lactose', 'no dairy'],
  'nut-free': ['nut-free', 'nut allergy', 'no nuts'],
};

const CONSTRAINT_KEYWORDS: Record<string, string[]> = {
  'outdoor': ['outdoor', 'outside', 'terrace', 'patio', 'garden', 'rooftop', 'al fresco'],
  'reservations': ['reservations', 'book ahead', 'need to book', 'hard to get'],
  'walk-in': ['walk-in', 'no reservation', 'no reservations needed', 'just show up'],
  'accessible': ['accessible', 'wheelchair', 'mobility', 'accessible entrance'],
  'kid-friendly': ['kid-friendly', 'kids', 'children', 'family-friendly', 'child'],
  'pet-friendly': ['pet-friendly', 'dog-friendly', 'dogs allowed', 'pets'],
  'late-night': ['late night', 'open late', 'after midnight', '24 hour', 'all night'],
  'early-morning': ['early morning', 'opens early', 'breakfast', 'before work'],
};

// Anti-patterns for serendipity - things users typically choose
const ANTI_PATTERN_CATEGORIES: Record<string, string[]> = {
  'always_picks_japanese': ['japanese', 'sushi', 'ramen', 'izakaya'],
  'always_picks_italian': ['italian', 'pasta', 'pizza'],
  'always_picks_upscale': ['fine dining', 'michelin', 'upscale', 'fancy'],
  'always_picks_casual': ['casual', 'laid back', 'chill'],
};

/**
 * Check if query needs clarification
 */
function checkNeedsClarification(
  query: string,
  intent: ParsedIntent,
  conversationHistory: ConversationMessage[]
): { needsClarification: boolean; clarificationType?: string; clarificationQuestion?: string } {
  const lowerQuery = query.toLowerCase();

  // If it's a response to a clarification question, don't ask again
  if (conversationHistory.length > 0) {
    const lastAssistant = [...conversationHistory].reverse().find(m => m.role === 'assistant');
    if (lastAssistant?.content.includes('Which city') || lastAssistant?.content.includes('What kind of')) {
      return { needsClarification: false };
    }
  }

  // Check for ambiguous queries that need city
  const needsCityPatterns = [
    /^(?:best|good|nice|great)\s+(?:restaurants?|hotels?|bars?|cafes?|coffee)/i,
    /^(?:where|what)\s+(?:should|can|to)\s+(?:i|we)\s+(?:eat|stay|go|visit)/i,
    /^(?:recommend|suggest)\s+(?:a|some|me)/i,
  ];

  const hasCity = !!intent.filters.city;
  const hasCategory = !!intent.filters.category;

  // If query matches a pattern but has no city
  if (!hasCity && needsCityPatterns.some(p => p.test(lowerQuery))) {
    // Check if city was mentioned in recent conversation
    const recentCityMention = conversationHistory.slice(-4).some(m => {
      const content = m.content.toLowerCase();
      return Object.values(CITY_VARIATIONS).flat().some(v => content.includes(v));
    });

    if (!recentCityMention) {
      return {
        needsClarification: true,
        clarificationType: 'city',
        clarificationQuestion: `Which city are you looking for ${hasCategory ? intent.filters.category + 's' : 'places'} in? I cover Tokyo, Kyoto, New York, London, Paris, Taipei, and more.`,
      };
    }
  }

  // Generic query without any context
  if (!hasCity && !hasCategory && lowerQuery.length < 20 && !intent.vibes.length) {
    const genericPatterns = [/^show me/i, /^find me/i, /^i want/i, /^looking for/i];
    if (genericPatterns.some(p => p.test(lowerQuery))) {
      return {
        needsClarification: true,
        clarificationType: 'category',
        clarificationQuestion: `What are you looking for? I can help you find restaurants, hotels, cafes, bars, or shops.`,
      };
    }
  }

  return { needsClarification: false };
}

/**
 * Parse natural language query to extract intent, filters, and context
 */
function parseQueryIntent(
  query: string,
  conversationHistory: ConversationMessage[] = []
): ParsedIntent {
  const lowerQuery = query.toLowerCase();
  const result: ParsedIntent = {
    searchQuery: query,
    filters: {},
    intent: 'search',
    vibes: [],
  };

  // Check for group/collaborative preferences
  // Patterns like "my friend likes X, I like Y" or "one wants Italian, another wants Japanese"
  const groupPatterns = [
    /(?:my\s+)?(?:friend|partner|wife|husband|colleague|group)\s+(?:likes?|wants?|prefers?)\s+(\w+).*?(?:i|we|and\s+i)\s+(?:like|want|prefer)\s+(\w+)/i,
    /(?:one\s+(?:of\s+us|person)?)\s+(?:likes?|wants?)\s+(\w+).*?(?:another|the\s+other|someone\s+else)\s+(?:likes?|wants?)\s+(\w+)/i,
    /(\w+)\s+for\s+(?:my\s+)?(?:friend|partner|wife|husband).*?(\w+)\s+for\s+me/i,
    /(?:we|us)\s+(?:both|all)\s+(?:like|want)\s+(?:different|mixed).*?(\w+)\s+and\s+(\w+)/i,
  ];

  for (const pattern of groupPatterns) {
    const match = query.match(pattern);
    if (match) {
      result.intent = 'group_recommendation';
      result.groupPreferences = [];

      // Extract cuisines from the match groups
      const preference1 = match[1].toLowerCase();
      const preference2 = match[2].toLowerCase();

      // Find cuisine matches
      const findCuisine = (term: string): string | null => {
        for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS)) {
          if (keywords.some(k => k.includes(term) || term.includes(k))) {
            return cuisine;
          }
        }
        // Also check if the term itself is a cuisine name
        if (CUISINE_KEYWORDS[term]) return term;
        return null;
      };

      const cuisine1 = findCuisine(preference1);
      const cuisine2 = findCuisine(preference2);

      if (cuisine1) {
        result.groupPreferences.push({
          person: 'friend',
          cuisines: [cuisine1],
        });
      }
      if (cuisine2) {
        result.groupPreferences.push({
          person: 'me',
          cuisines: [cuisine2],
        });
      }

      // Default to restaurant category for group dining
      result.filters.category = 'restaurant';
      break;
    }
  }

  // Check for itinerary/day planning intent
  const itineraryPatterns = [
    /plan\s+(?:my|a|the)\s+(?:day|trip|itinerary)/i,
    /(?:day|full day|half day)\s+(?:in|at|around)/i,
    /what\s+(?:should|can)\s+(?:i|we)\s+do\s+(?:in|for)\s+a\s+day/i,
    /(?:perfect|ideal)\s+day\s+in/i,
    /how\s+(?:should|to)\s+spend\s+(?:a|my|the)\s+day/i,
  ];

  if (itineraryPatterns.some(p => p.test(lowerQuery)) && result.intent !== 'group_recommendation') {
    result.intent = 'itinerary';
    if (/half\s*day/i.test(lowerQuery)) {
      result.itineraryDuration = 'half_day';
    } else if (/multi|several|few\s*days?/i.test(lowerQuery)) {
      result.itineraryDuration = 'multi_day';
    } else {
      result.itineraryDuration = 'full_day';
    }
  }

  // Check for "more like X" pattern
  const moreLikePattern = /(?:more like|similar to|like)\s+(.+?)(?:\s+in\s+|\s*$)/i;
  const moreLikeMatch = query.match(moreLikePattern);
  if (moreLikeMatch && result.intent !== 'itinerary') {
    result.intent = 'more_like_this';
    result.referenceDestination = moreLikeMatch[1].trim();
  }

  // Extract city from query
  for (const [city, variations] of Object.entries(CITY_VARIATIONS)) {
    for (const variation of variations) {
      const cityPattern = new RegExp(`\\b${variation}\\b`, 'i');
      if (cityPattern.test(lowerQuery)) {
        result.filters.city = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        break;
      }
    }
    if (result.filters.city) break;
  }

  // Check conversation history for city context
  if (!result.filters.city && conversationHistory.length > 0) {
    for (const msg of [...conversationHistory].reverse()) {
      for (const [city, variations] of Object.entries(CITY_VARIATIONS)) {
        for (const variation of variations) {
          if (msg.content.toLowerCase().includes(variation)) {
            result.filters.city = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            break;
          }
        }
        if (result.filters.city) break;
      }
      if (result.filters.city) break;
    }
  }

  // Extract category
  for (const [category, variations] of Object.entries(CATEGORY_VARIATIONS)) {
    for (const variation of variations) {
      const catPattern = new RegExp(`\\b${variation}\\b`, 'i');
      if (catPattern.test(lowerQuery)) {
        result.filters.category = category;
        break;
      }
    }
    if (result.filters.category) break;
  }

  // Extract vibes
  for (const [vibe, keywords] of Object.entries(VIBE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        result.vibes.push(vibe);
        break;
      }
    }
  }

  // Extract occasion
  for (const [occasion, keywords] of Object.entries(OCCASION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        result.occasion = occasion;
        result.filters.occasion = occasion;
        break;
      }
    }
    if (result.occasion) break;
  }

  // Extract price context
  if (/\b(cheap|budget|affordable|inexpensive|value)\b/i.test(lowerQuery)) {
    result.priceContext = 'budget';
    result.filters.priceMax = 2;
  } else if (/\b(mid-range|moderate|reasonable)\b/i.test(lowerQuery)) {
    result.priceContext = 'mid_range';
    result.filters.priceMin = 2;
    result.filters.priceMax = 3;
  } else if (/\b(expensive|splurge|fancy|luxury|high-end|upscale|fine dining)\b/i.test(lowerQuery)) {
    result.priceContext = 'splurge';
    result.filters.priceMin = 3;
  }

  // Extract time context
  if (/\b(breakfast|morning)\b/i.test(lowerQuery)) {
    result.timeContext = 'breakfast';
  } else if (/\b(lunch|midday)\b/i.test(lowerQuery)) {
    result.timeContext = 'lunch';
  } else if (/\b(dinner|evening)\b/i.test(lowerQuery)) {
    result.timeContext = 'dinner';
  } else if (/\b(late night|after hours|night)\b/i.test(lowerQuery)) {
    result.timeContext = 'late_night';
  }

  // Extract social context
  if (/\b(solo|alone|by myself)\b/i.test(lowerQuery)) {
    result.socialContext = 'solo';
  } else if (/\b(date|romantic|anniversary|couples?)\b/i.test(lowerQuery)) {
    result.socialContext = 'date';
  } else if (/\b(group|friends|party)\b/i.test(lowerQuery)) {
    result.socialContext = 'group';
  } else if (/\b(business|client|meeting|corporate)\b/i.test(lowerQuery)) {
    result.socialContext = 'business';
  } else if (/\b(family|kids|children)\b/i.test(lowerQuery)) {
    result.socialContext = 'family';
  }

  // Check for Michelin
  if (/\b(michelin|starred|stars?)\b/i.test(lowerQuery)) {
    result.filters.michelin = true;
  }

  // Check for "open now"
  if (/\b(open now|open right now|currently open)\b/i.test(lowerQuery)) {
    result.filters.openNow = true;
  }

  // Determine intent (if not already set)
  if (result.intent === 'search') {
    if (/\b(recommend|suggestion|what should|where should)\b/i.test(lowerQuery)) {
      result.intent = 'recommendation';
    } else if (/\b(discover|explore|surprise|hidden|secret)\b/i.test(lowerQuery)) {
      result.intent = 'discovery';
    } else if (/\b(compare|vs|versus|better|difference)\b/i.test(lowerQuery)) {
      result.intent = 'comparison';
    }
  }

  // === ADVANCED FEATURES ===

  // 1. Mood/Emotional Understanding
  for (const [keyword, moodData] of Object.entries(MOOD_KEYWORDS)) {
    if (lowerQuery.includes(keyword)) {
      result.mood = moodData;
      result.intent = 'mood_based';

      // Map mood to appropriate vibes
      if (moodData.mood === 'relaxed') {
        result.vibes.push('quiet', 'casual');
      } else if (moodData.mood === 'celebratory') {
        result.vibes.push('lively', 'upscale');
      } else if (moodData.mood === 'romantic') {
        result.vibes.push('romantic', 'quiet');
      } else if (moodData.mood === 'adventurous') {
        result.vibes.push('trendy', 'hidden_gem');
      }
      break;
    }
  }

  // 2. Serendipity Mode - "Surprise me"
  if (SERENDIPITY_TRIGGERS.some(trigger => lowerQuery.includes(trigger))) {
    result.intent = 'serendipity';
    result.wantsSerendipity = true;
  }

  // 3. Experience Chaining - "After dinner at X, where for drinks?"
  for (const pattern of CHAIN_PATTERNS) {
    const chainMatch = query.match(pattern);
    if (chainMatch) {
      result.intent = 'experience_chain';
      result.chainFrom = chainMatch[1].trim();

      // Try to detect what they want next
      if (/drink|bar|cocktail/i.test(lowerQuery)) {
        result.filters.category = 'bar';
      } else if (/coffee|cafe/i.test(lowerQuery)) {
        result.filters.category = 'cafe';
      } else if (/dessert|sweet/i.test(lowerQuery)) {
        result.filters.category = 'cafe';
      } else if (/walk|stroll|explore/i.test(lowerQuery)) {
        result.filters.category = 'shop';
      }
      break;
    }
  }

  // 4. Complex Constraint Detection
  const constraints: ConstraintSet = {};

  // Dietary constraints
  for (const [diet, keywords] of Object.entries(DIETARY_KEYWORDS)) {
    if (keywords.some(k => lowerQuery.includes(k))) {
      constraints.dietary = constraints.dietary || [];
      constraints.dietary.push(diet);
    }
  }

  // Facility/feature constraints
  for (const [constraint, keywords] of Object.entries(CONSTRAINT_KEYWORDS)) {
    if (keywords.some(k => lowerQuery.includes(k))) {
      constraints.mustHave = constraints.mustHave || [];
      constraints.mustHave.push(constraint);
    }
  }

  // Anti-constraints (things to avoid)
  const avoidPatterns = [
    /avoid\s+(.+?)(?:\.|,|$)/i,
    /no\s+(.+?)(?:\.|,|$)/i,
    /don't want\s+(.+?)(?:\.|,|$)/i,
    /not\s+(?:too\s+)?(.+?)(?:\.|,|$)/i,
  ];
  for (const pattern of avoidPatterns) {
    const avoidMatch = query.match(pattern);
    if (avoidMatch) {
      const avoidTerm = avoidMatch[1].toLowerCase().trim();
      if (avoidTerm.includes('crowd') || avoidTerm.includes('busy') || avoidTerm.includes('tourist')) {
        constraints.mustAvoid = constraints.mustAvoid || [];
        constraints.mustAvoid.push('crowded', 'touristy');
      }
      if (avoidTerm.includes('expensive') || avoidTerm.includes('pricey')) {
        result.priceContext = 'budget';
      }
    }
  }

  // Group size detection
  const groupSizeMatch = query.match(/(\d+)\s*(?:people|persons|of us|guests|pax)/i);
  if (groupSizeMatch) {
    constraints.groupSize = parseInt(groupSizeMatch[1], 10);
  }

  // Budget detection
  const budgetMatch = query.match(/\$(\d+)\s*(?:per person|pp|each|\/person)?/i);
  if (budgetMatch) {
    constraints.budget = {
      perPerson: parseInt(budgetMatch[1], 10),
      currency: 'USD',
    };
  }

  // If we found constraints, set intent and attach them
  if (Object.keys(constraints).length > 0) {
    if (constraints.dietary && constraints.dietary.length > 0 || constraints.groupSize || constraints.budget) {
      result.intent = 'constraint_solve';
    }
    result.constraints = constraints;
  }

  // 5. Real-Time Context Detection
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  result.realTimeContext = {
    timeOfDay: hour < 6 ? 'late_night' :
               hour < 10 ? 'early_morning' :
               hour < 12 ? 'morning' :
               hour < 14 ? 'midday' :
               hour < 17 ? 'afternoon' :
               hour < 21 ? 'evening' : 'late_night',
    dayOfWeek: dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday',
  };

  // Detect time-related queries
  if (/just (?:landed|arrived)|at the airport|after (?:my |the )?flight/i.test(lowerQuery)) {
    result.realTimeContext.justArrived = true;
  }

  // Detect limited time
  const timeMatch = query.match(/(\d+)\s*(?:hours?|hrs?|minutes?|mins?)\s*(?:to kill|free|between|before)/i);
  if (timeMatch) {
    const amount = parseInt(timeMatch[1], 10);
    const isMinutes = /min/i.test(timeMatch[0]);
    result.realTimeContext.limitedTime = isMinutes ? amount : amount * 60;
  }

  // Season detection (basic - could be enhanced with actual date/location)
  const month = now.getMonth();
  result.realTimeContext.season = month >= 2 && month <= 4 ? 'spring' :
                                   month >= 5 && month <= 7 ? 'summer' :
                                   month >= 8 && month <= 10 ? 'fall' : 'winter';

  // Weather mentions
  if (/rain|rainy|raining|wet/i.test(lowerQuery)) {
    result.realTimeContext.weather = 'rainy';
  } else if (/hot|heat|humid/i.test(lowerQuery)) {
    result.realTimeContext.weather = 'hot';
  } else if (/cold|freezing|chilly/i.test(lowerQuery)) {
    result.realTimeContext.weather = 'cold';
  }

  return result;
}

/**
 * Build a rich search text for embedding
 */
function buildSemanticSearchText(intent: ParsedIntent): string {
  const parts: string[] = [intent.searchQuery];

  if (intent.vibes.length > 0) {
    parts.push(`vibe: ${intent.vibes.join(', ')}`);
  }

  if (intent.occasion) {
    parts.push(`occasion: ${intent.occasion}`);
  }

  if (intent.socialContext) {
    parts.push(`for: ${intent.socialContext}`);
  }

  if (intent.priceContext) {
    parts.push(`price: ${intent.priceContext}`);
  }

  return parts.join(' | ');
}

/**
 * Generate LLM-powered conversational response
 */
async function generateLLMResponse(
  intent: ParsedIntent,
  results: any[],
  query: string,
  conversationHistory: ConversationMessage[],
  tasteProfile: any | null
): Promise<string> {
  const count = results.length;
  const city = intent.filters.city;
  const category = intent.filters.category;

  // Build context for LLM
  const topResults = results.slice(0, 5).map(r => ({
    name: r.name,
    category: r.category,
    city: r.city,
    michelin: r.michelin_stars || 0,
    rating: r.rating,
    vibes: r.vibe_tags?.slice(0, 3) || [],
    price: r.price_level,
  }));

  const userPreferences = tasteProfile ? {
    favoriteCategories: tasteProfile.preferences?.categories?.slice(0, 3).map((c: any) => c.category) || [],
    favoriteCities: tasteProfile.preferences?.cities?.slice(0, 3).map((c: any) => c.city) || [],
    pricePreference: tasteProfile.preferences?.priceRange || null,
  } : null;

  const prompt = `You are a knowledgeable travel concierge for Urban Manual, a curated travel guide.
Generate a brief, helpful response (2-3 sentences max) for this search.

User query: "${query}"
Intent: ${intent.intent}
City: ${city || 'not specified'}
Category: ${category || 'not specified'}
Vibes: ${intent.vibes.join(', ') || 'none'}
Occasion: ${intent.occasion || 'not specified'}
Results found: ${count}
${userPreferences ? `User preferences: Likes ${userPreferences.favoriteCategories.join(', ')} in ${userPreferences.favoriteCities.join(', ')}` : ''}

Top results:
${topResults.map((r, i) => `${i + 1}. ${r.name} (${r.category} in ${r.city}${r.michelin ? `, ${r.michelin}⭐` : ''})`).join('\n')}

Guidelines:
- Be concise and warm, not robotic
- If there are Michelin stars, mention them naturally
- Reference the specific vibe/occasion if mentioned
- Don't list all results, just give a helpful intro
- If no results, suggest alternatives`;

  try {
    const llmResponse = await generateText(prompt, { maxTokens: 150, temperature: 0.7 });
    if (llmResponse) {
      return llmResponse;
    }
  } catch (error) {
    console.error('LLM response generation failed:', error);
  }

  // Fallback to rule-based response
  return generateFallbackResponse(intent, results, query);
}

/**
 * Fallback response generator (non-LLM)
 */
function generateFallbackResponse(
  intent: ParsedIntent,
  results: any[],
  query: string
): string {
  const count = results.length;
  const city = intent.filters.city;
  const category = intent.filters.category;

  if (count === 0) {
    if (city && category) {
      return `I couldn't find any ${category}s in ${city} matching your criteria. Try broadening your search.`;
    } else if (city) {
      return `I couldn't find places in ${city} matching your search. Try a different query.`;
    }
    return `No results found. Try searching for a specific city or category.`;
  }

  const vibeText = intent.vibes.length > 0 ? intent.vibes.join(' and ') + ' ' : '';
  const occasionText = intent.occasion ? `for ${intent.occasion} ` : '';

  if (intent.intent === 'itinerary') {
    return `Here's a curated day plan for ${city || 'your trip'}. I've selected the best spots for each part of your day.`;
  } else if (intent.intent === 'more_like_this') {
    return `Found ${count} similar ${category || 'place'}${count > 1 ? 's' : ''} ${city ? `in ${city}` : ''}.`;
  } else if (intent.intent === 'discovery') {
    return `Discovered ${count} ${vibeText}${category || 'place'}${count > 1 ? 's' : ''} ${city ? `in ${city}` : ''}. These are some hidden gems worth exploring.`;
  } else if (intent.intent === 'recommendation') {
    return `Here are ${count} recommended ${vibeText}${category || 'place'}${count > 1 ? 's' : ''} ${occasionText}${city ? `in ${city}` : ''}.`;
  }

  if (city && category) {
    let response = `Found ${count} ${vibeText}${category}${count > 1 ? 's' : ''} in ${city}${occasionText ? ` ${occasionText}` : ''}.`;
    const michelinCount = results.filter(r => r.michelin_stars > 0).length;
    if (michelinCount > 0) {
      response += ` Including ${michelinCount} Michelin-starred.`;
    }
    return response;
  } else if (city) {
    return `Found ${count} ${vibeText}place${count > 1 ? 's' : ''} in ${city}.`;
  } else if (category) {
    return `Found ${count} ${vibeText}${category}${count > 1 ? 's' : ''}.`;
  }

  return `Found ${count} result${count > 1 ? 's' : ''} for "${query}".`;
}

/**
 * Generate itinerary for a day
 */
async function generateItinerary(
  city: string,
  duration: 'half_day' | 'full_day' | 'multi_day',
  vibes: string[],
  occasion: string | undefined,
  supabase: any
): Promise<{ itinerary: ItinerarySlot[]; destinations: any[] }> {
  const slots: ItinerarySlot[] = [];
  const allDestinations: any[] = [];

  // Define time slots based on duration
  const timeSlots: Array<{ slot: ItinerarySlot['timeSlot']; label: string; category: string }> = duration === 'half_day'
    ? [
        { slot: 'morning', label: '☕ Morning', category: 'cafe' },
        { slot: 'lunch', label: '🍽️ Lunch', category: 'restaurant' },
        { slot: 'afternoon', label: '🛍️ Afternoon', category: 'shop' },
      ]
    : [
        { slot: 'morning', label: '☕ Morning Coffee', category: 'cafe' },
        { slot: 'lunch', label: '🍽️ Lunch', category: 'restaurant' },
        { slot: 'afternoon', label: '🛍️ Afternoon Explore', category: 'shop' },
        { slot: 'dinner', label: '🍷 Dinner', category: 'restaurant' },
        { slot: 'evening', label: '🍸 Evening Drinks', category: 'bar' },
      ];

  // Fetch destinations for each slot
  for (const timeSlot of timeSlots) {
    let query = supabase
      .from('destinations')
      .select('*')
      .ilike('city', `%${city}%`)
      .ilike('category', `%${timeSlot.category}%`);

    // Apply vibe filtering if specified
    if (vibes.length > 0) {
      // Boost for matching vibes but don't require
    }

    // For dinner on special occasions, prefer Michelin or highly rated
    if (timeSlot.slot === 'dinner' && occasion) {
      query = query.or('michelin_stars.gt.0,rating.gte.4.5');
    }

    query = query.limit(10);

    const { data: destinations } = await query;

    if (destinations && destinations.length > 0) {
      // Pick a random one from top results for variety
      const selected = destinations[Math.floor(Math.random() * Math.min(3, destinations.length))];

      slots.push({
        timeSlot: timeSlot.slot,
        label: timeSlot.label,
        category: timeSlot.category,
        destination: selected,
      });

      allDestinations.push(selected);
    }
  }

  return { itinerary: slots, destinations: allDestinations };
}

/**
 * Generate intelligent follow-up suggestions
 */
function generateFollowUps(
  intent: ParsedIntent,
  results: any[],
  conversationHistory: ConversationMessage[],
  tasteProfile: any | null
): string[] {
  const suggestions: string[] = [];
  const city = intent.filters.city;
  const category = intent.filters.category;

  // Itinerary-specific follow-ups
  if (intent.intent === 'itinerary') {
    if (city) {
      suggestions.push(`More restaurants in ${city}`);
      suggestions.push(`Hidden gems in ${city}`);
      suggestions.push(`Bars in ${city}`);
    }
    return suggestions.slice(0, 4);
  }

  // Based on current results
  if (results.length > 0) {
    const topResult = results[0];

    // Suggest similar
    if (topResult.name) {
      suggestions.push(`More like ${topResult.name}`);
    }

    // Suggest different category in same city
    if (city) {
      if (category === 'restaurant') {
        suggestions.push(`Best bars in ${city}`);
        suggestions.push(`Coffee in ${city}`);
      } else if (category === 'bar') {
        suggestions.push(`Late night eats in ${city}`);
        suggestions.push(`Restaurants in ${city}`);
      } else if (category === 'cafe') {
        suggestions.push(`Brunch spots in ${city}`);
      } else if (category === 'hotel') {
        suggestions.push(`Restaurants near ${topResult.name || city}`);
      } else {
        suggestions.push(`Restaurants in ${city}`);
        suggestions.push(`Cafes in ${city}`);
      }

      // Suggest itinerary
      suggestions.push(`Plan my day in ${city}`);
    }

    // Suggest vibe-based refinement
    if (intent.vibes.length === 0 && category === 'restaurant') {
      suggestions.push('Show me romantic spots');
      suggestions.push('Hidden gems only');
    }

    // Suggest Michelin if not already filtered
    if (!intent.filters.michelin && results.some(r => r.michelin_stars > 0)) {
      suggestions.push('Only Michelin starred');
    }

    // Personalized suggestions based on taste profile
    if (tasteProfile?.preferences?.categories) {
      const favCategories = tasteProfile.preferences.categories
        .filter((c: any) => c.category !== category)
        .slice(0, 1);

      if (favCategories.length > 0 && city) {
        suggestions.push(`${favCategories[0].category}s in ${city}`);
      }
    }

    // Suggest price refinement
    if (!intent.priceContext) {
      if (results.some(r => r.price_level >= 3)) {
        suggestions.push('More affordable options');
      }
    }
  } else {
    // No results - suggest broader searches
    if (city) {
      suggestions.push(`All restaurants in ${city}`);
      suggestions.push(`Best of ${city}`);
    } else {
      suggestions.push('Restaurants in Tokyo');
      suggestions.push('Hotels in Paris');
      suggestions.push('Plan my day in Tokyo');
    }
  }

  // Add variety based on history
  if (conversationHistory.length > 2) {
    suggestions.push('Show me something different');
  }

  return suggestions.slice(0, 4);
}

/**
 * Update user taste profile based on search
 */
async function updateTasteProfile(
  userId: string,
  intent: ParsedIntent,
  results: any[],
  supabase: any
): Promise<void> {
  try {
    // Log the search interaction for taste learning
    await supabase.from('user_interactions').insert({
      interaction_type: 'search',
      user_id: userId,
      destination_id: null,
      metadata: {
        query: intent.searchQuery,
        intent: intent.intent,
        city: intent.filters.city,
        category: intent.filters.category,
        vibes: intent.vibes,
        occasion: intent.occasion,
        priceContext: intent.priceContext,
        resultsCount: results.length,
        topResultIds: results.slice(0, 5).map(r => r.id),
        source: 'travel-intelligence',
      },
    });

    // If user clicked on specific vibes or occasions, record preference
    if (intent.vibes.length > 0 || intent.occasion) {
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      const currentVibes = existingPrefs?.preferred_vibes || [];
      const currentOccasions = existingPrefs?.preferred_occasions || [];

      const updatedVibes = [...new Set([...currentVibes, ...intent.vibes])];
      const updatedOccasions = intent.occasion
        ? [...new Set([...currentOccasions, intent.occasion])]
        : currentOccasions;

      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferred_vibes: updatedVibes,
          preferred_occasions: updatedOccasions,
          updated_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    // Best effort - don't fail the request
    console.error('Error updating taste profile:', error);
  }
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting
  const identifier = getIdentifier(request);
  const limiter = isUpstashConfigured() ? searchRatelimit : memorySearchRatelimit;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return createRateLimitResponse('Rate limit exceeded. Please try again later.', limit, remaining, reset);
  }

  const body: TravelIntelligenceRequest = await request.json();
  const { query, conversationHistory = [], filters: explicitFilters = {}, limit: resultLimit = 20 } = body;

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  try {
    // 1. Parse query intent
    const intent = parseQueryIntent(query, conversationHistory);

    // Merge explicit filters
    if (explicitFilters.city) intent.filters.city = explicitFilters.city;
    if (explicitFilters.category) intent.filters.category = explicitFilters.category;
    if (explicitFilters.michelin) intent.filters.michelin = explicitFilters.michelin;

    // 2. Check if clarification is needed
    const clarification = checkNeedsClarification(query, intent, conversationHistory);
    if (clarification.needsClarification) {
      return NextResponse.json({
        response: clarification.clarificationQuestion,
        destinations: [],
        filters: intent.filters,
        followUps: Object.keys(CITY_VARIATIONS).slice(0, 4).map(c =>
          c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        ),
        intent: 'clarification',
        needsClarification: true,
        clarificationType: clarification.clarificationType,
        meta: { query },
      });
    }

    // 3. Get user taste profile for personalization
    let tasteProfile = null;
    if (userId) {
      try {
        tasteProfile = await tasteProfileEvolutionService.getTasteProfile(userId);
      } catch (error) {
        console.error('Error fetching taste profile:', error);
      }
    }

    // 4. Handle itinerary mode
    if (intent.intent === 'itinerary' && intent.filters.city) {
      const { itinerary, destinations } = await generateItinerary(
        intent.filters.city,
        intent.itineraryDuration || 'full_day',
        intent.vibes,
        intent.occasion,
        supabase
      );

      const response = await generateLLMResponse(
        intent,
        destinations,
        query,
        conversationHistory,
        tasteProfile
      );

      const followUps = generateFollowUps(intent, destinations, conversationHistory, tasteProfile);

      // Update taste profile
      if (userId) {
        await updateTasteProfile(userId, intent, destinations, supabase);
      }

      return NextResponse.json({
        response,
        destinations,
        itinerary,
        filters: intent.filters,
        followUps,
        intent: intent.intent,
        vibes: intent.vibes,
        meta: {
          query,
          totalResults: destinations.length,
          isItinerary: true,
          duration: intent.itineraryDuration,
        },
      });
    }

    // 5. Handle group/collaborative recommendations
    if (intent.intent === 'group_recommendation' && intent.groupPreferences && intent.groupPreferences.length > 0) {
      // Get all unique cuisines from group preferences
      const allCuisines = intent.groupPreferences.flatMap(p => p.cuisines || []);

      // Build query for fusion/multi-cuisine restaurants or places that satisfy both
      let results: any[] = [];

      // Strategy 1: Find fusion restaurants that combine cuisines
      let dbQuery = supabase
        .from('destinations')
        .select('*')
        .ilike('category', '%restaurant%');

      if (intent.filters.city) {
        dbQuery = dbQuery.ilike('city', `%${intent.filters.city}%`);
      }

      // Search for places mentioning multiple cuisines or fusion
      const cuisineSearchTerms = allCuisines.map(c => `%${c}%`).join('|');
      dbQuery = dbQuery.or(
        allCuisines.map(c => `description.ilike.%${c}%`).join(',') +
        `,tags.cs.{${allCuisines.join(',')}}` +
        `,micro_description.ilike.%fusion%`
      );

      const { data: multiCuisineResults } = await dbQuery.limit(30);
      if (multiCuisineResults) {
        // Score by how many cuisines they match
        results = multiCuisineResults.map(dest => {
          const desc = (dest.description || '').toLowerCase();
          const micro = (dest.micro_description || '').toLowerCase();
          const tags = (dest.tags || []).map((t: string) => t.toLowerCase());

          let matchScore = 0;
          for (const cuisine of allCuisines) {
            const cuisineKeywords = CUISINE_KEYWORDS[cuisine] || [cuisine];
            for (const keyword of cuisineKeywords) {
              if (desc.includes(keyword) || micro.includes(keyword) || tags.some((t: string) => t.includes(keyword))) {
                matchScore++;
                break;
              }
            }
          }

          return {
            ...dest,
            groupMatchScore: matchScore,
          };
        });

        // Sort by match score (places matching more cuisines first)
        results.sort((a, b) => b.groupMatchScore - a.groupMatchScore);
      }

      // Strategy 2: If not enough fusion results, get top from each cuisine
      if (results.length < 5) {
        for (const cuisine of allCuisines) {
          const cuisineKeywords = CUISINE_KEYWORDS[cuisine] || [cuisine];
          const { data: cuisineResults } = await supabase
            .from('destinations')
            .select('*')
            .ilike('category', '%restaurant%')
            .or(cuisineKeywords.slice(0, 3).map(k => `description.ilike.%${k}%`).join(','))
            .limit(5);

          if (cuisineResults) {
            for (const r of cuisineResults) {
              if (!results.find(existing => existing.id === r.id)) {
                results.push({
                  ...r,
                  cuisineType: cuisine,
                  groupMatchScore: 1,
                });
              }
            }
          }
        }
      }

      // Generate personalized response for group
      const cuisineList = allCuisines.join(' and ');
      const fusionCount = results.filter(r => r.groupMatchScore >= 2).length;

      let groupResponse = '';
      if (fusionCount > 0) {
        groupResponse = `Great news for your group! I found ${fusionCount} place${fusionCount > 1 ? 's' : ''} that blend ${cuisineList} cuisines. `;
        if (results.length > fusionCount) {
          groupResponse += `Plus ${results.length - fusionCount} more options for each preference.`;
        }
      } else {
        groupResponse = `I've curated ${results.length} options for your group with ${cuisineList} preferences. You could alternate between cuisines or find a spot with a diverse menu.`;
      }

      const finalResults = results.slice(0, 20);
      const followUps = [
        `More ${allCuisines[0] || 'fusion'} options`,
        `More ${allCuisines[1] || 'restaurants'}`,
        intent.filters.city ? `Other cuisines in ${intent.filters.city}` : 'Plan a food tour',
        'Find a fusion restaurant',
      ];

      return NextResponse.json({
        response: groupResponse,
        destinations: finalResults,
        filters: intent.filters,
        followUps,
        intent: intent.intent,
        groupPreferences: intent.groupPreferences,
        meta: {
          query,
          totalResults: finalResults.length,
          isGroupRecommendation: true,
          cuisines: allCuisines,
        },
      });
    }

    // 6. Handle SERENDIPITY mode - "Surprise me"
    if (intent.intent === 'serendipity' && intent.wantsSerendipity) {
      // Get user's past patterns to intentionally diversify
      let antiPatterns: string[] = [];
      if (tasteProfile?.preferences?.categories) {
        // Find what they usually pick
        const topCategories = tasteProfile.preferences.categories
          .slice(0, 2)
          .map((c: any) => c.category);
        antiPatterns = topCategories;
      }

      // Query for hidden gems and unusual picks, avoiding their usual choices
      let serendipityQuery = supabase
        .from('destinations')
        .select('*')
        .or('vibe_tags.cs.{hidden_gem},vibe_tags.cs.{authentic},rating.gte.4.0');

      if (intent.filters.city) {
        serendipityQuery = serendipityQuery.ilike('city', `%${intent.filters.city}%`);
      }

      // Avoid their usual picks if we know their patterns
      if (antiPatterns.length > 0) {
        // We'll filter in memory to avoid complex NOT queries
      }

      const { data: serendipityResults } = await serendipityQuery.limit(50);

      let surpriseResults = serendipityResults || [];

      // Filter out their usual picks and add randomness
      if (antiPatterns.length > 0 && surpriseResults.length > 10) {
        surpriseResults = surpriseResults.filter(dest => {
          const category = dest.category?.toLowerCase() || '';
          return !antiPatterns.some(p => category.includes(p.toLowerCase()));
        });
      }

      // Shuffle and pick random subset for true serendipity
      surpriseResults = surpriseResults
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);

      const serendipityResponse = surpriseResults.length > 0
        ? `I'm picking something different for you! ${surpriseResults.length} curated surprises that might push your boundaries a bit. Trust me on these.`
        : `Let me surprise you with some unexpected gems${intent.filters.city ? ` in ${intent.filters.city}` : ''}.`;

      const followUps = [
        'More surprises',
        'Something even more adventurous',
        intent.filters.city ? `Hidden gems in ${intent.filters.city}` : 'Show me hidden gems',
        'Back to my usual style',
      ];

      return NextResponse.json({
        response: serendipityResponse,
        destinations: surpriseResults,
        filters: intent.filters,
        followUps,
        intent: 'serendipity',
        meta: {
          query,
          totalResults: surpriseResults.length,
          isSerendipity: true,
          avoidedPatterns: antiPatterns,
        },
      });
    }

    // 7. Handle EXPERIENCE CHAINING - "After X, where next?"
    if (intent.intent === 'experience_chain' && intent.chainFrom) {
      // Find the reference destination
      const { data: fromDest } = await supabase
        .from('destinations')
        .select('*')
        .or(`name.ilike.%${intent.chainFrom}%,slug.ilike.%${intent.chainFrom}%`)
        .limit(1)
        .single();

      let chainResults: any[] = [];
      let chainResponse = '';

      if (fromDest) {
        // Determine what comes next logically
        const fromCategory = fromDest.category?.toLowerCase() || '';
        let nextCategory = intent.filters.category || '';

        // Auto-determine next experience if not specified
        if (!nextCategory) {
          if (fromCategory.includes('restaurant')) {
            nextCategory = 'bar'; // After dinner → drinks
          } else if (fromCategory.includes('cafe')) {
            nextCategory = 'shop'; // After coffee → explore shops
          } else if (fromCategory.includes('bar')) {
            nextCategory = 'restaurant'; // After drinks → late night food
          } else {
            nextCategory = 'cafe'; // Default to cafe
          }
        }

        // Find nearby options in the same neighborhood/city
        let chainQuery = supabase
          .from('destinations')
          .select('*')
          .ilike('city', `%${fromDest.city}%`)
          .ilike('category', `%${nextCategory}%`)
          .neq('id', fromDest.id);

        // Prefer same neighborhood if available
        if (fromDest.neighborhood) {
          // First try same neighborhood, then broader city
        }

        const { data: nearbyResults } = await chainQuery.limit(20);
        chainResults = nearbyResults || [];

        // Sort by proximity (would need lat/lng calculation in production)
        // For now, prefer places with matching vibes
        if (fromDest.vibe_tags && fromDest.vibe_tags.length > 0) {
          chainResults = chainResults.map(dest => {
            const matchingVibes = (dest.vibe_tags || []).filter((v: string) =>
              fromDest.vibe_tags.includes(v)
            ).length;
            return { ...dest, vibeMatch: matchingVibes };
          });
          chainResults.sort((a, b) => (b.vibeMatch || 0) - (a.vibeMatch || 0));
        }

        chainResults = chainResults.slice(0, 10);

        chainResponse = `After ${fromDest.name}, here are ${chainResults.length} perfect ${nextCategory}s nearby. They complement the vibe of your previous stop.`;
      } else {
        chainResponse = `I couldn't find "${intent.chainFrom}" in our curation, but here are some great options for what comes next.`;

        // Fallback: just search for the next category in the city
        if (intent.filters.city && intent.filters.category) {
          const { data: fallbackResults } = await supabase
            .from('destinations')
            .select('*')
            .ilike('city', `%${intent.filters.city}%`)
            .ilike('category', `%${intent.filters.category}%`)
            .limit(10);
          chainResults = fallbackResults || [];
        }
      }

      const followUps = [
        fromDest ? `More like ${fromDest.name}` : 'Show me more options',
        'Then where after this?',
        'Plan my whole evening',
        intent.filters.city ? `Other ${intent.filters.category || 'places'} in ${intent.filters.city}` : 'Back to search',
      ];

      return NextResponse.json({
        response: chainResponse,
        destinations: chainResults,
        filters: intent.filters,
        followUps,
        intent: 'experience_chain',
        chainFrom: fromDest ? { id: fromDest.id, name: fromDest.name, category: fromDest.category } : null,
        meta: {
          query,
          totalResults: chainResults.length,
          isExperienceChain: true,
        },
      });
    }

    // 8. Handle CONSTRAINT SOLVING - Complex multi-variable optimization
    if (intent.intent === 'constraint_solve' && intent.constraints) {
      const constraints = intent.constraints;

      let constraintQuery = supabase.from('destinations').select('*');

      if (intent.filters.city) {
        constraintQuery = constraintQuery.ilike('city', `%${intent.filters.city}%`);
      }
      if (intent.filters.category) {
        constraintQuery = constraintQuery.ilike('category', `%${intent.filters.category}%`);
      }

      const { data: candidates } = await constraintQuery.limit(200);
      let constraintResults = candidates || [];

      // Apply constraints as filters
      constraintResults = constraintResults.filter(dest => {
        let passes = true;
        const desc = (dest.description || '').toLowerCase();
        const tags = (dest.tags || []).map((t: string) => t.toLowerCase());
        const allText = `${desc} ${tags.join(' ')}`;

        // Dietary constraints
        if (constraints.dietary && constraints.dietary.length > 0) {
          const hasDietaryInfo = constraints.dietary.some(diet => {
            const keywords = DIETARY_KEYWORDS[diet] || [diet];
            return keywords.some(k => allText.includes(k));
          });
          // Don't strictly filter, but we'll boost matches
        }

        // Budget constraint
        if (constraints.budget && dest.price_level) {
          const avgPrice = constraints.budget.perPerson;
          // Rough mapping: price_level 1 = $15, 2 = $30, 3 = $60, 4 = $100+
          const priceMap: Record<number, number> = { 1: 15, 2: 30, 3: 60, 4: 100 };
          const estimatedPrice = priceMap[dest.price_level] || 50;
          if (estimatedPrice > avgPrice * 1.5) {
            passes = false; // Too expensive
          }
        }

        // Group size - skip places that are too small for large groups
        if (constraints.groupSize && constraints.groupSize > 6) {
          if (allText.includes('intimate') || allText.includes('tiny') || allText.includes('counter only')) {
            passes = false;
          }
        }

        // Must avoid
        if (constraints.mustAvoid && constraints.mustAvoid.length > 0) {
          for (const avoid of constraints.mustAvoid) {
            if (avoid === 'crowded' && (allText.includes('busy') || allText.includes('crowded') || allText.includes('popular'))) {
              passes = false;
            }
            if (avoid === 'touristy' && (allText.includes('tourist') || allText.includes('famous'))) {
              passes = false;
            }
          }
        }

        return passes;
      });

      // Score remaining results by how well they match constraints
      constraintResults = constraintResults.map(dest => {
        let score = 0;
        const desc = (dest.description || '').toLowerCase();
        const tags = (dest.tags || []).map((t: string) => t.toLowerCase());
        const allText = `${desc} ${tags.join(' ')}`;

        // Dietary match bonus
        if (constraints.dietary) {
          for (const diet of constraints.dietary) {
            const keywords = DIETARY_KEYWORDS[diet] || [diet];
            if (keywords.some(k => allText.includes(k))) {
              score += 2;
            }
          }
        }

        // Must-have match bonus
        if (constraints.mustHave) {
          for (const must of constraints.mustHave) {
            const keywords = CONSTRAINT_KEYWORDS[must] || [must];
            if (keywords.some(k => allText.includes(k))) {
              score += 1;
            }
          }
        }

        // Higher rating bonus
        if (dest.rating && dest.rating >= 4.5) score += 1;

        return { ...dest, constraintScore: score };
      });

      // Sort by constraint match score
      constraintResults.sort((a, b) => (b.constraintScore || 0) - (a.constraintScore || 0));
      constraintResults = constraintResults.slice(0, 15);

      // Build constraint summary for response
      const constraintParts: string[] = [];
      if (constraints.dietary?.length) constraintParts.push(constraints.dietary.join(', '));
      if (constraints.groupSize) constraintParts.push(`${constraints.groupSize} people`);
      if (constraints.budget) constraintParts.push(`$${constraints.budget.perPerson}/person`);
      if (constraints.mustHave?.length) constraintParts.push(constraints.mustHave.join(', '));

      const constraintResponse = constraintResults.length > 0
        ? `Found ${constraintResults.length} places matching your requirements: ${constraintParts.join(', ')}. These all work for your group!`
        : `I couldn't find perfect matches for all your constraints. Try relaxing some requirements?`;

      const followUps = [
        'Relax the budget',
        'Show more options',
        constraints.groupSize ? 'Good for large groups' : 'Good for groups',
        'Book ahead options',
      ];

      return NextResponse.json({
        response: constraintResponse,
        destinations: constraintResults,
        filters: intent.filters,
        followUps,
        intent: 'constraint_solve',
        constraints: intent.constraints,
        meta: {
          query,
          totalResults: constraintResults.length,
          isConstraintSolve: true,
          constraintsApplied: constraintParts,
        },
      });
    }

    // 9. Handle MOOD-BASED recommendations
    if (intent.intent === 'mood_based' && intent.mood) {
      const mood = intent.mood;

      // Map mood to search strategy
      let moodQuery = supabase.from('destinations').select('*');

      if (intent.filters.city) {
        moodQuery = moodQuery.ilike('city', `%${intent.filters.city}%`);
      }

      // Add category filter based on mood
      if (mood.energy === 'low') {
        // Low energy: cafes, quiet restaurants
        if (!intent.filters.category) {
          moodQuery = moodQuery.or('category.ilike.%cafe%,category.ilike.%restaurant%');
        }
      } else if (mood.energy === 'high') {
        // High energy: bars, lively restaurants
        if (!intent.filters.category) {
          moodQuery = moodQuery.or('category.ilike.%bar%,category.ilike.%restaurant%');
        }
      }

      const { data: moodCandidates } = await moodQuery.limit(100);
      let moodResults = moodCandidates || [];

      // Filter and score by mood match
      moodResults = moodResults.map(dest => {
        let moodScore = 0;
        const vibes = dest.vibe_tags || [];
        const desc = (dest.description || '').toLowerCase();

        // Score based on mood needs
        if (mood.need === 'comfort') {
          if (vibes.some((v: string) => v.includes('cozy') || v.includes('comfort'))) moodScore += 2;
          if (desc.includes('comfort') || desc.includes('warm') || desc.includes('homey')) moodScore += 1;
        } else if (mood.need === 'peace') {
          if (vibes.some((v: string) => v.includes('quiet') || v.includes('serene'))) moodScore += 2;
          if (desc.includes('peaceful') || desc.includes('calm') || desc.includes('zen')) moodScore += 1;
        } else if (mood.need === 'excitement') {
          if (vibes.some((v: string) => v.includes('lively') || v.includes('energetic'))) moodScore += 2;
          if (desc.includes('vibrant') || desc.includes('buzzy') || desc.includes('exciting')) moodScore += 1;
        } else if (mood.need === 'connection') {
          if (vibes.some((v: string) => v.includes('romantic') || v.includes('intimate'))) moodScore += 2;
          if (desc.includes('romantic') || desc.includes('intimate') || desc.includes('cozy')) moodScore += 1;
        } else if (mood.need === 'inspiration') {
          if (vibes.some((v: string) => v.includes('design') || v.includes('artistic'))) moodScore += 2;
          if (desc.includes('beautiful') || desc.includes('stunning') || desc.includes('architecture')) moodScore += 1;
        }

        // Energy level matching
        if (mood.energy === 'low' && vibes.some((v: string) => v.includes('quiet') || v.includes('relaxed'))) {
          moodScore += 1;
        } else if (mood.energy === 'high' && vibes.some((v: string) => v.includes('lively') || v.includes('vibrant'))) {
          moodScore += 1;
        }

        return { ...dest, moodScore };
      });

      // Sort by mood score
      moodResults.sort((a, b) => (b.moodScore || 0) - (a.moodScore || 0));
      moodResults = moodResults.slice(0, 15);

      // Generate empathetic response based on mood
      let moodResponse = '';
      if (mood.energy === 'low' && mood.need === 'comfort') {
        moodResponse = `I hear you - sounds like you need some TLC. Here are ${moodResults.length} cozy, comforting spots where you can recharge.`;
      } else if (mood.energy === 'low' && mood.need === 'peace') {
        moodResponse = `When you need calm, these ${moodResults.length} peaceful retreats are perfect for clearing your mind.`;
      } else if (mood.energy === 'high' && mood.need === 'excitement') {
        moodResponse = `Let's channel that energy! Here are ${moodResults.length} vibrant spots for an exciting time.`;
      } else if (mood.mood === 'celebratory') {
        moodResponse = `Time to celebrate! These ${moodResults.length} spots are perfect for marking the occasion.`;
      } else if (mood.mood === 'romantic') {
        moodResponse = `For a romantic time, these ${moodResults.length} intimate spots set the perfect mood.`;
      } else {
        moodResponse = `Based on how you're feeling, here are ${moodResults.length} places that should hit the spot.`;
      }

      const followUps = [
        'Something more upbeat',
        'Something quieter',
        intent.filters.city ? `Best for a ${mood.mood} mood in ${intent.filters.city}` : 'More options',
        'I changed my mind, surprise me',
      ];

      return NextResponse.json({
        response: moodResponse,
        destinations: moodResults,
        filters: intent.filters,
        followUps,
        intent: 'mood_based',
        mood: intent.mood,
        meta: {
          query,
          totalResults: moodResults.length,
          isMoodBased: true,
          detectedMood: mood,
        },
      });
    }

    // 10. Handle "more like this" queries
    if (intent.intent === 'more_like_this' && intent.referenceDestination) {
      const { data: refDest } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, tags, vibe_tags')
        .or(`name.ilike.%${intent.referenceDestination}%,slug.ilike.%${intent.referenceDestination}%`)
        .limit(1)
        .single();

      if (refDest) {
        const similar = await knowledgeGraphService.findSimilar(String(refDest.id), 10);

        if (similar.length > 0) {
          const similarIds = similar.map(s => s.destination_id);
          const { data: similarDests } = await supabase
            .from('destinations')
            .select('*')
            .in('id', similarIds);

          if (similarDests && similarDests.length > 0) {
            const response = await generateLLMResponse(
              intent,
              similarDests,
              query,
              conversationHistory,
              tasteProfile
            );
            const followUps = generateFollowUps(intent, similarDests, conversationHistory, tasteProfile);

            if (userId) {
              await updateTasteProfile(userId, intent, similarDests, supabase);
            }

            return NextResponse.json({
              response,
              destinations: similarDests,
              filters: intent.filters,
              followUps,
              intent: intent.intent,
              meta: { similarTo: refDest.name },
            });
          }
        }

        // Fallback
        intent.filters.city = refDest.city;
        intent.filters.category = refDest.category;
        if (refDest.vibe_tags && refDest.vibe_tags.length > 0) {
          intent.vibes = refDest.vibe_tags;
        }
      }
    }

    // 6. Generate embedding for semantic search
    const searchText = buildSemanticSearchText(intent);
    let embedding: number[] | null = null;

    try {
      const embeddingResult = await generateTextEmbedding(searchText);
      embedding = embeddingResult.embedding;
    } catch (embeddingError) {
      console.error('Embedding generation failed:', embeddingError);
    }

    // 7. Search destinations
    let results: any[] = [];

    // Try database search first (more reliable) and vector search in parallel
    const [dbResults, vectorResults] = await Promise.all([
      // Database search (primary)
      (async () => {
        try {
          let dbQuery = supabase.from('destinations').select('*');

          // Apply filters - use ilike for case-insensitive matching
          if (intent.filters.city) {
            dbQuery = dbQuery.ilike('city', `%${intent.filters.city}%`);
          }
          if (intent.filters.category) {
            dbQuery = dbQuery.ilike('category', `%${intent.filters.category}%`);
          }
          if (intent.filters.michelin) {
            dbQuery = dbQuery.gt('michelin_stars', 0);
          }
          if (intent.filters.priceMax) {
            dbQuery = dbQuery.lte('price_level', intent.filters.priceMax);
          }
          if (intent.filters.priceMin) {
            dbQuery = dbQuery.gte('price_level', intent.filters.priceMin);
          }

          dbQuery = dbQuery.limit(100);

          const { data, error } = await dbQuery;

          if (error) {
            console.error('[Travel Intelligence] Database error:', error);
            return [];
          }

          console.log('[Travel Intelligence] Database found', data?.length || 0, 'results for', intent.filters.city, intent.filters.category);
          return data || [];
        } catch (e) {
          console.error('[Travel Intelligence] Database query failed:', e);
          return [];
        }
      })(),

      // Vector search (secondary, for semantic ranking)
      (async () => {
        if (!embedding) return [];

        try {
          // Query without filters first to get semantic matches
          // Then filter in memory (more reliable than string matching in metadata)
          const vectorHits = await queryVectorIndex(embedding, {
            topK: 100,
            includeMetadata: true,
          });

          if (vectorHits && vectorHits.length > 0) {
            // Filter results by city/category in memory (case-insensitive)
            let filteredHits = vectorHits;

            if (intent.filters.city) {
              const cityLower = intent.filters.city.toLowerCase();
              filteredHits = filteredHits.filter(r =>
                r.metadata.city?.toLowerCase().includes(cityLower)
              );
            }

            if (intent.filters.category) {
              const catLower = intent.filters.category.toLowerCase();
              filteredHits = filteredHits.filter(r =>
                r.metadata.category?.toLowerCase().includes(catLower)
              );
            }

            console.log('[Travel Intelligence] Vector search found', filteredHits.length, 'filtered results');
            return filteredHits;
          }
          return [];
        } catch (vectorError) {
          console.error('[Travel Intelligence] Vector search failed:', vectorError);
          return [];
        }
      })(),
    ]);

    // Merge results: Use database results as base, boost with vector similarity
    if (dbResults.length > 0) {
      const vectorScoreMap = new Map(
        vectorResults.map(v => [v.metadata.destination_id, v.score])
      );

      results = dbResults.map(dest => ({
        ...dest,
        similarity: vectorScoreMap.get(dest.id) || 0,
      }));

      // Sort by similarity if we have vector results
      if (vectorResults.length > 0) {
        results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      }
    } else if (vectorResults.length > 0) {
      // Fallback to vector results only if DB returned nothing
      const ids = vectorResults.map(r => r.metadata.destination_id);
      const { data: fullDests } = await supabase
        .from('destinations')
        .select('*')
        .in('id', ids);

      if (fullDests) {
        results = fullDests.map(dest => {
          const vectorResult = vectorResults.find(r => r.metadata.destination_id === dest.id);
          return {
            ...dest,
            similarity: vectorResult?.score || 0,
          };
        });
      }
    }

    // 8. Apply vibe filtering and boost
    if (intent.vibes.length > 0 && results.length > 0) {
      results = results.map(dest => {
        const destVibes = dest.vibe_tags || [];
        const vibeMatch = intent.vibes.filter(v =>
          destVibes.some((dv: string) => dv.toLowerCase().includes(v))
        ).length;

        return {
          ...dest,
          vibeScore: vibeMatch / intent.vibes.length,
        };
      });

      results.sort((a, b) => (b.vibeScore || 0) - (a.vibeScore || 0));
    }

    // 9. Apply intelligent ranking
    let rankedResults = results;

    try {
      const ranked = await searchRankingAlgorithm.rankResults(
        results,
        query,
        userId,
        {
          city: intent.filters.city || undefined,
          category: intent.filters.category || undefined,
          modifiers: intent.vibes,
        }
      );

      rankedResults = ranked.map(r => ({
        ...r.destination,
        rankScore: r.score,
        rankExplanation: r.explanation,
      }));
    } catch (rankError) {
      console.error('Ranking failed:', rankError);
    }

    // 10. Limit results
    const finalResults = rankedResults.slice(0, resultLimit);

    // 11. Generate LLM-powered response
    const response = await generateLLMResponse(
      intent,
      finalResults,
      query,
      conversationHistory,
      tasteProfile
    );

    // 12. Generate follow-ups
    const followUps = generateFollowUps(intent, finalResults, conversationHistory, tasteProfile);

    // 13. Update taste profile
    if (userId) {
      await updateTasteProfile(userId, intent, finalResults, supabase);
    }

    return NextResponse.json({
      response,
      destinations: finalResults,
      filters: intent.filters,
      followUps,
      intent: intent.intent,
      vibes: intent.vibes,
      meta: {
        query,
        totalResults: finalResults.length,
        hasVectorSearch: !!embedding,
        ranked: true,
        personalized: !!tasteProfile,
      },
    });
  } catch (error: any) {
    console.error('Travel intelligence error:', error);
    return NextResponse.json({
      error: 'Search failed',
      response: 'Sorry, I had trouble with that search. Please try again.',
      destinations: [],
      followUps: ['Restaurants in Tokyo', 'Hotels in Paris', 'Plan my day in Tokyo'],
    }, { status: 500 });
  }
});
