/**
 * Opportunity Detection Service
 * Detects price drops, availability openings, events, and other opportunities
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { realtimeIntelligenceService } from '@/services/realtime/realtime-intelligence';

export interface Opportunity {
  type: 'price_drop' | 'availability_opening' | 'event_alert' | 'weather_opportunity' | 'comparative_deal';
  destinationId: number;
  destinationSlug?: string;
  destinationName?: string;
  city?: string;
  title: string;
  description: string;
  value: {
    priceChange?: number;
    priceChangePercent?: number;
    availabilityDate?: Date;
    eventName?: string;
    eventDate?: Date;
    weatherCondition?: string;
    comparativeSavings?: number;
  };
  urgency: 'low' | 'medium' | 'high';
  expiresAt?: Date;
  detectedAt: Date;
}

export class OpportunityDetectionService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  /**
   * Detect opportunities for a user
   */
  async detectOpportunities(
    userId: string | undefined,
    city?: string,
    limit: number = 10
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    if (!this.supabase) return opportunities;

    try {
      // 1. Price drop opportunities (from saved destinations)
      if (userId) {
        const priceDrops = await this.detectPriceDrops(userId);
        opportunities.push(...priceDrops);
      }

      // 2. Availability openings
      const availabilityOpenings = await this.detectAvailabilityOpenings(city);
      opportunities.push(...availabilityOpenings);

      // 3. Event-based opportunities
      const eventOpportunities = await this.detectEventOpportunities(city);
      opportunities.push(...eventOpportunities);

      // 4. Weather-based opportunities
      const weatherOpportunities = await this.detectWeatherOpportunities(city);
      opportunities.push(...weatherOpportunities);

      // 5. Comparative deals
      const comparativeDeals = await this.detectComparativeDeals(city);
      opportunities.push(...comparativeDeals);

      // Sort by urgency and relevance
      opportunities.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });

      return opportunities.slice(0, limit);
    } catch (error) {
      console.error('Error detecting opportunities:', error);
      return opportunities;
    }
  }

  private async detectPriceDrops(userId: string): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    try {
      // Get user's saved destinations with price alerts
      const { data: alerts } = await (this.supabase as any)
        .from('price_alerts')
        .select('*, destinations(id, name, slug, city, current_price)')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (!alerts) return opportunities;

      for (const alert of alerts) {
        const destination = alert.destinations;
        if (!destination) continue;

        const currentPrice = destination.current_price;
        const targetPrice = alert.target_price;

        if (currentPrice && currentPrice <= targetPrice) {
          const priceChange = targetPrice - currentPrice;
          const priceChangePercent = (priceChange / targetPrice) * 100;

          opportunities.push({
            type: 'price_drop',
            destinationId: alert.destination_id,
            destinationSlug: destination.slug,
            destinationName: destination.name,
            city: destination.city,
            title: `Price Drop: ${destination.name}`,
            description: `Price dropped to ${currentPrice} ${alert.currency}`,
            value: {
              priceChange,
              priceChangePercent,
            },
            urgency: priceChangePercent > 20 ? 'high' : priceChangePercent > 10 ? 'medium' : 'low',
            detectedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error detecting price drops:', error);
    }

    return opportunities;
  }

  private async detectAvailabilityOpenings(city?: string): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    try {
      // This would check for sudden availability openings
      // For now, placeholder implementation
      // In production, would check booking APIs, cancellation data, etc.
    } catch (error) {
      console.error('Error detecting availability openings:', error);
    }

    return opportunities;
  }

  private async detectEventOpportunities(city?: string): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    try {
      if (!city) return opportunities;

      // Get upcoming events in city
      const { data: destinations } = await (this.supabase as any)
        .from('destinations')
        .select('id, name, slug, city, nearby_events_json')
        .ilike('city', `%${city}%`)
        .not('nearby_events_json', 'is', null)
        .limit(20);

      if (!destinations) return opportunities;

      for (const dest of destinations) {
        try {
          const events = dest.nearby_events_json ? JSON.parse(dest.nearby_events_json) : [];
          
          // Find events starting soon (next 7 days)
          const upcomingEvents = events.filter((event: any) => {
            if (!event.start_date) return false;
            const eventDate = new Date(event.start_date);
            const daysUntil = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return daysUntil >= 0 && daysUntil <= 7;
          });

          for (const event of upcomingEvents) {
            opportunities.push({
              type: 'event_alert',
              destinationId: dest.id,
              destinationSlug: dest.slug,
              destinationName: dest.name,
              city: dest.city,
              title: `${event.name} starting soon`,
              description: `Event near ${dest.name} starting ${new Date(event.start_date).toLocaleDateString()}`,
              value: {
                eventName: event.name,
                eventDate: new Date(event.start_date),
              },
              urgency: 'medium',
              expiresAt: new Date(event.start_date),
              detectedAt: new Date(),
            });
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    } catch (error) {
      console.error('Error detecting event opportunities:', error);
    }

    return opportunities;
  }

  private async detectWeatherOpportunities(city?: string): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    try {
      if (!city) return opportunities;

      // Get destinations with good weather conditions
      const { data: destinations } = await (this.supabase as any)
        .from('destinations')
        .select('id, name, slug, city, current_weather_json, category')
        .ilike('city', `%${city}%`)
        .not('current_weather_json', 'is', null)
        .limit(20);

      if (!destinations) return opportunities;

      for (const dest of destinations) {
        try {
          const weather = dest.current_weather_json ? JSON.parse(dest.current_weather_json) : null;
          
          if (weather && weather.condition) {
            const condition = weather.condition.toLowerCase();
            
            // Good weather for outdoor activities
            if (['sunny', 'clear', 'partly cloudy'].includes(condition) && 
                ['outdoor', 'park', 'garden'].some(cat => dest.category?.toLowerCase().includes(cat))) {
              opportunities.push({
                type: 'weather_opportunity',
                destinationId: dest.id,
                destinationSlug: dest.slug,
                destinationName: dest.name,
                city: dest.city,
                title: `Perfect weather for ${dest.name}`,
                description: `Current weather: ${weather.condition}`,
                value: {
                  weatherCondition: weather.condition,
                },
                urgency: 'low',
                detectedAt: new Date(),
              });
            }
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    } catch (error) {
      console.error('Error detecting weather opportunities:', error);
    }

    return opportunities;
  }

  private async detectComparativeDeals(city?: string): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    try {
      if (!this.supabase) return opportunities;

      // Get destinations with price data, optionally filtered by city
      let query = this.supabase
        .from('destinations')
        .select(`
          id,
          name,
          slug,
          city,
          category,
          price_level,
          rating,
          michelin_stars,
          current_price,
          tags
        `)
        .not('price_level', 'is', null);

      if (city) {
        query = query.ilike('city', `%${city}%`);
      }

      const { data: destinations, error } = await query.limit(100);

      if (error || !destinations || destinations.length === 0) {
        return opportunities;
      }

      // Group destinations by category for comparison
      const categoryGroups = new Map<string, typeof destinations>();
      for (const dest of destinations) {
        if (!dest.category) continue;
        const category = dest.category.toLowerCase();
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, []);
        }
        categoryGroups.get(category)!.push(dest);
      }

      // Find comparative deals within each category
      for (const [category, categoryDests] of categoryGroups.entries()) {
        if (categoryDests.length < 2) continue;

        // Calculate category averages
        const avgPriceLevel = categoryDests.reduce((sum, d) => sum + (d.price_level || 0), 0) / categoryDests.length;
        const avgRating = categoryDests.filter(d => d.rating).reduce((sum, d) => sum + (d.rating || 0), 0) /
          categoryDests.filter(d => d.rating).length || 0;

        // Find destinations with better value (lower price but good quality)
        for (const dest of categoryDests) {
          // Skip if missing key data
          if (!dest.price_level || !dest.rating) continue;

          // Value score: higher rating at lower price = better value
          const priceDiscount = avgPriceLevel - dest.price_level;
          const ratingBonus = dest.rating - avgRating;

          // Check for exceptional value: cheaper than average AND rated higher than average
          if (priceDiscount >= 0.5 && ratingBonus >= 0.2) {
            const savingsPercent = Math.round((priceDiscount / avgPriceLevel) * 100);

            opportunities.push({
              type: 'comparative_deal',
              destinationId: dest.id,
              destinationSlug: dest.slug,
              destinationName: dest.name,
              city: dest.city,
              title: `Great value: ${dest.name}`,
              description: `${savingsPercent}% more affordable than similar ${category}s in ${dest.city || 'the area'}, with higher ratings`,
              value: {
                comparativeSavings: savingsPercent,
              },
              urgency: savingsPercent >= 30 ? 'high' : savingsPercent >= 15 ? 'medium' : 'low',
              detectedAt: new Date(),
            });
          }

          // Check for Michelin value: Michelin-starred at lower price levels
          if (dest.michelin_stars && dest.michelin_stars > 0 && dest.price_level <= 3) {
            opportunities.push({
              type: 'comparative_deal',
              destinationId: dest.id,
              destinationSlug: dest.slug,
              destinationName: dest.name,
              city: dest.city,
              title: `Michelin value: ${dest.name}`,
              description: `${dest.michelin_stars} Michelin star${dest.michelin_stars > 1 ? 's' : ''} at accessible price point`,
              value: {
                comparativeSavings: Math.round(((4 - dest.price_level) / 4) * 100),
              },
              urgency: 'high',
              detectedAt: new Date(),
            });
          }
        }

        // Find similar destinations with price differences
        // Compare destinations with similar tags/characteristics
        for (let i = 0; i < categoryDests.length; i++) {
          for (let j = i + 1; j < categoryDests.length; j++) {
            const destA = categoryDests[i];
            const destB = categoryDests[j];

            // Check if they're similar (same city, similar ratings)
            if (destA.city !== destB.city) continue;
            if (!destA.rating || !destB.rating) continue;

            const ratingDiff = Math.abs(destA.rating - destB.rating);
            const priceDiff = Math.abs((destA.price_level || 0) - (destB.price_level || 0));

            // Similar quality but different price
            if (ratingDiff <= 0.3 && priceDiff >= 1) {
              const cheaperDest = (destA.price_level || 0) < (destB.price_level || 0) ? destA : destB;
              const expensiveDest = cheaperDest === destA ? destB : destA;

              // Check tag similarity for better matching
              const tagsA = new Set((destA.tags || []).map((t: string) => t.toLowerCase()));
              const tagsB = new Set((destB.tags || []).map((t: string) => t.toLowerCase()));
              const commonTags = [...tagsA].filter(t => tagsB.has(t));

              if (commonTags.length >= 2) {
                opportunities.push({
                  type: 'comparative_deal',
                  destinationId: cheaperDest.id,
                  destinationSlug: cheaperDest.slug,
                  destinationName: cheaperDest.name,
                  city: cheaperDest.city,
                  title: `Alternative to ${expensiveDest.name}`,
                  description: `Similar experience to ${expensiveDest.name} at a lower price point`,
                  value: {
                    comparativeSavings: Math.round((priceDiff / (expensiveDest.price_level || 1)) * 100),
                  },
                  urgency: 'medium',
                  detectedAt: new Date(),
                });
              }
            }
          }
        }
      }

      // Deduplicate opportunities by destination
      const seen = new Set<number>();
      const dedupedOpportunities = opportunities.filter(opp => {
        if (seen.has(opp.destinationId)) return false;
        seen.add(opp.destinationId);
        return true;
      });

      return dedupedOpportunities;
    } catch (error) {
      console.error('Error detecting comparative deals:', error);
    }

    return opportunities;
  }
}

export const opportunityDetectionService = new OpportunityDetectionService();
