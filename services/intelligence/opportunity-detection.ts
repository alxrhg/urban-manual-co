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
   * Detect price drops and budget-friendly opportunities
   */
  private async detectPriceDrops(userId?: string, city?: string): Promise<Opportunity[]> {
    if (!this.supabase) return [];

    try {
      const opportunities: Opportunity[] = [];

      // Find destinations with lower price levels that are highly rated
      // This helps users find good value options
      let query = this.supabase
        .from('destinations')
        .select('id, name, city, category, price_level, rating, user_ratings_total')
        .gte('rating', 4.0)  // Only high-rated places
        .lte('price_level', 2) // Budget-friendly (price level 1-2)
        .gte('user_ratings_total', 50); // Enough reviews to be trusted

      if (city) {
        query = query.eq('city', city);
      }

      const { data: budgetGems, error } = await query.limit(10);

      if (error) {
        console.error('Error detecting price opportunities:', error);
        return [];
      }

      if (budgetGems && budgetGems.length > 0) {
        budgetGems.forEach(dest => {
          // Calculate value score (high rating, low price)
          const valueScore = (dest.rating || 0) / (dest.price_level || 1);

          if (valueScore >= 2.0) { // Good value threshold
            const priceLabel = dest.price_level === 1 ? 'budget-friendly' : 'affordable';

            opportunities.push({
              opportunity_type: 'price_drop',
              destination_id: dest.id.toString(),
              city: dest.city,
              category: dest.category,
              title: `${priceLabel.charAt(0).toUpperCase() + priceLabel.slice(1)} gem: ${dest.name}`,
              description: `Highly rated (${dest.rating}★) ${priceLabel} ${dest.category?.toLowerCase() || 'destination'} with ${dest.user_ratings_total}+ reviews`,
              opportunity_data: {
                price_change: -(4 - (dest.price_level || 1)), // Savings compared to expensive options
              },
              urgency: valueScore >= 3.0 ? 'high' : 'medium',
            });
          }
        });
      }

      // If user is logged in, find price-conscious recommendations based on their history
      if (userId) {
        const { data: userInteractions } = await this.supabase
          .from('user_interactions')
          .select('destination_id, created_at')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(20);

        if (userInteractions && userInteractions.length > 0) {
          // Get average price level user prefers
          const destIds = userInteractions.map(i => i.destination_id);
          const { data: userDestinations } = await this.supabase
            .from('destinations')
            .select('price_level')
            .in('id', destIds);

          if (userDestinations && userDestinations.length > 0) {
            const priceLevels = userDestinations
              .map(d => d.price_level)
              .filter(p => p != null);

            const avgPriceLevel = priceLevels.length > 0
              ? priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length
              : 2;

            // Find similar quality destinations at lower price points
            if (avgPriceLevel > 1) {
              const { data: betterDeals } = await this.supabase
                .from('destinations')
                .select('id, name, city, category, price_level, rating')
                .lt('price_level', Math.ceil(avgPriceLevel))
                .gte('rating', 4.0)
                .limit(5);

              if (betterDeals && betterDeals.length > 0) {
                betterDeals.forEach(dest => {
                  opportunities.push({
                    opportunity_type: 'price_drop',
                    destination_id: dest.id.toString(),
                    city: dest.city,
                    category: dest.category,
                    title: `Save on ${dest.name}`,
                    description: `Similar quality to your preferences but more budget-friendly`,
                    opportunity_data: {
                      price_change: -(avgPriceLevel - (dest.price_level || 1)),
                    },
                    urgency: 'low',
                  });
                });
              }
            }
          }
        }
      }

      return opportunities;
    } catch (error) {
      console.error('Error detecting price drops:', error);
      return [];
    }
  }

  /**
   * Detect availability windows and off-peak opportunities
   */
  private async detectAvailabilityWindows(city?: string): Promise<Opportunity[]> {
    if (!this.supabase) return [];

    try {
      const opportunities: Opportunity[] = [];
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      const currentHour = now.getHours();

      // Find destinations that are currently open or opening soon
      let query = this.supabase
        .from('destinations')
        .select('id, name, city, category, opening_hours_json, rating')
        .not('opening_hours_json', 'is', null)
        .gte('rating', 3.5);

      if (city) {
        query = query.eq('city', city);
      }

      const { data: destinations, error } = await query.limit(50);

      if (error) {
        console.error('Error detecting availability windows:', error);
        return [];
      }

      if (destinations && destinations.length > 0) {
        destinations.forEach(dest => {
          try {
            const openingHours = dest.opening_hours_json as any;

            // Check if destination has periods (Google Places API format)
            if (openingHours?.periods && Array.isArray(openingHours.periods)) {
              const isOpenNow = this.isCurrentlyOpen(openingHours.periods, currentDay, currentHour);
              const opensWithinHour = this.opensWithinNextHour(openingHours.periods, currentDay, currentHour);
              const closesWithinHour = this.closesWithinNextHour(openingHours.periods, currentDay, currentHour);

              // Alert if opening soon
              if (!isOpenNow && opensWithinHour) {
                opportunities.push({
                  opportunity_type: 'availability',
                  destination_id: dest.id.toString(),
                  city: dest.city,
                  category: dest.category,
                  title: `${dest.name} opens soon`,
                  description: `This ${dest.category?.toLowerCase() || 'destination'} will be opening within the next hour`,
                  opportunity_data: {
                    availability_window: {
                      start: opensWithinHour,
                      end: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // Estimate 8 hours
                    },
                  },
                  urgency: 'medium',
                });
              }

              // Alert if closing soon (last call)
              if (isOpenNow && closesWithinHour) {
                opportunities.push({
                  opportunity_type: 'availability',
                  destination_id: dest.id.toString(),
                  city: dest.city,
                  category: dest.category,
                  title: `Last chance: ${dest.name} closes soon`,
                  description: `Visit now - this ${dest.category?.toLowerCase() || 'destination'} closes within the next hour`,
                  opportunity_data: {
                    availability_window: {
                      start: new Date().toISOString(),
                      end: closesWithinHour,
                    },
                  },
                  urgency: 'high',
                });
              }

              // Detect off-peak hours (less crowded times)
              const isOffPeak = this.isOffPeakTime(currentDay, currentHour);
              if (isOpenNow && isOffPeak && dest.rating && dest.rating >= 4.0) {
                opportunities.push({
                  opportunity_type: 'availability',
                  destination_id: dest.id.toString(),
                  city: dest.city,
                  category: dest.category,
                  title: `Off-peak visit: ${dest.name}`,
                  description: `Visit now during quieter hours at this popular ${dest.category?.toLowerCase() || 'destination'}`,
                  opportunity_data: {
                    availability_window: {
                      start: new Date().toISOString(),
                      end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                    },
                  },
                  urgency: 'low',
                });
              }
            }
          } catch (parseError) {
            // Skip destinations with malformed opening hours data
            console.warn(`Error parsing opening hours for destination ${dest.id}:`, parseError);
          }
        });
      }

      // Limit to avoid overwhelming users
      return opportunities.slice(0, 5);
    } catch (error) {
      console.error('Error detecting availability windows:', error);
      return [];
    }
  }

  /**
   * Check if a destination is currently open
   */
  private isCurrentlyOpen(periods: any[], day: number, hour: number): boolean {
    const currentMinutes = hour * 60;

    for (const period of periods) {
      if (period.open && period.open.day === day) {
        const openMinutes = (period.open.hours || 0) * 60 + (period.open.minutes || 0);
        const closeMinutes = period.close
          ? (period.close.hours || 0) * 60 + (period.close.minutes || 0)
          : 24 * 60;

        if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if destination opens within the next hour
   */
  private opensWithinNextHour(periods: any[], day: number, hour: number): string | null {
    const currentMinutes = hour * 60;
    const nextHourMinutes = currentMinutes + 60;

    for (const period of periods) {
      if (period.open && period.open.day === day) {
        const openMinutes = (period.open.hours || 0) * 60 + (period.open.minutes || 0);

        if (openMinutes > currentMinutes && openMinutes <= nextHourMinutes) {
          const openTime = new Date();
          openTime.setHours(period.open.hours || 0, period.open.minutes || 0, 0, 0);
          return openTime.toISOString();
        }
      }
    }

    return null;
  }

  /**
   * Check if destination closes within the next hour
   */
  private closesWithinNextHour(periods: any[], day: number, hour: number): string | null {
    const currentMinutes = hour * 60;
    const nextHourMinutes = currentMinutes + 60;

    for (const period of periods) {
      if (period.open && period.open.day === day && period.close) {
        const openMinutes = (period.open.hours || 0) * 60 + (period.open.minutes || 0);
        const closeMinutes = (period.close.hours || 0) * 60 + (period.close.minutes || 0);

        if (currentMinutes >= openMinutes && closeMinutes > currentMinutes && closeMinutes <= nextHourMinutes) {
          const closeTime = new Date();
          closeTime.setHours(period.close.hours || 0, period.close.minutes || 0, 0, 0);
          return closeTime.toISOString();
        }
      }
    }

    return null;
  }

  /**
   * Determine if current time is off-peak (less crowded)
   */
  private isOffPeakTime(day: number, hour: number): boolean {
    // Weekend peak hours: 11 AM - 8 PM
    // Weekday peak hours: 12 PM - 2 PM and 6 PM - 9 PM

    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      // Off-peak on weekends: before 11 AM or after 8 PM
      return hour < 11 || hour >= 20;
    } else {
      // Off-peak on weekdays: not lunch (12-2) or dinner (6-9)
      return !(hour >= 12 && hour < 14) && !(hour >= 18 && hour < 21);
    }
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

