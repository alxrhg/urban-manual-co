/**
 * Opportunity Detection Service
 * Detects deals, availability openings, seasonal alerts, and trending opportunities
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { getSeasonalContext } from '@/services/seasonality';

export interface Opportunity {
  id?: string;
  opportunity_type: 'price_drop' | 'availability' | 'seasonal' | 'event' | 'weather' | 'trending';
  destination_id?: string;
  city?: string;
  category?: string;
  title: string;
  description: string;
  opportunity_data: {
    price_change?: number;
    availability_window?: { start: string; end: string };
    event_details?: any;
    weather_conditions?: string;
    trending_score?: number;
  };
  urgency: 'low' | 'medium' | 'high';
  expires_at?: string;
}

export class OpportunityDetectionService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('OpportunityDetectionService: Supabase client not available');
    }
  }

  /**
   * Detect opportunities for a user
   */
  async detectOpportunities(
    userId?: string,
    city?: string,
    limit: number = 10
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    // 1. Seasonal opportunities
    if (city) {
      const seasonal = await this.detectSeasonalOpportunities(city);
      opportunities.push(...seasonal);
    }

    // 2. Trending destinations
    const trending = await this.detectTrendingOpportunities(city);
    opportunities.push(...trending);

    // 3. Price drops (if we have pricing data)
    const priceDrops = await this.detectPriceDrops(userId, city);
    opportunities.push(...priceDrops);

    // 4. Availability windows
    const availability = await this.detectAvailabilityWindows(city);
    opportunities.push(...availability);

    // Sort by urgency and relevance
    const sorted = opportunities.sort((a, b) => {
      const urgencyScore = { high: 3, medium: 2, low: 1 };
      return urgencyScore[b.urgency] - urgencyScore[a.urgency];
    });

    return sorted.slice(0, limit);
  }

  /**
   * Detect seasonal opportunities
   */
  private async detectSeasonalOpportunities(city: string): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];
    const seasonalContext = getSeasonalContext(city);

    if (seasonalContext) {
      const daysUntil = Math.ceil(
        (seasonalContext.start.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil > 0 && daysUntil <= 30) {
        opportunities.push({
          opportunity_type: 'seasonal',
          city,
          title: `${seasonalContext.event} is approaching`,
          description: `${seasonalContext.event} starts in ${daysUntil} days. ${seasonalContext.text}`,
          opportunity_data: {
            availability_window: {
              start: seasonalContext.start.toISOString(),
              end: seasonalContext.end.toISOString(),
            },
          },
          urgency: daysUntil <= 7 ? 'high' : daysUntil <= 14 ? 'medium' : 'low',
          expires_at: seasonalContext.end.toISOString(),
        });
      }
    }

    return opportunities;
  }

  /**
   * Detect trending destinations
   */
  private async detectTrendingOpportunities(city?: string): Promise<Opportunity[]> {
    if (!this.supabase) return [];
    
    try {
      // Calculate trending score based on recent interactions
      const { data: recentInteractions } = await this.supabase
        .from('user_interactions')
        .select('destination_id, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .limit(1000);

      if (!recentInteractions || recentInteractions.length === 0) {
        return [];
      }

      // Count interactions per destination
      const destinationCounts = new Map<string, number>();
      recentInteractions.forEach(interaction => {
        const count = destinationCounts.get(interaction.destination_id) || 0;
        destinationCounts.set(interaction.destination_id, count + 1);
      });

      // Get destination details
      const trendingDestinations = Array.from(destinationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const { data: destinations } = await this.supabase
        .from('destinations')
        .select('id, name, city, category')
        .in('id', trendingDestinations.map(d => d[0]));

      if (!destinations) {
        return [];
      }

      const opportunities: Opportunity[] = [];
      destinations.forEach(dest => {
        const interactionCount = destinationCounts.get(dest.id) || 0;
        if (interactionCount >= 5) { // Threshold for "trending"
          opportunities.push({
            opportunity_type: 'trending',
            destination_id: dest.id,
            city: dest.city,
            category: dest.category,
            title: `${dest.name} is trending`,
            description: `This ${dest.category?.toLowerCase() || 'destination'} is seeing increased interest recently`,
            opportunity_data: {
              trending_score: interactionCount,
            },
            urgency: 'medium',
          });
        }
      });

      return opportunities;
    } catch (error) {
      console.error('Error detecting trending opportunities:', error);
      return [];
    }
  }

  /**
   * Detect price drops (placeholder - would need pricing data)
   */
  private async detectPriceDrops(userId?: string, city?: string): Promise<Opportunity[]> {
    // This would require integration with pricing APIs or historical price data
    // For now, return empty array
    return [];
  }

  /**
   * Detect availability windows
   */
  private async detectAvailabilityWindows(city?: string): Promise<Opportunity[]> {
    // This would require real-time availability data
    // For now, return empty array
    return [];
  }

  /**
   * Store opportunity alert
   */
  async storeOpportunity(opportunity: Opportunity, userId?: string): Promise<void> {
    if (!this.supabase) return;
    
    try {
      await this.supabase.from('opportunity_alerts').insert({
        opportunity_type: opportunity.opportunity_type,
        destination_id: opportunity.destination_id,
        user_id: userId,
        city: opportunity.city,
        category: opportunity.category,
        title: opportunity.title,
        description: opportunity.description,
        opportunity_data: opportunity.opportunity_data,
        urgency: opportunity.urgency,
        expires_at: opportunity.expires_at,
        is_active: true,
      });
    } catch (error) {
      console.error('Error storing opportunity:', error);
    }
  }

  /**
   * Get stored opportunities for a user
   */
  async getUserOpportunities(userId: string, activeOnly: boolean = true): Promise<Opportunity[]> {
    if (!this.supabase) return [];
    
    try {
      let query = this.supabase
        .from('opportunity_alerts')
        .select('*')
        .eq('user_id', userId);

      if (activeOnly) {
        query = query.eq('is_active', true);
        query = query.or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(row => ({
        id: row.id,
        opportunity_type: row.opportunity_type,
        destination_id: row.destination_id,
        city: row.city,
        category: row.category,
        title: row.title,
        description: row.description,
        opportunity_data: row.opportunity_data,
        urgency: row.urgency,
        expires_at: row.expires_at,
      }));
    } catch (error) {
      console.error('Error getting user opportunities:', error);
      return [];
    }
  }
}

export const opportunityDetectionService = new OpportunityDetectionService();

