/**
 * Feed Generation Service
 * Generates personalized algorithmic feed for users
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { advancedRecommendationEngine } from '@/services/intelligence/recommendations-advanced';

export interface FeedCard {
  destination_id: number;
  destination: any;
  score: number;
  reason: string;
  position: number;
  factors?: {
    personalization?: number;
    quality?: number;
    collaborative?: number;
    popularity?: number;
    freshness?: number;
  };
}

export interface UserProfile {
  user_id: string;
  preferred_categories: Record<string, number>;
  preferred_cities: Record<string, number>;
  preferred_price_range: { min: number; max: number };
  preferred_tags: Record<string, number>;
  avg_session_length_seconds: number;
  peak_activity_hours: number[];
  scroll_velocity: number;
  skip_rate: number;
  total_views: number;
  total_saves: number;
  total_skips: number;
  total_visits: number;
  engagement_score: number;
  exploration_vs_exploitation: number;
  profile_confidence: number;
  onboarding_completed: boolean;
}

export class FeedGenerationService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('FeedGenerationService: Supabase client not available');
    }
  }

  /**
   * Generate personalized feed for user
   */
  async generateFeed(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<FeedCard[]> {
    if (!this.supabase) return [];

    try {
      // Check cache first
      const cached = await this.getCachedFeed(userId);
      if (cached && cached.length > offset) {
        return cached.slice(offset, offset + limit);
      }

      // Get user profile
      const profile = await this.getUserProfile(userId);

      // If no profile or low confidence, use cold start
      if (!profile || profile.profile_confidence < 0.3) {
        return await this.generateColdStartFeed(userId, limit, offset);
      }

      // Get candidate destinations
      const candidates = await this.getCandidates(userId, profile);

      // Score each candidate
      const scored = await Promise.all(
        candidates.map(async (dest, index) => {
          const score = await this.calculateFeedScore(dest, profile, userId);
          return {
            destination_id: dest.id,
            destination: dest,
            score: score.total,
            reason: score.reason,
            position: index,
            factors: score.factors,
          };
        })
      );

      // Sort by score
      const ranked = scored.sort((a, b) => b.score - a.score);

      // Apply diversity
      const diversified = this.applyDiversity(ranked);

      // Inject serendipity
      const final = await this.injectSerendipity(diversified, profile);

      // Cache the feed
      await this.cacheFeed(userId, final);

      return final.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error generating feed:', error);
      return [];
    }
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Get candidate destinations using SQL function
   */
  private async getCandidates(
    userId: string,
    profile: UserProfile
  ): Promise<any[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .rpc('get_feed_candidates', {
          p_user_id: userId,
          p_limit: 200,
          p_exclude_recent_days: 7
        });

      if (error || !data) {
        console.error('Error getting candidates:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error in getCandidates:', error);
      return [];
    }
  }

  /**
   * Calculate feed score for a destination
   */
  private async calculateFeedScore(
    destination: any,
    profile: UserProfile,
    userId: string
  ): Promise<{ total: number; reason: string; factors: any }> {
    const factors = {
      personalization: 0,
      quality: 0,
      collaborative: 0,
      popularity: 0,
      freshness: 0,
    };

    // 1. PERSONALIZATION (40% weight)
    const cityScore = profile.preferred_cities[destination.city] || 0.3;
    const categoryScore = profile.preferred_categories[destination.category] || 0.3;

    // Tags match
    let tagsScore = 0.3;
    if (destination.tags && Array.isArray(destination.tags)) {
      const matchedTags = destination.tags.filter((tag: string) =>
        profile.preferred_tags[tag] && profile.preferred_tags[tag] > 0.5
      );
      tagsScore = matchedTags.length > 0
        ? matchedTags.reduce((sum: number, tag: string) =>
            sum + (profile.preferred_tags[tag] || 0), 0) / matchedTags.length
        : 0.3;
    }

    factors.personalization =
      cityScore * 0.15 +
      categoryScore * 0.15 +
      tagsScore * 0.10;

    // 2. QUALITY SIGNALS (30% weight)
    const ratingScore = (destination.rating || 4.0) / 5;
    const michelinBonus = destination.michelin_stars ? 0.1 : 0;
    const crownBonus = destination.crown ? 0.05 : 0;

    factors.quality =
      ratingScore * 0.15 +
      michelinBonus +
      crownBonus;

    // 3. COLLABORATIVE FILTERING (15% weight)
    // Use existing recommendation engine
    try {
      const recs = await advancedRecommendationEngine.getRecommendations(
        userId,
        10,
        { excludeVisited: true, excludeSaved: true }
      );
      const recMatch = recs.find(r => r.destination_id === destination.id.toString());
      factors.collaborative = recMatch ? recMatch.factors.collaborative || 0 : 0;
    } catch (error) {
      factors.collaborative = 0;
    }

    // 4. POPULARITY & TRENDING (10% weight)
    const savesScore = Math.min(1.0, (destination.saves_count || 0) / 100);
    const visitsScore = Math.min(1.0, (destination.visits_count || 0) / 50);
    factors.popularity = (savesScore * 0.6 + visitsScore * 0.4) * 0.1;

    // 5. FRESHNESS (5% weight)
    // Boost recently added destinations (if we had created_at field)
    factors.freshness = 0;

    // Calculate total score
    const total =
      factors.personalization * 0.4 +
      factors.quality * 0.3 +
      factors.collaborative * 0.15 +
      factors.popularity * 0.1 +
      factors.freshness * 0.05;

    // Generate reason
    const reason = this.generateReason(factors, destination, profile);

    return { total, reason, factors };
  }

  /**
   * Generate explanation for recommendation
   */
  private generateReason(
    factors: any,
    destination: any,
    profile: UserProfile
  ): string {
    const reasons: string[] = [];

    // Check which factor is strongest
    if (factors.personalization > 0.25) {
      if (profile.preferred_cities[destination.city] > 0.7) {
        reasons.push(`Popular in ${destination.city}`);
      } else if (profile.preferred_categories[destination.category] > 0.7) {
        reasons.push('Matches your taste');
      } else {
        reasons.push('Based on your preferences');
      }
    }

    if (factors.collaborative > 0.08) {
      reasons.push('People like you loved this');
    }

    if (factors.quality > 0.25) {
      if (destination.michelin_stars) {
        reasons.push(`${destination.michelin_stars}★ Michelin`);
      } else if (destination.rating >= 4.7) {
        reasons.push('Highly rated');
      }
    }

    if (factors.popularity > 0.08) {
      if (destination.saves_count > 50) {
        reasons.push('Trending');
      }
    }

    return reasons.length > 0 ? reasons.slice(0, 2).join(' • ') : 'Recommended for you';
  }

  /**
   * Apply diversity to prevent clustering
   */
  private applyDiversity(ranked: FeedCard[]): FeedCard[] {
    const diversified: FeedCard[] = [];
    const cityCount = new Map<string, number>();
    const categoryCount = new Map<string, number>();

    for (const card of ranked) {
      const dest = card.destination;

      // Limit consecutive items from same city (max 2)
      const cityOccurrences = cityCount.get(dest.city) || 0;
      if (cityOccurrences >= 2) {
        continue;
      }

      // Limit consecutive items from same category (max 2)
      const categoryOccurrences = categoryCount.get(dest.category) || 0;
      if (categoryOccurrences >= 2) {
        continue;
      }

      diversified.push(card);
      cityCount.set(dest.city, cityOccurrences + 1);
      categoryCount.set(dest.category, categoryOccurrences + 1);

      // Reset counters every 5 items
      if (diversified.length % 5 === 0) {
        cityCount.clear();
        categoryCount.clear();
      }
    }

    return diversified;
  }

  /**
   * Inject serendipity cards (every 5th position)
   */
  private async injectSerendipity(
    feed: FeedCard[],
    profile: UserProfile
  ): Promise<FeedCard[]> {
    if (!this.supabase) return feed;

    const withVariety: FeedCard[] = [];

    for (let i = 0; i < feed.length; i++) {
      withVariety.push(feed[i]);

      // Every 5th card, inject something different
      if ((i + 1) % 5 === 0 && profile.exploration_vs_exploitation > 0.5) {
        const serendipityCard = await this.pickSerendipityCard(profile);
        if (serendipityCard) {
          withVariety.push({
            ...serendipityCard,
            reason: 'Something different for you ✨',
            position: withVariety.length,
          });
        }
      }
    }

    return withVariety;
  }

  /**
   * Pick a serendipity card (different from user's usual taste)
   */
  private async pickSerendipityCard(profile: UserProfile): Promise<FeedCard | null> {
    if (!this.supabase) return null;

    try {
      // Get cities user hasn't explored much
      const allCities = ['Tokyo', 'Paris', 'London', 'New York', 'San Francisco', 'Barcelona', 'Seoul', 'Singapore'];
      const unexploredCities = allCities.filter(city =>
        (profile.preferred_cities[city] || 0) < 0.3
      );

      if (unexploredCities.length === 0) return null;

      const randomCity = unexploredCities[Math.floor(Math.random() * unexploredCities.length)];

      const { data, error } = await this.supabase
        .from('destinations')
        .select('*')
        .eq('city', randomCity)
        .gte('rating', 4.5)
        .limit(10);

      if (error || !data || data.length === 0) return null;

      const destination = data[Math.floor(Math.random() * data.length)];

      return {
        destination_id: destination.id,
        destination,
        score: 0.7,
        reason: 'Something different for you ✨',
        position: 0,
      };
    } catch (error) {
      console.error('Error picking serendipity card:', error);
      return null;
    }
  }

  /**
   * Generate cold start feed for new users
   */
  private async generateColdStartFeed(
    userId: string,
    limit: number,
    offset: number
  ): Promise<FeedCard[]> {
    if (!this.supabase) return [];

    try {
      // Return high-quality diverse destinations
      const { data, error } = await this.supabase
        .from('destinations')
        .select('*')
        .gte('rating', 4.5)
        .order('rating', { ascending: false })
        .limit(100);

      if (error || !data) return [];

      // Shuffle for variety
      const shuffled = data.sort(() => Math.random() - 0.5);

      return shuffled.slice(offset, offset + limit).map((dest, index) => ({
        destination_id: dest.id,
        destination: dest,
        score: 0.5,
        reason: 'Highly rated',
        position: offset + index,
      }));
    } catch (error) {
      console.error('Error generating cold start feed:', error);
      return [];
    }
  }

  /**
   * Cache generated feed
   */
  private async cacheFeed(userId: string, feed: FeedCard[]): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('feed_cache')
        .insert({
          user_id: userId,
          feed_items: feed,
          feed_type: 'for_you',
          items_count: feed.length,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        });
    } catch (error) {
      console.error('Error caching feed:', error);
    }
  }

  /**
   * Get cached feed
   */
  private async getCachedFeed(userId: string): Promise<FeedCard[] | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('feed_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('feed_type', 'for_you')
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return data.feed_items as FeedCard[];
    } catch (error) {
      return null;
    }
  }
}

export const feedGenerationService = new FeedGenerationService();
