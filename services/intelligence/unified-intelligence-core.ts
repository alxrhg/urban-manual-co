/**
 * Unified Intelligence Core
 *
 * The central brain that integrates all intelligence capabilities:
 * - Deep Memory (A): Cross-session persistence and learning
 * - Reasoning Engine (B): Chain of thought for complex queries
 * - Trip-Aware (E): Context from active trips
 * - Behavioral Intelligence (F): Learn from actions not words
 * - Knowledge Graph Navigation (G): Architect/movement queries
 * - Autonomous Actions (H): AI that does things
 * - Unified Context Window (I): All features feed intelligence
 * - Taste Fingerprint (J): Multi-dimensional taste profile
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { generateText, generateJSON } from '@/lib/llm';
import { extendedConversationMemoryService } from './conversation-memory';
import { tasteProfileEvolutionService, TasteProfile } from './taste-profile-evolution';
import { knowledgeGraphService } from './knowledge-graph';

// ============================================
// TYPES
// ============================================

export interface UnifiedContext {
  // User identity
  userId: string | null;
  sessionId: string;

  // Active trip context (E)
  activeTrip: ActiveTripContext | null;
  upcomingTrips: TripSummary[];

  // Memory (A)
  conversationSummary: string | null;
  crossSessionInsights: string[];
  recentQueries: string[];

  // Taste fingerprint (J)
  tasteFingerprint: TasteFingerprint | null;

  // Behavioral signals (F)
  recentBehavior: BehaviorSignal[];
  implicitPreferences: ImplicitPreference[];

  // Saved/visited context
  savedPlaces: SavedPlace[];
  visitedPlaces: VisitedPlace[];

  // Real-time context
  currentTime: Date;
  timezone: string;

  // Knowledge graph context (G)
  relatedArchitects: ArchitectContext[];
  relatedMovements: MovementContext[];
}

export interface ActiveTripContext {
  id: string;
  name: string;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  status: string;
  itineraryItems: ItineraryItemContext[];
  gaps: ScheduleGap[];
  companions?: number;
}

export interface TripSummary {
  id: string;
  name: string;
  destination: string;
  startDate: string | null;
  daysUntil: number;
}

export interface ItineraryItemContext {
  id: string;
  day: number;
  time: string | null;
  title: string;
  category: string | null;
  destinationSlug: string | null;
}

export interface ScheduleGap {
  day: number;
  type: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

// Taste Fingerprint (J) - Multi-dimensional profile
export interface TasteFingerprint {
  // Core dimensions (0-1 scale)
  adventurousness: number;      // Hidden gems vs reliable favorites
  priceAffinity: number;        // Budget (0) to splurge (1)
  designSensitivity: number;    // Cares about aesthetics/architecture
  authenticitySeeker: number;   // Local/authentic vs tourist-friendly
  socialEnergy: number;         // Quiet spots (0) to buzzy scenes (1)

  // Category affinities (normalized weights)
  categoryAffinities: Record<string, number>;

  // Cuisine affinities
  cuisineAffinities: Record<string, number>;

  // City familiarity
  cityFamiliarity: Record<string, 'newcomer' | 'familiar' | 'expert'>;

  // Time preferences
  preferredMealTimes: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };

  // Computed at
  computedAt: Date;
  confidence: number; // 0-1, based on data points
}

// Behavioral Intelligence (F)
export interface BehaviorSignal {
  type: 'view' | 'save' | 'unsave' | 'visit' | 'skip' | 'click' | 'search' | 'dwell';
  destinationId?: number;
  destinationSlug?: string;
  category?: string;
  city?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ImplicitPreference {
  dimension: string;
  value: string | number;
  confidence: number;
  source: 'behavior' | 'explicit' | 'inferred';
  evidence: string[];
}

export interface SavedPlace {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  savedAt: Date;
}

export interface VisitedPlace {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  visitedAt: Date;
  rating?: number;
}

// Knowledge Graph (G)
export interface ArchitectContext {
  id: number;
  name: string;
  destinationCount: number;
  relatedTo?: string; // Why this architect is relevant
}

export interface MovementContext {
  id: number;
  name: string;
  period: string;
  destinationCount: number;
}

// Reasoning Engine (B)
export interface ReasoningStep {
  step: number;
  thought: string;
  action?: string;
  result?: string;
}

export interface ReasoningResult {
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
  suggestedActions: AutonomousAction[];
}

// Autonomous Actions (H)
export interface AutonomousAction {
  type: 'save_place' | 'add_to_trip' | 'create_itinerary' | 'remove_from_trip' | 'mark_visited' | 'update_preference';
  params: Record<string, any>;
  description: string;
  requiresConfirmation: boolean;
}

export interface ActionResult {
  success: boolean;
  action: AutonomousAction;
  message: string;
  data?: any;
}

// ============================================
// UNIFIED INTELLIGENCE CORE
// ============================================

export class UnifiedIntelligenceCore {
  private supabase: any;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  // ============================================
  // I: UNIFIED CONTEXT WINDOW
  // ============================================

  /**
   * Build complete context from all sources
   */
  async buildUnifiedContext(
    userId: string | null,
    sessionId: string,
    options: {
      includeTrips?: boolean;
      includeBehavior?: boolean;
      includeTasteProfile?: boolean;
      includeKnowledgeGraph?: boolean;
      currentCity?: string;
    } = {}
  ): Promise<UnifiedContext> {
    const {
      includeTrips = true,
      includeBehavior = true,
      includeTasteProfile = true,
      includeKnowledgeGraph = true,
      currentCity,
    } = options;

    const context: UnifiedContext = {
      userId,
      sessionId,
      activeTrip: null,
      upcomingTrips: [],
      conversationSummary: null,
      crossSessionInsights: [],
      recentQueries: [],
      tasteFingerprint: null,
      recentBehavior: [],
      implicitPreferences: [],
      savedPlaces: [],
      visitedPlaces: [],
      currentTime: new Date(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      relatedArchitects: [],
      relatedMovements: [],
    };

    if (!userId || !this.supabase) {
      return context;
    }

    // Fetch all context in parallel
    const [
      tripContext,
      conversationContext,
      behaviorContext,
      tasteContext,
      savedVisitedContext,
      knowledgeContext,
    ] = await Promise.all([
      includeTrips ? this.fetchTripContext(userId) : null,
      this.fetchConversationContext(sessionId, userId),
      includeBehavior ? this.fetchBehaviorContext(userId) : null,
      includeTasteProfile ? this.fetchTasteFingerprint(userId) : null,
      this.fetchSavedVisitedContext(userId),
      includeKnowledgeGraph && currentCity ? this.fetchKnowledgeContext(currentCity) : null,
    ]);

    // Merge trip context
    if (tripContext) {
      context.activeTrip = tripContext.activeTrip;
      context.upcomingTrips = tripContext.upcomingTrips;
    }

    // Merge conversation context
    if (conversationContext) {
      context.conversationSummary = conversationContext.summary;
      context.crossSessionInsights = conversationContext.insights;
      context.recentQueries = conversationContext.recentQueries;
    }

    // Merge behavior context
    if (behaviorContext) {
      context.recentBehavior = behaviorContext.signals;
      context.implicitPreferences = behaviorContext.preferences;
    }

    // Merge taste fingerprint
    if (tasteContext) {
      context.tasteFingerprint = tasteContext;
    }

    // Merge saved/visited
    if (savedVisitedContext) {
      context.savedPlaces = savedVisitedContext.saved;
      context.visitedPlaces = savedVisitedContext.visited;
    }

    // Merge knowledge graph context
    if (knowledgeContext) {
      context.relatedArchitects = knowledgeContext.architects;
      context.relatedMovements = knowledgeContext.movements;
    }

    return context;
  }

  // ============================================
  // E: TRIP-AWARE CONTEXT
  // ============================================

  private async fetchTripContext(userId: string): Promise<{
    activeTrip: ActiveTripContext | null;
    upcomingTrips: TripSummary[];
  } | null> {
    if (!this.supabase) return null;

    try {
      // Get all user trips
      const { data: trips } = await this.supabase
        .from('trips')
        .select(`
          id, title, destination, start_date, end_date, status,
          itinerary_items (id, day, order_index, time, title, description, destination_slug)
        `)
        .eq('user_id', userId)
        .order('start_date', { ascending: true });

      if (!trips || trips.length === 0) {
        return { activeTrip: null, upcomingTrips: [] };
      }

      const now = new Date();
      let activeTrip: ActiveTripContext | null = null;
      const upcomingTrips: TripSummary[] = [];

      for (const trip of trips) {
        const startDate = trip.start_date ? new Date(trip.start_date) : null;
        const endDate = trip.end_date ? new Date(trip.end_date) : null;

        // Check if this is the active trip (ongoing or soonest upcoming)
        const isOngoing = startDate && endDate && now >= startDate && now <= endDate;
        const isPlanning = trip.status === 'planning';

        if ((isOngoing || isPlanning) && !activeTrip) {
          // Parse destinations
          let destinations: string[] = [];
          if (trip.destination) {
            try {
              destinations = JSON.parse(trip.destination);
            } catch {
              destinations = [trip.destination];
            }
          }

          // Calculate schedule gaps
          const items = (trip.itinerary_items || []).sort((a: any, b: any) => {
            const dayDiff = (a.day || 0) - (b.day || 0);
            return dayDiff !== 0 ? dayDiff : (a.order_index || 0) - (b.order_index || 0);
          });

          const gaps = this.calculateScheduleGaps(items);

          activeTrip = {
            id: trip.id,
            name: trip.title,
            destinations,
            startDate: trip.start_date,
            endDate: trip.end_date,
            status: trip.status,
            itineraryItems: items.map((item: any) => ({
              id: item.id,
              day: item.day,
              time: item.time,
              title: item.title,
              category: item.description,
              destinationSlug: item.destination_slug,
            })),
            gaps,
          };
        } else if (startDate && startDate > now) {
          // Upcoming trip
          const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          upcomingTrips.push({
            id: trip.id,
            name: trip.title,
            destination: trip.destination || '',
            startDate: trip.start_date,
            daysUntil,
          });
        }
      }

      return { activeTrip, upcomingTrips: upcomingTrips.slice(0, 3) };
    } catch (error) {
      console.error('Error fetching trip context:', error);
      return null;
    }
  }

  private calculateScheduleGaps(items: any[]): ScheduleGap[] {
    const gaps: ScheduleGap[] = [];
    const dayGroups = new Map<number, any[]>();

    // Group items by day
    for (const item of items) {
      const day = item.day || 1;
      if (!dayGroups.has(day)) {
        dayGroups.set(day, []);
      }
      dayGroups.get(day)!.push(item);
    }

    // Find gaps in each day
    for (const [day, dayItems] of dayGroups) {
      const timeSlots = [
        { type: 'morning' as const, start: '08:00', end: '11:00' },
        { type: 'lunch' as const, start: '11:00', end: '14:00' },
        { type: 'afternoon' as const, start: '14:00', end: '17:00' },
        { type: 'dinner' as const, start: '17:00', end: '21:00' },
        { type: 'evening' as const, start: '21:00', end: '23:59' },
      ];

      for (const slot of timeSlots) {
        const hasItemInSlot = dayItems.some((item: any) => {
          if (!item.time) return false;
          const itemTime = item.time.substring(0, 5);
          return itemTime >= slot.start && itemTime < slot.end;
        });

        if (!hasItemInSlot && dayItems.length > 0) {
          // This slot is empty
          const startMinutes = parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]);
          const endMinutes = parseInt(slot.end.split(':')[0]) * 60 + parseInt(slot.end.split(':')[1]);

          gaps.push({
            day,
            type: slot.type,
            startTime: slot.start,
            endTime: slot.end,
            durationMinutes: endMinutes - startMinutes,
          });
        }
      }
    }

    return gaps;
  }

  // ============================================
  // A: DEEP MEMORY
  // ============================================

  private async fetchConversationContext(sessionId: string, userId: string): Promise<{
    summary: string | null;
    insights: string[];
    recentQueries: string[];
  } | null> {
    try {
      // Get current session context
      const sessionHistory = await extendedConversationMemoryService.getConversationHistory(sessionId, 20, true);

      // Get cross-session insights
      const crossSession = await extendedConversationMemoryService.getCrossSessionContext(userId, 5);

      const insights: string[] = [];
      const recentQueries: string[] = [];

      // Extract insights from cross-session data
      for (const session of crossSession) {
        if (session.summary) {
          insights.push(session.summary);
        }
      }

      // Extract recent queries from current session
      if (sessionHistory?.messages) {
        for (const msg of sessionHistory.messages) {
          if (msg.role === 'user') {
            recentQueries.push(msg.content);
          }
        }
      }

      return {
        summary: sessionHistory?.summary || null,
        insights: insights.slice(0, 5),
        recentQueries: recentQueries.slice(-5),
      };
    } catch (error) {
      console.error('Error fetching conversation context:', error);
      return null;
    }
  }

  // ============================================
  // F: BEHAVIORAL INTELLIGENCE
  // ============================================

  private async fetchBehaviorContext(userId: string): Promise<{
    signals: BehaviorSignal[];
    preferences: ImplicitPreference[];
  } | null> {
    if (!this.supabase) return null;

    try {
      // Get recent interactions
      const { data: interactions } = await this.supabase
        .from('user_interactions')
        .select('interaction_type, destination_id, context, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const signals: BehaviorSignal[] = (interactions || []).map((i: any) => ({
        type: i.interaction_type as BehaviorSignal['type'],
        destinationId: i.destination_id,
        timestamp: new Date(i.created_at),
        metadata: i.context,
      }));

      // Analyze implicit preferences from behavior
      const preferences = await this.inferPreferencesFromBehavior(signals, userId);

      return { signals, preferences };
    } catch (error) {
      console.error('Error fetching behavior context:', error);
      return null;
    }
  }

  private async inferPreferencesFromBehavior(
    signals: BehaviorSignal[],
    userId: string
  ): Promise<ImplicitPreference[]> {
    const preferences: ImplicitPreference[] = [];

    if (signals.length < 3) return preferences;

    // Get destination details for signals
    const destIds = signals.filter(s => s.destinationId).map(s => s.destinationId);
    if (destIds.length === 0) return preferences;

    const { data: destinations } = await this.supabase
      .from('destinations')
      .select('id, category, city, price_level, michelin_stars, vibe_tags')
      .in('id', destIds);

    if (!destinations) return preferences;

    const destMap = new Map(destinations.map((d: any) => [d.id, d]));

    // Analyze patterns
    const savedDests = signals.filter(s => s.type === 'save').map(s => destMap.get(s.destinationId)).filter(Boolean);
    const viewedDests = signals.filter(s => s.type === 'view').map(s => destMap.get(s.destinationId)).filter(Boolean);

    // Price preference (saves at higher price = higher price tolerance)
    const savedPrices = savedDests.map((d: any) => d.price_level).filter(Boolean);
    if (savedPrices.length >= 2) {
      const avgPrice = savedPrices.reduce((a: number, b: number) => a + b, 0) / savedPrices.length;
      preferences.push({
        dimension: 'price_tolerance',
        value: avgPrice / 4, // Normalize to 0-1
        confidence: Math.min(0.9, savedPrices.length * 0.15),
        source: 'behavior',
        evidence: [`Saved ${savedPrices.length} places with avg price level ${avgPrice.toFixed(1)}`],
      });
    }

    // Category preference
    const categoryCounts = new Map<string, number>();
    for (const dest of savedDests as any[]) {
      const cat = dest?.category;
      if (cat) {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      }
    }

    const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCategory && topCategory[1] >= 2) {
      preferences.push({
        dimension: 'preferred_category',
        value: topCategory[0],
        confidence: Math.min(0.9, topCategory[1] * 0.2),
        source: 'behavior',
        evidence: [`Saved ${topCategory[1]} ${topCategory[0]} places`],
      });
    }

    // Michelin preference
    const michelinSaves = savedDests.filter((d: any) => d.michelin_stars > 0).length;
    if (michelinSaves >= 2) {
      preferences.push({
        dimension: 'michelin_affinity',
        value: 'high',
        confidence: Math.min(0.9, michelinSaves * 0.25),
        source: 'behavior',
        evidence: [`Saved ${michelinSaves} Michelin-starred restaurants`],
      });
    }

    return preferences;
  }

  // ============================================
  // J: TASTE FINGERPRINT
  // ============================================

  private async fetchTasteFingerprint(userId: string): Promise<TasteFingerprint | null> {
    if (!this.supabase) return null;

    try {
      // Get taste profile from existing service
      const profile = await tasteProfileEvolutionService.getTasteProfile(userId);
      if (!profile) return null;

      // Get additional data for fingerprint
      const { data: saved } = await this.supabase
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', userId);

      const { data: visited } = await this.supabase
        .from('visited_places')
        .select('destination_slug, rating')
        .eq('user_id', userId);

      // Get destination details
      const allSlugs = [
        ...(saved || []).map((s: any) => s.destination_slug),
        ...(visited || []).map((v: any) => v.destination_slug),
      ].filter(Boolean);

      const { data: destinations } = await this.supabase
        .from('destinations')
        .select('slug, category, city, price_level, michelin_stars, vibe_tags, tags')
        .in('slug', allSlugs);

      if (!destinations || destinations.length === 0) {
        return this.buildDefaultFingerprint();
      }

      // Calculate fingerprint dimensions
      const fingerprint = this.calculateFingerprint(destinations, visited || []);

      return fingerprint;
    } catch (error) {
      console.error('Error fetching taste fingerprint:', error);
      return null;
    }
  }

  private calculateFingerprint(
    destinations: any[],
    visited: any[]
  ): TasteFingerprint {
    const n = destinations.length;
    if (n === 0) return this.buildDefaultFingerprint();

    // Calculate adventurousness (variety of categories + hidden gems)
    const categories = new Set(destinations.map(d => d.category).filter(Boolean));
    const hiddenGems = destinations.filter(d =>
      (d.vibe_tags || []).some((v: string) => v.toLowerCase().includes('hidden'))
    ).length;
    const adventurousness = Math.min(1, (categories.size / 8) * 0.5 + (hiddenGems / n) * 0.5);

    // Calculate price affinity
    const prices = destinations.map(d => d.price_level).filter(Boolean);
    const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 2;
    const priceAffinity = avgPrice / 4;

    // Calculate design sensitivity
    const designTags = destinations.filter(d => {
      const tags = [...(d.tags || []), ...(d.vibe_tags || [])];
      return tags.some((t: string) =>
        t.toLowerCase().includes('design') ||
        t.toLowerCase().includes('architecture') ||
        t.toLowerCase().includes('aesthetic')
      );
    }).length;
    const designSensitivity = Math.min(1, designTags / Math.max(n * 0.3, 1));

    // Calculate authenticity seeker
    const authenticTags = destinations.filter(d => {
      const tags = [...(d.tags || []), ...(d.vibe_tags || [])];
      return tags.some((t: string) =>
        t.toLowerCase().includes('local') ||
        t.toLowerCase().includes('authentic') ||
        t.toLowerCase().includes('traditional')
      );
    }).length;
    const authenticitySeeker = Math.min(1, authenticTags / Math.max(n * 0.3, 1));

    // Calculate social energy
    const livelyCounts = destinations.filter(d => {
      const vibes = d.vibe_tags || [];
      return vibes.some((v: string) =>
        v.toLowerCase().includes('lively') ||
        v.toLowerCase().includes('buzzy') ||
        v.toLowerCase().includes('vibrant')
      );
    }).length;
    const quietCounts = destinations.filter(d => {
      const vibes = d.vibe_tags || [];
      return vibes.some((v: string) =>
        v.toLowerCase().includes('quiet') ||
        v.toLowerCase().includes('peaceful') ||
        v.toLowerCase().includes('intimate')
      );
    }).length;
    const socialEnergy = (livelyCounts + quietCounts) > 0
      ? livelyCounts / (livelyCounts + quietCounts)
      : 0.5;

    // Category affinities
    const categoryAffinities: Record<string, number> = {};
    const categoryCounts = new Map<string, number>();
    for (const d of destinations) {
      if (d.category) {
        categoryCounts.set(d.category, (categoryCounts.get(d.category) || 0) + 1);
      }
    }
    for (const [cat, count] of categoryCounts) {
      categoryAffinities[cat] = count / n;
    }

    // City familiarity
    const cityFamiliarity: Record<string, 'newcomer' | 'familiar' | 'expert'> = {};
    const cityCounts = new Map<string, number>();
    for (const d of destinations) {
      if (d.city) {
        cityCounts.set(d.city, (cityCounts.get(d.city) || 0) + 1);
      }
    }
    for (const [city, count] of cityCounts) {
      if (count >= 10) cityFamiliarity[city] = 'expert';
      else if (count >= 4) cityFamiliarity[city] = 'familiar';
      else cityFamiliarity[city] = 'newcomer';
    }

    return {
      adventurousness,
      priceAffinity,
      designSensitivity,
      authenticitySeeker,
      socialEnergy,
      categoryAffinities,
      cuisineAffinities: {}, // Would need cuisine data
      cityFamiliarity,
      preferredMealTimes: {},
      computedAt: new Date(),
      confidence: Math.min(0.9, n * 0.05),
    };
  }

  private buildDefaultFingerprint(): TasteFingerprint {
    return {
      adventurousness: 0.5,
      priceAffinity: 0.5,
      designSensitivity: 0.5,
      authenticitySeeker: 0.5,
      socialEnergy: 0.5,
      categoryAffinities: {},
      cuisineAffinities: {},
      cityFamiliarity: {},
      preferredMealTimes: {},
      computedAt: new Date(),
      confidence: 0,
    };
  }

  private async fetchSavedVisitedContext(userId: string): Promise<{
    saved: SavedPlace[];
    visited: VisitedPlace[];
  } | null> {
    if (!this.supabase) return null;

    try {
      const { data: saved } = await this.supabase
        .from('saved_places')
        .select('destination_slug, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: visited } = await this.supabase
        .from('visited_places')
        .select('destination_slug, visited_at, rating')
        .eq('user_id', userId)
        .order('visited_at', { ascending: false })
        .limit(20);

      // Get destination details
      const allSlugs = [
        ...(saved || []).map((s: any) => s.destination_slug),
        ...(visited || []).map((v: any) => v.destination_slug),
      ].filter(Boolean);

      if (allSlugs.length === 0) {
        return { saved: [], visited: [] };
      }

      const { data: destinations } = await this.supabase
        .from('destinations')
        .select('id, slug, name, city, category')
        .in('slug', allSlugs);

      const destMap = new Map<string, any>((destinations || []).map((d: any) => [d.slug, d]));

      const savedPlaces: SavedPlace[] = (saved || [])
        .map((s: any) => {
          const dest = destMap.get(s.destination_slug);
          if (!dest) return null;
          return {
            id: dest.id,
            slug: dest.slug,
            name: dest.name,
            city: dest.city,
            category: dest.category,
            savedAt: new Date(s.created_at),
          };
        })
        .filter(Boolean) as SavedPlace[];

      const visitedPlaces: VisitedPlace[] = (visited || [])
        .map((v: any) => {
          const dest = destMap.get(v.destination_slug);
          if (!dest) return null;
          return {
            id: dest.id,
            slug: dest.slug,
            name: dest.name,
            city: dest.city,
            category: dest.category,
            visitedAt: new Date(v.visited_at),
            rating: v.rating,
          };
        })
        .filter(Boolean) as VisitedPlace[];

      return { saved: savedPlaces, visited: visitedPlaces };
    } catch (error) {
      console.error('Error fetching saved/visited context:', error);
      return null;
    }
  }

  // ============================================
  // G: KNOWLEDGE GRAPH NAVIGATION
  // ============================================

  private async fetchKnowledgeContext(city: string): Promise<{
    architects: ArchitectContext[];
    movements: MovementContext[];
  } | null> {
    if (!this.supabase) return null;

    try {
      // Get architects with destinations in this city
      const { data: architects } = await this.supabase
        .from('architects')
        .select(`
          id, name,
          destinations!inner (id, city)
        `)
        .ilike('destinations.city', `%${city}%`)
        .limit(5);

      // Get movements with destinations in this city
      const { data: movements } = await this.supabase
        .from('movements')
        .select(`
          id, name, period,
          destinations!inner (id, city)
        `)
        .ilike('destinations.city', `%${city}%`)
        .limit(5);

      return {
        architects: (architects || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          destinationCount: a.destinations?.length || 0,
        })),
        movements: (movements || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          period: m.period || '',
          destinationCount: m.destinations?.length || 0,
        })),
      };
    } catch (error) {
      console.error('Error fetching knowledge context:', error);
      return null;
    }
  }

  // ============================================
  // B: REASONING ENGINE
  // ============================================

  async reason(
    query: string,
    context: UnifiedContext
  ): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];
    const suggestedActions: AutonomousAction[] = [];

    // Step 1: Understand the query
    steps.push({
      step: 1,
      thought: `Analyzing query: "${query}"`,
    });

    // Step 2: Check trip context
    if (context.activeTrip) {
      steps.push({
        step: 2,
        thought: `User has active trip to ${context.activeTrip.destinations.join(', ')}`,
        action: 'Prioritize destinations in trip locations',
      });

      // Check for gaps
      if (context.activeTrip.gaps.length > 0) {
        const gap = context.activeTrip.gaps[0];
        steps.push({
          step: 3,
          thought: `Found schedule gap on Day ${gap.day} (${gap.type}: ${gap.startTime}-${gap.endTime})`,
          action: 'Can suggest activities to fill this gap',
        });

        suggestedActions.push({
          type: 'add_to_trip',
          params: { tripId: context.activeTrip.id, day: gap.day, time: gap.startTime },
          description: `Add to ${context.activeTrip.name} (Day ${gap.day}, ${gap.type})`,
          requiresConfirmation: true,
        });
      }
    }

    // Step 3: Apply taste fingerprint
    if (context.tasteFingerprint && context.tasteFingerprint.confidence > 0.3) {
      const fp = context.tasteFingerprint;
      const insights: string[] = [];

      if (fp.priceAffinity > 0.7) {
        insights.push('prefers upscale venues');
      } else if (fp.priceAffinity < 0.3) {
        insights.push('prefers budget-friendly options');
      }

      if (fp.adventurousness > 0.7) {
        insights.push('loves discovering hidden gems');
      }

      if (fp.designSensitivity > 0.7) {
        insights.push('appreciates great design');
      }

      if (insights.length > 0) {
        steps.push({
          step: steps.length + 1,
          thought: `Based on taste profile: user ${insights.join(', ')}`,
          action: 'Apply personalization filters',
        });
      }
    }

    // Step 4: Check behavior patterns
    if (context.implicitPreferences.length > 0) {
      const topPref = context.implicitPreferences[0];
      steps.push({
        step: steps.length + 1,
        thought: `Implicit preference detected: ${topPref.dimension} = ${topPref.value} (${(topPref.confidence * 100).toFixed(0)}% confidence)`,
        result: topPref.evidence[0],
      });
    }

    // Generate conclusion
    const conclusion = this.generateReasoningConclusion(steps, context, query);

    return {
      steps,
      conclusion,
      confidence: Math.min(0.9, 0.3 + steps.length * 0.1),
      suggestedActions,
    };
  }

  private generateReasoningConclusion(
    steps: ReasoningStep[],
    context: UnifiedContext,
    query: string
  ): string {
    const parts: string[] = [];

    if (context.activeTrip) {
      parts.push(`contextualizing for ${context.activeTrip.name}`);
    }

    if (context.tasteFingerprint && context.tasteFingerprint.confidence > 0.3) {
      parts.push('applying taste preferences');
    }

    if (context.implicitPreferences.length > 0) {
      parts.push('using behavioral insights');
    }

    if (parts.length === 0) {
      return `Processing query with standard search.`;
    }

    return `Enhanced search: ${parts.join(', ')}.`;
  }

  // ============================================
  // H: AUTONOMOUS ACTIONS
  // ============================================

  async executeAction(
    action: AutonomousAction,
    userId: string
  ): Promise<ActionResult> {
    if (!this.supabase || !userId) {
      return {
        success: false,
        action,
        message: 'Not authenticated',
      };
    }

    try {
      switch (action.type) {
        case 'save_place':
          return await this.executeSavePlace(action, userId);

        case 'add_to_trip':
          return await this.executeAddToTrip(action, userId);

        case 'mark_visited':
          return await this.executeMarkVisited(action, userId);

        case 'create_itinerary':
          return await this.executeCreateItinerary(action, userId);

        default:
          return {
            success: false,
            action,
            message: `Unknown action type: ${action.type}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        action,
        message: error.message || 'Action failed',
      };
    }
  }

  private async executeSavePlace(action: AutonomousAction, userId: string): Promise<ActionResult> {
    const { destinationSlug } = action.params;

    const { error } = await this.supabase
      .from('saved_places')
      .upsert({
        user_id: userId,
        destination_slug: destinationSlug,
      }, { onConflict: 'user_id,destination_slug' });

    if (error) throw error;

    return {
      success: true,
      action,
      message: `Saved to your places`,
    };
  }

  private async executeAddToTrip(action: AutonomousAction, userId: string): Promise<ActionResult> {
    const { tripId, destinationSlug, day, time, title } = action.params;

    // Get max order_index for this day
    const { data: existing } = await this.supabase
      .from('itinerary_items')
      .select('order_index')
      .eq('trip_id', tripId)
      .eq('day', day || 1)
      .order('order_index', { ascending: false })
      .limit(1);

    const orderIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

    const { error } = await this.supabase
      .from('itinerary_items')
      .insert({
        trip_id: tripId,
        destination_slug: destinationSlug,
        day: day || 1,
        order_index: orderIndex,
        time: time || null,
        title: title || 'New item',
      });

    if (error) throw error;

    return {
      success: true,
      action,
      message: `Added to Day ${day || 1} of your trip`,
    };
  }

  private async executeMarkVisited(action: AutonomousAction, userId: string): Promise<ActionResult> {
    const { destinationSlug, rating } = action.params;

    const { error } = await this.supabase
      .from('visited_places')
      .upsert({
        user_id: userId,
        destination_slug: destinationSlug,
        visited_at: new Date().toISOString(),
        rating: rating || null,
      }, { onConflict: 'user_id,destination_slug' });

    if (error) throw error;

    return {
      success: true,
      action,
      message: `Marked as visited`,
    };
  }

  private async executeCreateItinerary(action: AutonomousAction, userId: string): Promise<ActionResult> {
    const { tripId, destinations } = action.params;

    // Create itinerary items from destinations
    const items = destinations.map((dest: any, index: number) => ({
      trip_id: tripId,
      destination_slug: dest.slug,
      day: dest.day || 1,
      order_index: index,
      time: dest.time || null,
      title: dest.name,
      description: dest.category,
    }));

    const { error } = await this.supabase
      .from('itinerary_items')
      .insert(items);

    if (error) throw error;

    return {
      success: true,
      action,
      message: `Created itinerary with ${destinations.length} items`,
      data: { itemCount: destinations.length },
    };
  }

  // ============================================
  // PUBLIC: QUERY WITH FULL INTELLIGENCE
  // ============================================

  /**
   * Process a query with full intelligence capabilities
   */
  async processIntelligentQuery(
    query: string,
    userId: string | null,
    sessionId: string,
    options: {
      includeReasoning?: boolean;
      currentCity?: string;
    } = {}
  ): Promise<{
    context: UnifiedContext;
    reasoning: ReasoningResult | null;
    suggestedActions: AutonomousAction[];
    contextualHints: string[];
  }> {
    // Build unified context
    const context = await this.buildUnifiedContext(userId, sessionId, {
      currentCity: options.currentCity,
    });

    // Run reasoning if requested
    let reasoning: ReasoningResult | null = null;
    if (options.includeReasoning) {
      reasoning = await this.reason(query, context);
    }

    // Generate contextual hints
    const contextualHints = this.generateContextualHints(context, query);

    // Collect all suggested actions
    const suggestedActions: AutonomousAction[] = [
      ...(reasoning?.suggestedActions || []),
    ];

    return {
      context,
      reasoning,
      suggestedActions,
      contextualHints,
    };
  }

  private generateContextualHints(context: UnifiedContext, query: string): string[] {
    const hints: string[] = [];

    // Trip-aware hints
    if (context.activeTrip) {
      hints.push(`You're planning ${context.activeTrip.name}`);

      if (context.activeTrip.gaps.length > 0) {
        const gap = context.activeTrip.gaps[0];
        hints.push(`Day ${gap.day} ${gap.type} is open`);
      }
    }

    // Upcoming trip hints
    if (context.upcomingTrips.length > 0) {
      const next = context.upcomingTrips[0];
      hints.push(`Trip to ${next.destination} in ${next.daysUntil} days`);
    }

    // Taste-based hints
    if (context.tasteFingerprint && context.tasteFingerprint.confidence > 0.3) {
      const fp = context.tasteFingerprint;
      if (fp.adventurousness > 0.7) {
        hints.push(`You love hidden gems`);
      }
    }

    return hints;
  }
}

export const unifiedIntelligenceCore = new UnifiedIntelligenceCore();
