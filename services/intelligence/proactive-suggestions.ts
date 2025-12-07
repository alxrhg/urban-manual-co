/**
 * Proactive Suggestions Engine
 *
 * Generates "you might not have thought of..." suggestions
 * that complement what the user is already looking at.
 *
 * This is where the magic of "outside the box" thinking lives:
 * - Complementary experiences (you're looking at dinner, here's the perfect nightcap)
 * - Cross-category leaps (you love architecture, this restaurant is designed by...)
 * - Time-aware suggestions (you're planning evening, don't miss the golden hour at...)
 * - Neighborhood gems (while you're there, just around the corner...)
 * - Contrast offers (you've been looking at fancy, here's a beloved local spot)
 */

import { generateJSON } from '@/lib/llm';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { creativeIntelligenceService, CreativeIntent } from './creative-intelligence';
import { crossDomainIntelligenceService } from './cross-domain-intelligence';

export type ProactiveSuggestionType =
  | 'complement'       // Pairs well with what they're looking at
  | 'cross_category'   // Different category based on inferred interests
  | 'time_aware'       // Based on time of day/experience timing
  | 'neighborhood'     // Nearby gem they'd miss otherwise
  | 'contrast'         // Opposite of what they're looking at (palate cleanser)
  | 'serendipity'      // Pure delightful discovery
  | 'insider'          // Local secret, industry haunt
  | 'narrative_next'   // What comes next in their story
  | 'hidden_thread';   // Connection they wouldn't see

export interface ProactiveSuggestion {
  destination_id: string;
  slug: string;
  name: string;
  city: string;
  category: string;

  suggestionType: ProactiveSuggestionType;

  // The hook - why we're suggesting this
  hook: string;

  // Fuller explanation
  reason: string;

  // The connection to what they were looking at
  connectionTo: string;

  // How confident we are in this suggestion
  confidence: number;

  // Optional narrative context
  narrative?: string;

  // What makes this proactive (they didn't ask for it)
  proactiveAngle: string;
}

export interface ProactiveContext {
  // What the user is currently looking at or asked about
  currentFocus: {
    destination?: any;
    category?: string;
    city?: string;
    query?: string;
  };

  // User's detected interests/preferences
  userProfile?: {
    interests: string[];
    favoriteCategories: string[];
    favoriteCities: string[];
    travelStyle?: string;
  };

  // Time context
  temporalContext?: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek?: string;
    season?: string;
  };

  // Previous interactions in session
  sessionHistory?: Array<{
    type: 'view' | 'save' | 'search';
    destination?: any;
    query?: string;
  }>;
}

// Complement mappings: what naturally follows what
const COMPLEMENT_MAPPINGS: Record<string, { categories: string[]; suggestions: string[] }> = {
  Restaurant: {
    categories: ['Bar', 'Cafe', 'Hotel'],
    suggestions: ['after-dinner drinks', 'morning-after coffee', 'nearby stay'],
  },
  Bar: {
    categories: ['Restaurant', 'Hotel', 'Cafe'],
    suggestions: ['dinner before', 'late-night eats', 'morning recovery'],
  },
  Hotel: {
    categories: ['Restaurant', 'Bar', 'Cafe'],
    suggestions: ['dinner nearby', 'evening drinks', 'breakfast spot'],
  },
  Cafe: {
    categories: ['Restaurant', 'Shop', 'Museum'],
    suggestions: ['lunch after', 'shopping nearby', 'afternoon culture'],
  },
  Museum: {
    categories: ['Cafe', 'Restaurant', 'Bar'],
    suggestions: ['museum cafe', 'post-culture dining', 'gallery-adjacent drinks'],
  },
};

// Time-based suggestion patterns
const TIME_PATTERNS: Record<string, { idealCategories: string[]; mood: string }> = {
  morning: {
    idealCategories: ['Cafe', 'Restaurant'],
    mood: 'energizing start',
  },
  afternoon: {
    idealCategories: ['Cafe', 'Museum', 'Shop'],
    mood: 'leisurely exploration',
  },
  evening: {
    idealCategories: ['Restaurant', 'Bar', 'Hotel'],
    mood: 'memorable night',
  },
  night: {
    idealCategories: ['Bar', 'Restaurant', 'Hotel'],
    mood: 'late-night discovery',
  },
};

export class ProactiveSuggestionsEngine {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('ProactiveSuggestionsEngine: Supabase client not available');
    }
  }

  /**
   * Generate proactive suggestions based on context
   */
  async generateSuggestions(
    context: ProactiveContext,
    limit: number = 3
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    // 1. Complement suggestions (what pairs with current focus)
    if (context.currentFocus.destination || context.currentFocus.category) {
      const complements = await this.getComplementSuggestions(context);
      suggestions.push(...complements);
    }

    // 2. Cross-category suggestions based on inferred interests
    if (context.userProfile?.interests && context.userProfile.interests.length > 0) {
      const crossCategory = await this.getCrossCategorySuggestions(context);
      suggestions.push(...crossCategory);
    }

    // 3. Time-aware suggestions
    if (context.temporalContext) {
      const timeAware = await this.getTimeAwareSuggestions(context);
      suggestions.push(...timeAware);
    }

    // 4. Neighborhood gems (if we have location context)
    if (context.currentFocus.destination || context.currentFocus.city) {
      const neighborhood = await this.getNeighborhoodSuggestions(context);
      suggestions.push(...neighborhood);
    }

    // 5. Serendipitous suggestions (always include at least one wild card)
    const serendipity = await this.getSerendipitousSuggestion(context);
    if (serendipity) {
      suggestions.push(serendipity);
    }

    // Deduplicate and score
    const unique = this.deduplicateAndScore(suggestions);

    // Return top suggestions
    return unique.slice(0, limit);
  }

  /**
   * Get suggestions that complement what user is looking at
   */
  private async getComplementSuggestions(
    context: ProactiveContext
  ): Promise<ProactiveSuggestion[]> {
    if (!this.supabase) return [];

    const suggestions: ProactiveSuggestion[] = [];
    const currentCategory = context.currentFocus.destination?.category || context.currentFocus.category;
    const city = context.currentFocus.destination?.city || context.currentFocus.city;

    if (!currentCategory || !city) return [];

    const mapping = COMPLEMENT_MAPPINGS[currentCategory];
    if (!mapping) return [];

    try {
      // Get complementary category destinations
      const { data: destinations, error } = await this.supabase
        .from('destinations')
        .select('id, slug, name, city, category, micro_description, tags, rating, crown')
        .ilike('city', `%${city}%`)
        .in('category', mapping.categories)
        .order('rating', { ascending: false })
        .limit(20);

      if (error || !destinations) return [];

      // Score and create suggestions
      for (const dest of destinations.slice(0, 2)) {
        const categoryIndex = mapping.categories.indexOf(dest.category);
        const suggestionText = mapping.suggestions[categoryIndex] || 'perfect complement';

        suggestions.push({
          destination_id: dest.id,
          slug: dest.slug,
          name: dest.name,
          city: dest.city,
          category: dest.category,
          suggestionType: 'complement',
          hook: `For ${suggestionText}`,
          reason: `While you're exploring ${currentCategory.toLowerCase()}s, ${dest.name} is an excellent ${dest.category.toLowerCase()} nearby`,
          connectionTo: currentCategory,
          confidence: 0.75,
          proactiveAngle: `You're looking at ${currentCategory.toLowerCase()}s, but you might want this for ${suggestionText}`,
        });
      }
    } catch (error) {
      console.error('Error getting complement suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Get cross-category suggestions based on user interests
   */
  private async getCrossCategorySuggestions(
    context: ProactiveContext
  ): Promise<ProactiveSuggestion[]> {
    if (!context.userProfile?.interests || context.userProfile.interests.length === 0) {
      return [];
    }

    const city = context.currentFocus.destination?.city || context.currentFocus.city;

    // Use the cross-domain intelligence service
    const crossDomainRecs = await crossDomainIntelligenceService.getCrossDomainRecommendations(
      context.userProfile.interests,
      undefined, // Don't filter by category - we want cross-category
      city,
      3
    );

    return crossDomainRecs.map(rec => ({
      destination_id: rec.destination_id,
      slug: rec.slug,
      name: rec.name,
      city: rec.city,
      category: rec.category,
      suggestionType: 'cross_category' as ProactiveSuggestionType,
      hook: `For ${rec.connection.sourceDomain} lovers`,
      reason: rec.narrative,
      connectionTo: rec.connection.sourceDomain,
      confidence: rec.confidenceScore,
      proactiveAngle: `Because you appreciate ${rec.connection.sourceDomain}, you might love this ${rec.category.toLowerCase()} for unexpected reasons`,
    }));
  }

  /**
   * Get time-aware suggestions
   */
  private async getTimeAwareSuggestions(
    context: ProactiveContext
  ): Promise<ProactiveSuggestion[]> {
    if (!this.supabase || !context.temporalContext) return [];

    const suggestions: ProactiveSuggestion[] = [];
    const timeOfDay = context.temporalContext.timeOfDay;
    const city = context.currentFocus.destination?.city || context.currentFocus.city;

    if (!city) return [];

    const timePattern = TIME_PATTERNS[timeOfDay];
    if (!timePattern) return [];

    try {
      // Get destinations ideal for this time
      const { data: destinations, error } = await this.supabase
        .from('destinations')
        .select('id, slug, name, city, category, micro_description, tags, ambience_tags, experience_tags')
        .ilike('city', `%${city}%`)
        .in('category', timePattern.idealCategories)
        .limit(20);

      if (error || !destinations) return [];

      // Filter for time-appropriate venues
      const timeKeywords: Record<string, string[]> = {
        morning: ['breakfast', 'brunch', 'coffee', 'morning'],
        afternoon: ['lunch', 'tea', 'afternoon'],
        evening: ['dinner', 'cocktails', 'romantic', 'evening'],
        night: ['late night', 'nightlife', 'bar', 'club'],
      };

      const keywords = timeKeywords[timeOfDay] || [];

      for (const dest of destinations) {
        const allTags = [
          ...(dest.tags || []),
          ...(dest.ambience_tags || []),
          ...(dest.experience_tags || []),
        ].map(t => t.toLowerCase());

        const isTimeAppropriate = keywords.some(k => allTags.some(t => t.includes(k)));

        if (isTimeAppropriate && suggestions.length < 2) {
          suggestions.push({
            destination_id: dest.id,
            slug: dest.slug,
            name: dest.name,
            city: dest.city,
            category: dest.category,
            suggestionType: 'time_aware',
            hook: `Perfect for ${timeOfDay}`,
            reason: `${dest.name} excels at this time of day — ideal for ${timePattern.mood}`,
            connectionTo: timeOfDay,
            confidence: 0.7,
            proactiveAngle: `It's ${timeOfDay}, and this is when ${dest.name} really shines`,
          });
        }
      }
    } catch (error) {
      console.error('Error getting time-aware suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Get neighborhood gems near what user is looking at
   */
  private async getNeighborhoodSuggestions(
    context: ProactiveContext
  ): Promise<ProactiveSuggestion[]> {
    if (!this.supabase) return [];

    const suggestions: ProactiveSuggestion[] = [];
    const currentDest = context.currentFocus.destination;
    const city = currentDest?.city || context.currentFocus.city;

    if (!city) return [];

    // If we have coordinates, find nearby hidden gems
    if (currentDest?.latitude && currentDest?.longitude) {
      try {
        // Simple proximity query (within ~1km)
        const latDelta = 0.01; // ~1km
        const lonDelta = 0.01;

        const { data: nearby, error } = await this.supabase
          .from('destinations')
          .select('id, slug, name, city, category, micro_description, tags, crown, rating')
          .gte('latitude', currentDest.latitude - latDelta)
          .lte('latitude', currentDest.latitude + latDelta)
          .gte('longitude', currentDest.longitude - lonDelta)
          .lte('longitude', currentDest.longitude + lonDelta)
          .neq('id', currentDest.id)
          .limit(10);

        if (!error && nearby && nearby.length > 0) {
          // Prefer hidden gems with crown or high rating
          const gem = nearby.find((d: any) => d.crown || d.rating >= 4.5) || nearby[0];

          suggestions.push({
            destination_id: gem.id,
            slug: gem.slug,
            name: gem.name,
            city: gem.city,
            category: gem.category,
            suggestionType: 'neighborhood',
            hook: 'While you\'re in the neighborhood',
            reason: `Just steps from ${currentDest.name}, ${gem.name} is a local favorite worth a detour`,
            connectionTo: currentDest.name,
            confidence: 0.65,
            proactiveAngle: `Most visitors to ${currentDest.name} walk right past this gem`,
          });
        }
      } catch (error) {
        console.error('Error getting neighborhood suggestions:', error);
      }
    }

    return suggestions;
  }

  /**
   * Get a serendipitous suggestion (the wild card)
   */
  private async getSerendipitousSuggestion(
    context: ProactiveContext
  ): Promise<ProactiveSuggestion | null> {
    if (!this.supabase) return null;

    const city = context.currentFocus.destination?.city || context.currentFocus.city;
    if (!city) return null;

    try {
      // Get destinations with "hidden gem" vibes
      const { data: destinations, error } = await this.supabase
        .from('destinations')
        .select('id, slug, name, city, category, micro_description, tags, crown')
        .ilike('city', `%${city}%`)
        .eq('crown', true)  // Editor's picks
        .limit(20);

      if (error || !destinations || destinations.length === 0) return null;

      // Pick a random one for true serendipity
      const randomIndex = Math.floor(Math.random() * Math.min(destinations.length, 10));
      const dest = destinations[randomIndex];

      // Avoid suggesting same category as current focus
      const currentCategory = context.currentFocus.destination?.category;
      if (currentCategory && dest.category === currentCategory) {
        // Try to find a different one
        const different = destinations.find((d: any) => d.category !== currentCategory);
        if (different) {
          return this.createSerendipitySuggestion(different, context);
        }
      }

      return this.createSerendipitySuggestion(dest, context);
    } catch (error) {
      console.error('Error getting serendipitous suggestion:', error);
      return null;
    }
  }

  private createSerendipitySuggestion(dest: any, context: ProactiveContext): ProactiveSuggestion {
    const hooks = [
      'A delightful detour',
      'For the curious traveler',
      'An unexpected discovery',
      'Off the beaten path',
      'A local secret',
    ];
    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];

    return {
      destination_id: dest.id,
      slug: dest.slug,
      name: dest.name,
      city: dest.city,
      category: dest.category,
      suggestionType: 'serendipity',
      hook: randomHook,
      reason: dest.micro_description || `${dest.name} is the kind of place you stumble upon and never forget`,
      connectionTo: 'serendipity',
      confidence: 0.6,
      narrative: `Sometimes the best discoveries are the ones you weren't looking for. ${dest.name} is that kind of place.`,
      proactiveAngle: 'You didn\'t ask for this, but trust us on this one',
    };
  }

  /**
   * Deduplicate suggestions and re-score
   */
  private deduplicateAndScore(suggestions: ProactiveSuggestion[]): ProactiveSuggestion[] {
    const seen = new Set<string>();
    const unique: ProactiveSuggestion[] = [];

    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.destination_id)) {
        seen.add(suggestion.destination_id);
        unique.push(suggestion);
      }
    }

    // Sort by confidence and diversity
    return unique.sort((a, b) => {
      // Prioritize different suggestion types for diversity
      const typeOrder: Record<ProactiveSuggestionType, number> = {
        complement: 1,
        cross_category: 2,
        time_aware: 3,
        neighborhood: 4,
        serendipity: 5,
        insider: 6,
        contrast: 7,
        narrative_next: 8,
        hidden_thread: 9,
      };

      // Mix confidence with type diversity
      const scoreA = a.confidence * 0.7 + (1 / typeOrder[a.suggestionType]) * 0.3;
      const scoreB = b.confidence * 0.7 + (1 / typeOrder[b.suggestionType]) * 0.3;

      return scoreB - scoreA;
    });
  }

  /**
   * Generate AI-enhanced proactive insight
   */
  async generateProactiveInsight(
    suggestion: ProactiveSuggestion,
    context: ProactiveContext
  ): Promise<string> {
    try {
      const system = `You are a creative travel intelligence generating a compelling "you might not have thought of this" insight.
Be conversational, intriguing, and specific. One or two sentences maximum.
Don't be generic - reference the actual qualities of the place and the connection to the user's context.`;

      const prompt = `
Current focus: ${context.currentFocus.destination?.name || context.currentFocus.query || 'exploring'}
Suggestion: ${suggestion.name} (${suggestion.category} in ${suggestion.city})
Connection type: ${suggestion.suggestionType}
Why we're suggesting: ${suggestion.reason}

Generate a compelling one-line insight that makes the user curious:`;

      const result = await generateJSON(system, prompt);

      if (result && result.insight) {
        return result.insight;
      }
    } catch (error) {
      console.error('Error generating proactive insight:', error);
    }

    return suggestion.hook;
  }
}

export const proactiveSuggestionsEngine = new ProactiveSuggestionsEngine();
