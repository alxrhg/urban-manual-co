/**
 * Taste Profile Evolution Service
 * Tracks and learns from user preference changes over time
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

export interface TasteProfile {
  userId: string;
  preferences: {
    categories: Array<{ category: string; weight: number; trend: 'increasing' | 'decreasing' | 'stable' }>;
    cities: Array<{ city: string; weight: number; trend: 'increasing' | 'decreasing' | 'stable' }>;
    priceRange: { min: number; max: number; trend: 'increasing' | 'decreasing' | 'stable' };
    travelStyle: string;
    dietaryPreferences?: string[];
  };
  evolution: Array<{
    timestamp: Date;
    change: string;
    confidence: number;
  }>;
  contextualProfiles: {
    business?: TasteProfile['preferences'];
    leisure?: TasteProfile['preferences'];
    romantic?: TasteProfile['preferences'];
    family?: TasteProfile['preferences'];
  };
  lastUpdated: Date;
}

export class TasteProfileEvolutionService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  /**
   * Get or build taste profile for a user
   */
  async getTasteProfile(userId: string): Promise<TasteProfile | null> {
    if (!this.supabase) return null;

    try {
      // Get user interactions over time
      const interactions = await this.getUserInteractions(userId);

      // Analyze preference evolution
      const preferences = await this.analyzePreferences(interactions);
      const evolution = await this.analyzeEvolution(userId, interactions);
      const contextualProfiles = await this.buildContextualProfiles(userId, interactions);

      return {
        userId,
        preferences,
        evolution,
        contextualProfiles,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error getting taste profile:', error);
      return null;
    }
  }

  /**
   * Update taste profile based on new interactions
   */
  async updateTasteProfile(userId: string, newInteractions: Array<{
    type: 'view' | 'save' | 'visit';
    destinationId: number;
    timestamp: Date;
    context?: string;
  }>): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get current profile
      const currentProfile = await this.getTasteProfile(userId);
      
      // Analyze changes
      const changes = this.detectChanges(currentProfile, newInteractions);

      // Store evolution history
      for (const change of changes) {
        await this.supabase
          .from('user_preferences_evolution')
          .insert({
            user_id: userId,
            change_type: change.type,
            change_description: change.description,
            confidence: change.confidence,
            metadata: change.metadata,
          });
      }
    } catch (error) {
      console.error('Error updating taste profile:', error);
    }
  }

  private async getUserInteractions(userId: string): Promise<Array<{
    type: string;
    destinationId: number;
    timestamp: Date;
    context?: string;
  }>> {
    if (!this.supabase) return [];

    try {
      // Get views, saves, visits
      const { data: interactions } = await this.supabase
        .from('user_interactions')
        .select('interaction_type, destination_id, created_at, context')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const { data: visits } = await this.supabase
        .from('visited_places')
        .select('destination_slug, visited_at')
        .eq('user_id', userId)
        .order('visited_at', { ascending: true });

      // Convert to unified format
      const allInteractions: Array<{
        type: string;
        destinationId: number;
        timestamp: Date;
        context?: string;
      }> = [];

      if (interactions) {
        for (const interaction of interactions) {
          if (interaction.destination_id) {
            allInteractions.push({
              type: interaction.interaction_type,
              destinationId: interaction.destination_id,
              timestamp: new Date(interaction.created_at),
              context: interaction.context ? JSON.stringify(interaction.context) : undefined,
            });
          }
        }
      }

      // Add visits (need to convert slugs to IDs)
      if (visits && visits.length > 0) {
        const slugs = visits.map((v: any) => v.destination_slug);
        const { data: destinations } = await this.supabase
          .from('destinations')
          .select('id, slug')
          .in('slug', slugs);

        const slugToId = new Map(destinations?.map((d: any) => [d.slug, d.id]) || []);

        for (const visit of visits) {
          const destId = slugToId.get(visit.destination_slug);
          if (destId) {
            allInteractions.push({
              type: 'visit',
              destinationId: destId,
              timestamp: new Date(visit.visited_at),
            });
          }
        }
      }

      return allInteractions;
    } catch (error) {
      console.error('Error getting user interactions:', error);
      return [];
    }
  }

  private async analyzePreferences(
    interactions: Array<{ type: string; destinationId: number; timestamp: Date }>
  ): Promise<TasteProfile['preferences']> {
    // Get destination details for interactions
    const destinationIds = [...new Set(interactions.map(i => i.destinationId))];
    
    if (!this.supabase || destinationIds.length === 0) {
      return {
        categories: [],
        cities: [],
        priceRange: { min: 0, max: 4, trend: 'stable' },
        travelStyle: 'unknown',
      };
    }

    try {
      const { data: destinations } = await this.supabase
        .from('destinations')
        .select('id, category, city, price_level')
        .in('id', destinationIds);

      if (!destinations) {
        return {
          categories: [],
          cities: [],
          priceRange: { min: 0, max: 4, trend: 'stable' },
          travelStyle: 'unknown',
        };
      }

      // Count preferences
      const categoryCounts: Map<string, number> = new Map();
      const cityCounts: Map<string, number> = new Map();
      const priceLevels: number[] = [];

      for (const interaction of interactions) {
        const dest = destinations.find((d: any) => d.id === interaction.destinationId);
        if (!dest) continue;

        if (dest.category) {
          categoryCounts.set(dest.category, (categoryCounts.get(dest.category) || 0) + 1);
        }
        if (dest.city) {
          cityCounts.set(dest.city, (cityCounts.get(dest.city) || 0) + 1);
        }
        if (dest.price_level) {
          priceLevels.push(dest.price_level);
        }
      }

      // Calculate weights (normalized)
      const totalInteractions = interactions.length;
      const categories = Array.from(categoryCounts.entries())
        .map(([category, count]) => ({
          category,
          weight: count / totalInteractions,
          trend: 'stable' as const,
        }))
        .sort((a, b) => b.weight - a.weight);

      const cities = Array.from(cityCounts.entries())
        .map(([city, count]) => ({
          city,
          weight: count / totalInteractions,
          trend: 'stable' as const,
        }))
        .sort((a, b) => b.weight - a.weight);

      const avgPrice = priceLevels.length > 0
        ? priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length
        : 2;

      return {
        categories,
        cities,
        priceRange: {
          min: Math.max(0, Math.floor(avgPrice - 1)),
          max: Math.min(4, Math.ceil(avgPrice + 1)),
          trend: 'stable',
        },
        travelStyle: 'unknown', // Would be inferred from patterns
      };
    } catch (error) {
      console.error('Error analyzing preferences:', error);
      return {
        categories: [],
        cities: [],
        priceRange: { min: 0, max: 4, trend: 'stable' },
        travelStyle: 'unknown',
      };
    }
  }

  private async analyzeEvolution(
    userId: string,
    interactions: Array<{ type: string; destinationId: number; timestamp: Date }>
  ): Promise<TasteProfile['evolution']> {
    if (!this.supabase) return [];

    try {
      // Get evolution history from database
      const { data: history } = await this.supabase
        .from('user_preferences_evolution')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      return (history || []).map((h: any) => ({
        timestamp: new Date(h.created_at),
        change: h.change_description,
        confidence: h.confidence || 0.5,
      }));
    } catch (error) {
      console.error('Error analyzing evolution:', error);
      return [];
    }
  }

  private async buildContextualProfiles(
    userId: string,
    interactions: Array<{ type: string; destinationId: number; timestamp: Date; context?: string }>
  ): Promise<TasteProfile['contextualProfiles']> {
    if (!this.supabase) return {};

    try {
      // Get destination details for all interactions
      const destinationIds = [...new Set(interactions.map(i => i.destinationId))];
      if (destinationIds.length === 0) return {};

      const { data: destinations } = await this.supabase
        .from('destinations')
        .select('id, category, city, price_level, tags, michelin_stars, rating')
        .in('id', destinationIds);

      if (!destinations) return {};

      const destMap = new Map(destinations.map((d: any) => [d.id, d]));

      // Categorize interactions by context
      const contextInteractions: Record<string, Array<{ destinationId: number; timestamp: Date }>> = {
        business: [],
        leisure: [],
        romantic: [],
        family: [],
      };

      for (const interaction of interactions) {
        const context = this.inferContext(interaction, destMap.get(interaction.destinationId));
        if (context && contextInteractions[context]) {
          contextInteractions[context].push(interaction);
        }
      }

      // Build profile for each context with sufficient data
      const contextualProfiles: TasteProfile['contextualProfiles'] = {};

      for (const [context, contextInts] of Object.entries(contextInteractions)) {
        if (contextInts.length < 3) continue; // Need at least 3 interactions

        const profile = await this.buildContextProfile(contextInts, destMap);
        if (profile) {
          contextualProfiles[context as keyof TasteProfile['contextualProfiles']] = profile;
        }
      }

      return contextualProfiles;
    } catch (error) {
      console.error('Error building contextual profiles:', error);
      return {};
    }
  }

  /**
   * Infer the travel context based on destination characteristics and interaction patterns
   */
  private inferContext(
    interaction: { type: string; destinationId: number; timestamp: Date; context?: string },
    destination: any
  ): string | null {
    // If explicit context is provided, use it
    if (interaction.context) {
      try {
        const contextData = typeof interaction.context === 'string'
          ? JSON.parse(interaction.context)
          : interaction.context;
        if (contextData.tripType) {
          return contextData.tripType;
        }
      } catch {
        // Continue with inference
      }
    }

    if (!destination) return 'leisure'; // Default

    const category = (destination.category || '').toLowerCase();
    const tags = (destination.tags || []).map((t: string) => t.toLowerCase());
    const dayOfWeek = interaction.timestamp.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Business context indicators
    const businessIndicators = ['hotel', 'airport', 'business', 'conference', 'coworking'];
    if (businessIndicators.some(ind => category.includes(ind) || tags.includes(ind))) {
      return 'business';
    }

    // Family context indicators
    const familyIndicators = ['family', 'kids', 'children', 'playground', 'zoo', 'aquarium', 'theme park', 'museum'];
    if (familyIndicators.some(ind => category.includes(ind) || tags.some((t: string) => t.includes(ind)))) {
      return 'family';
    }

    // Romantic context indicators
    const romanticIndicators = ['romantic', 'couples', 'spa', 'fine dining', 'rooftop', 'sunset', 'boutique'];
    const isMichelinOrHighEnd = destination.michelin_stars > 0 || destination.price_level >= 4;
    if (romanticIndicators.some(ind => category.includes(ind) || tags.some((t: string) => t.includes(ind))) ||
        (isMichelinOrHighEnd && isWeekend)) {
      return 'romantic';
    }

    // Default to leisure for weekends, business for weekdays (heuristic)
    return isWeekend ? 'leisure' : 'business';
  }

  /**
   * Build a preference profile from a set of contextual interactions
   */
  private async buildContextProfile(
    interactions: Array<{ destinationId: number; timestamp: Date }>,
    destMap: Map<number, any>
  ): Promise<TasteProfile['preferences'] | null> {
    if (interactions.length === 0) return null;

    const categoryCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();
    const priceLevels: number[] = [];
    const allTags: string[] = [];

    for (const interaction of interactions) {
      const dest = destMap.get(interaction.destinationId);
      if (!dest) continue;

      if (dest.category) {
        categoryCounts.set(dest.category, (categoryCounts.get(dest.category) || 0) + 1);
      }
      if (dest.city) {
        cityCounts.set(dest.city, (cityCounts.get(dest.city) || 0) + 1);
      }
      if (dest.price_level) {
        priceLevels.push(dest.price_level);
      }
      if (dest.tags && Array.isArray(dest.tags)) {
        allTags.push(...dest.tags);
      }
    }

    const totalInteractions = interactions.length;

    // Calculate category preferences with trends
    const categories = [...categoryCounts.entries()]
      .map(([category, count]) => ({
        category,
        weight: count / totalInteractions,
        trend: this.calculateTrendForItem(category, interactions, destMap, 'category'),
      }))
      .sort((a, b) => b.weight - a.weight);

    // Calculate city preferences with trends
    const cities = [...cityCounts.entries()]
      .map(([city, count]) => ({
        city,
        weight: count / totalInteractions,
        trend: this.calculateTrendForItem(city, interactions, destMap, 'city'),
      }))
      .sort((a, b) => b.weight - a.weight);

    // Calculate price range
    const avgPrice = priceLevels.length > 0
      ? priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length
      : 2;

    // Infer travel style from patterns
    const travelStyle = this.inferTravelStyle(categories, priceLevels, allTags);

    return {
      categories,
      cities,
      priceRange: {
        min: Math.max(0, Math.floor(avgPrice - 1)),
        max: Math.min(4, Math.ceil(avgPrice + 1)),
        trend: this.calculatePriceTrend(interactions, destMap),
      },
      travelStyle,
    };
  }

  /**
   * Calculate trend for a specific category or city over time
   */
  private calculateTrendForItem(
    item: string,
    interactions: Array<{ destinationId: number; timestamp: Date }>,
    destMap: Map<number, any>,
    field: 'category' | 'city'
  ): 'increasing' | 'decreasing' | 'stable' {
    if (interactions.length < 4) return 'stable';

    // Sort by timestamp
    const sorted = [...interactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const midpoint = Math.floor(sorted.length / 2);

    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    // Count occurrences in each half
    const countInHalf = (half: typeof sorted) => {
      return half.filter(int => {
        const dest = destMap.get(int.destinationId);
        return dest && dest[field] === item;
      }).length / half.length;
    };

    const firstRate = countInHalf(firstHalf);
    const secondRate = countInHalf(secondHalf);

    const change = secondRate - firstRate;
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate price trend over time
   */
  private calculatePriceTrend(
    interactions: Array<{ destinationId: number; timestamp: Date }>,
    destMap: Map<number, any>
  ): 'increasing' | 'decreasing' | 'stable' {
    if (interactions.length < 4) return 'stable';

    const sorted = [...interactions]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .filter(int => destMap.get(int.destinationId)?.price_level);

    if (sorted.length < 4) return 'stable';

    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const avgPrice = (half: typeof sorted) => {
      const prices = half.map(int => destMap.get(int.destinationId)?.price_level).filter(Boolean);
      return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    };

    const firstAvg = avgPrice(firstHalf);
    const secondAvg = avgPrice(secondHalf);

    const change = (secondAvg - firstAvg) / Math.max(firstAvg, 1);
    if (change > 0.15) return 'increasing';
    if (change < -0.15) return 'decreasing';
    return 'stable';
  }

  /**
   * Infer travel style from patterns
   */
  private inferTravelStyle(
    categories: Array<{ category: string; weight: number }>,
    priceLevels: number[],
    tags: string[]
  ): string {
    const avgPrice = priceLevels.length > 0
      ? priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length
      : 2;

    const topCategories = categories.slice(0, 3).map(c => c.category.toLowerCase());
    const tagSet = new Set(tags.map(t => t.toLowerCase()));

    // Luxury traveler
    if (avgPrice >= 3.5 || tagSet.has('luxury') || tagSet.has('michelin')) {
      return 'luxury';
    }

    // Foodie
    if (topCategories.some(c => ['restaurant', 'bar', 'cafe', 'bakery', 'food'].some(f => c.includes(f)))) {
      return 'foodie';
    }

    // Culture enthusiast
    if (topCategories.some(c => ['museum', 'gallery', 'architecture', 'historic', 'cultural'].some(f => c.includes(f)))) {
      return 'culture_enthusiast';
    }

    // Adventure seeker
    if (tagSet.has('adventure') || tagSet.has('outdoor') || tagSet.has('hiking') || tagSet.has('extreme')) {
      return 'adventure';
    }

    // Budget conscious
    if (avgPrice <= 1.5) {
      return 'budget';
    }

    // Relaxation focused
    if (tagSet.has('spa') || tagSet.has('wellness') || tagSet.has('relaxation') || tagSet.has('beach')) {
      return 'relaxation';
    }

    return 'balanced';
  }

  private detectChanges(
    currentProfile: TasteProfile | null,
    newInteractions: Array<{ type: string; destinationId: number; timestamp: Date; context?: string }>
  ): Array<{ type: string; description: string; confidence: number; metadata?: any }> {
    const changes: Array<{ type: string; description: string; confidence: number; metadata?: any }> = [];

    if (!currentProfile || newInteractions.length === 0) {
      return changes;
    }

    // Analyze category shifts
    const newCategoryCounts = new Map<string, number>();
    for (const interaction of newInteractions) {
      // Would need to look up destination category - simplified for now
      // In production, join with destinations table
    }

    // Detect significant preference shifts
    const currentTopCategories = currentProfile.preferences.categories.slice(0, 3);

    // Check for new category interests
    for (const [category, count] of newCategoryCounts.entries()) {
      const currentPref = currentTopCategories.find(c => c.category === category);
      if (!currentPref && count >= 2) {
        changes.push({
          type: 'new_interest',
          description: `Emerging interest in ${category}`,
          confidence: Math.min(0.9, count * 0.2),
          metadata: { category, interactionCount: count },
        });
      } else if (currentPref && count >= 3) {
        const expectedCount = currentPref.weight * newInteractions.length;
        if (count > expectedCount * 1.5) {
          changes.push({
            type: 'increasing_interest',
            description: `Growing preference for ${category}`,
            confidence: 0.7,
            metadata: { category, expected: expectedCount, actual: count },
          });
        } else if (count < expectedCount * 0.5) {
          changes.push({
            type: 'decreasing_interest',
            description: `Declining interest in ${category}`,
            confidence: 0.6,
            metadata: { category, expected: expectedCount, actual: count },
          });
        }
      }
    }

    // Detect price preference shifts
    // Would calculate from new interactions' destinations

    return changes;
  }
}

export const tasteProfileEvolutionService = new TasteProfileEvolutionService();

