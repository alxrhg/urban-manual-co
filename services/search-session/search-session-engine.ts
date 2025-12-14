/**
 * Unified SearchSession Engine
 *
 * Single pipeline that powers both guided search UI and chat interface.
 * Same intent/ranking/memory underneath, different presentation.
 *
 * Architecture:
 * 1. Session Management - Create/restore sessions with context
 * 2. Intent Parsing - Unified understanding of user input
 * 3. Search Execution - Three-tier search strategy
 * 4. Ranking - 8-factor personalized ranking
 * 5. Presentation Adapters - Format output for guided/chat modes
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateTextEmbedding } from '@/lib/ml/embeddings';
import { searchRankingAlgorithm, RankedResult } from '@/services/intelligence/search-ranking';
import { intentAnalysisService, EnhancedIntent } from '@/services/intelligence/intent-analysis';
import { extendedConversationMemoryService } from '@/services/intelligence/conversation-memory';
import { getSeasonalContext } from '@/services/seasonality';
import type { Destination } from '@/types/destination';
import {
  DEFAULT_GUIDED_CONFIG,
  DEFAULT_CHAT_CONFIG,
} from '@/types/search-session';
import type {
  SearchSession,
  SearchTurn,
  TurnInput,
  TurnOutput,
  ParsedIntent,
  RankedDestination,
  SessionContext,
  SearchFilters,
  GuidedPresentation,
  ChatPresentation,
  Suggestion,
  TripPlan,
  ClarificationRequest,
  SearchMetadata,
  PresentationMode,
  PresentationConfig,
  FilterChip,
  ProactiveAction,
  BehaviorSignal,
  RecommendationReasoning,
} from '@/types/search-session';

// ============================================
// SESSION STORE (In-memory cache + DB persistence)
// ============================================

const sessionCache = new Map<string, SearchSession>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================
// UNIFIED SEARCH SESSION ENGINE
// ============================================

export class SearchSessionEngine {
  private supabase: ReturnType<typeof createServiceRoleClient> | null = null;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch {
      this.supabase = null;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Get or create a session
   */
  async getOrCreateSession(
    sessionId: string | null,
    userId?: string,
    mode: PresentationMode = 'guided'
  ): Promise<{ session: SearchSession; isNew: boolean }> {
    // Check cache first
    if (sessionId && sessionCache.has(sessionId)) {
      const cached = sessionCache.get(sessionId)!;
      if (Date.now() - cached.lastActiveAt.getTime() < cached.expiresAfterMs) {
        return { session: cached, isNew: false };
      }
      sessionCache.delete(sessionId);
    }

    // Try to load from database
    if (sessionId && this.supabase) {
      const existing = await this.loadSessionFromDb(sessionId);
      if (existing) {
        sessionCache.set(sessionId, existing);
        return { session: existing, isNew: false };
      }
    }

    // Create new session
    const newSession = await this.createSession(userId, mode);
    sessionCache.set(newSession.id, newSession);
    return { session: newSession, isNew: true };
  }

  private async loadSessionFromDb(sessionId: string): Promise<SearchSession | null> {
    if (!this.supabase) return null;

    try {
      const { data: session } = await this.supabase
        .from('conversation_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) return null;

      // Load messages/turns
      const { data: messages } = await this.supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100);

      // Convert messages to turns
      const turns: SearchTurn[] = [];
      const messageList = messages || [];
      for (let i = 0; i < messageList.length; i += 2) {
        const userMsg = messageList[i];
        const assistantMsg = messageList[i + 1];
        if (userMsg && userMsg.role === 'user') {
          turns.push({
            id: userMsg.id,
            turnNumber: Math.floor(i / 2) + 1,
            timestamp: new Date(userMsg.created_at),
            input: {
              query: userMsg.content,
              type: 'text',
            },
            output: {
              intent: userMsg.intent_data || this.createEmptyIntent(userMsg.content),
              destinations: [],
              presentation: { type: 'chat', narrative: assistantMsg?.content || '', tone: 'friendly', hints: [] },
              suggestions: [],
              metadata: {
                searchTier: 'keyword-search',
                totalResults: 0,
                processingTime: 0,
                cached: false,
                enrichmentAvailable: false,
              },
            },
          });
        }
      }

      return {
        id: session.id,
        userId: session.user_id,
        mode: session.context?.mode || 'chat',
        turns,
        context: session.context || this.createEmptyContext(),
        createdAt: new Date(session.created_at),
        lastActiveAt: new Date(session.last_activity || session.created_at),
        expiresAfterMs: SESSION_TTL_MS,
      };
    } catch (error) {
      console.error('[SearchSession] Error loading session:', error);
      return null;
    }
  }

  private async createSession(userId?: string, mode: PresentationMode = 'guided'): Promise<SearchSession> {
    const id = `ss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    const session: SearchSession = {
      id,
      userId,
      mode,
      turns: [],
      context: this.createEmptyContext(),
      createdAt: now,
      lastActiveAt: now,
      expiresAfterMs: SESSION_TTL_MS,
    };

    // Load cross-session insights for logged-in users
    if (userId) {
      const previousSessions = await extendedConversationMemoryService.getCrossSessionContext(userId, 5);
      session.context.previousInsights = previousSessions
        .filter(s => s.summary)
        .map(s => s.summary)
        .slice(0, 3);
    }

    // Persist to database
    if (this.supabase) {
      try {
        await this.supabase.from('conversation_sessions').insert({
          id,
          user_id: userId,
          session_token: id,
          context: { ...session.context, mode },
          created_at: now.toISOString(),
          last_activity: now.toISOString(),
        });
      } catch (error) {
        console.error('[SearchSession] Error persisting session:', error);
      }
    }

    return session;
  }

  private createEmptyContext(): SessionContext {
    return {
      cities: [],
      isMultiCity: false,
      liked: [],
      disliked: [],
      saved: [],
      shown: [],
      inferred: {},
    };
  }

  private createEmptyIntent(query: string): ParsedIntent {
    return {
      query,
      keywords: query.split(/\s+/).filter(w => w.length > 2),
      enhanced: {
        primaryIntent: 'discover',
        queryComplexity: 'simple',
      },
      entities: {
        cities: [],
        categories: [],
        modifiers: [],
      },
      confidence: 0.5,
    };
  }

  // ============================================
  // MAIN PROCESSING
  // ============================================

  /**
   * Process a turn in the session
   */
  async processTurn(
    session: SearchSession,
    input: TurnInput,
    config: Partial<PresentationConfig> = {}
  ): Promise<TurnOutput> {
    const startTime = Date.now();
    const fullConfig = session.mode === 'guided'
      ? { ...DEFAULT_GUIDED_CONFIG, ...config }
      : { ...DEFAULT_CHAT_CONFIG, ...config };

    // 1. Parse intent
    const intent = await this.parseIntent(input, session);

    // 2. Check for clarification needs
    const clarification = this.checkClarificationNeeded(intent, session);
    if (clarification) {
      return this.buildClarificationResponse(intent, clarification, session, startTime);
    }

    // 3. Execute search
    const searchResults = await this.executeSearch(intent, session, fullConfig.maxDestinations);

    // 4. Rank results with personalization
    const rankedResults = await this.rankResults(
      searchResults.results,
      intent,
      session,
      fullConfig.showReasoning
    );

    // 5. Build suggestions
    const suggestions = this.buildSuggestions(intent, rankedResults, session);

    // 6. Build trip plan if detected
    const tripPlan = intent.tripPlanning?.detected
      ? await this.buildTripPlan(intent, rankedResults, session)
      : undefined;

    // 7. Build presentation (guided or chat)
    const presentation = session.mode === 'guided'
      ? this.buildGuidedPresentation(rankedResults, intent, session)
      : await this.buildChatPresentation(rankedResults, intent, session, fullConfig);

    // 8. Update session context
    this.updateSessionContext(session, intent, rankedResults);

    // 9. Build output
    const output: TurnOutput = {
      intent,
      destinations: rankedResults,
      presentation,
      suggestions,
      tripPlan,
      metadata: {
        searchTier: searchResults.tier,
        totalResults: searchResults.total,
        processingTime: Date.now() - startTime,
        cached: searchResults.cached,
        enrichmentAvailable: rankedResults.some(r => r.enrichment !== undefined),
      },
    };

    // 10. Create and store turn
    const turn: SearchTurn = {
      id: `turn-${Date.now()}`,
      turnNumber: session.turns.length + 1,
      timestamp: new Date(),
      input,
      output,
    };
    session.turns.push(turn);
    session.lastActiveAt = new Date();

    // 11. Persist to database
    await this.persistTurn(session, turn);

    return output;
  }

  // ============================================
  // INTENT PARSING
  // ============================================

  private async parseIntent(input: TurnInput, session: SessionContext | SearchSession): Promise<ParsedIntent> {
    const sessionContext = 'context' in session ? session.context : session;
    const conversationHistory = 'turns' in session
      ? session.turns.map(t => ({ role: 'user' as const, content: t.input.query }))
      : [];

    // Get enhanced intent from service
    const enhanced = await intentAnalysisService.analyzeIntent(
      input.query,
      conversationHistory,
      'userId' in session ? session.userId : undefined
    );

    // Extract entities via LLM or rules
    const entities = await this.extractEntities(input.query, sessionContext, enhanced);

    // Detect trip planning
    const tripPlanning = this.detectTripPlanning(input.query, enhanced);

    // Handle reference resolution
    const reference = this.resolveReference(input.query, sessionContext);

    return {
      query: input.query,
      keywords: input.query.split(/\s+/).filter(w => w.length > 2),
      enhanced,
      entities,
      tripPlanning,
      reference,
      confidence: enhanced.queryComplexity === 'simple' ? 0.9 : 0.7,
    };
  }

  private async extractEntities(
    query: string,
    context: SessionContext,
    enhanced: EnhancedIntent
  ): Promise<ParsedIntent['entities']> {
    const lowerQuery = query.toLowerCase();

    // Common cities
    const knownCities = [
      'tokyo', 'paris', 'london', 'new york', 'berlin', 'barcelona', 'rome',
      'amsterdam', 'vienna', 'prague', 'lisbon', 'miami', 'los angeles',
      'san francisco', 'copenhagen', 'stockholm', 'oslo', 'seoul', 'singapore',
    ];

    // Common categories
    const knownCategories = [
      'restaurant', 'cafe', 'hotel', 'bar', 'museum', 'gallery', 'culture',
      'shop', 'spa', 'rooftop', 'bakery', 'cocktail',
    ];

    const cities = knownCities.filter(c => lowerQuery.includes(c));
    const categories = knownCategories.filter(c => lowerQuery.includes(c));

    // Modifiers
    const modifiers: string[] = [];
    if (lowerQuery.includes('budget') || lowerQuery.includes('cheap')) modifiers.push('budget');
    if (lowerQuery.includes('luxury') || lowerQuery.includes('upscale')) modifiers.push('luxury');
    if (lowerQuery.includes('romantic')) modifiers.push('romantic');
    if (lowerQuery.includes('design') || lowerQuery.includes('architecture')) modifiers.push('design');
    if (lowerQuery.includes('local') || lowerQuery.includes('hidden gem')) modifiers.push('local');
    if (lowerQuery.includes('michelin')) modifiers.push('michelin');
    if (lowerQuery.includes('rooftop')) modifiers.push('rooftop');
    if (lowerQuery.includes('outdoor') || lowerQuery.includes('terrace')) modifiers.push('outdoor');

    // Carry forward from context for follow-ups
    const isFollowUp = this.isFollowUp(query);
    const finalCities = cities.length > 0 ? cities : (isFollowUp && context.currentCity ? [context.currentCity] : []);
    const finalCategories = categories.length > 0 ? categories : (isFollowUp && context.currentCategory ? [context.currentCategory] : []);

    // Price level extraction
    let priceLevel: number | undefined;
    if (modifiers.includes('budget')) priceLevel = 2;
    else if (modifiers.includes('luxury')) priceLevel = 4;

    // Michelin stars
    let michelinStars: number | undefined;
    if (modifiers.includes('michelin')) {
      const match = lowerQuery.match(/(\d)\s*star/);
      michelinStars = match ? parseInt(match[1]) : 1;
    }

    return {
      cities: finalCities,
      categories: finalCategories,
      modifiers,
      priceLevel,
      michelinStars,
    };
  }

  private detectTripPlanning(query: string, enhanced: EnhancedIntent): ParsedIntent['tripPlanning'] {
    const lowerQuery = query.toLowerCase();

    // Trip planning patterns
    const tripPatterns = [
      /(\d+)\s*(day|night)s?\s*(in|trip|itinerary)/i,
      /plan\s*(my|a|the)?\s*(trip|weekend|vacation|visit)/i,
      /itinerary\s*for\s*(\d+)/i,
      /weekend\s*(in|trip|getaway)/i,
    ];

    const isTripPlanning = tripPatterns.some(p => p.test(query)) ||
      enhanced.primaryIntent === 'plan';

    if (!isTripPlanning) return { detected: false };

    // Extract days
    const daysMatch = query.match(/(\d+)\s*(day|night)/i);
    const days = daysMatch ? parseInt(daysMatch[1]) : (lowerQuery.includes('weekend') ? 2 : 3);

    // Extract styles
    const styles: string[] = [];
    if (lowerQuery.includes('food') || lowerQuery.includes('culinary')) styles.push('food');
    if (lowerQuery.includes('architecture') || lowerQuery.includes('design')) styles.push('architecture');
    if (lowerQuery.includes('art') || lowerQuery.includes('museum')) styles.push('culture');
    if (lowerQuery.includes('nightlife') || lowerQuery.includes('bar')) styles.push('nightlife');
    if (lowerQuery.includes('romantic')) styles.push('romantic');

    return {
      detected: true,
      days,
      style: styles.length > 0 ? styles : undefined,
    };
  }

  private resolveReference(query: string, context: SessionContext): ParsedIntent['reference'] {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.match(/\b(more|another|similar|like that)\b/)) {
      return { type: 'more_like', target: 'previous_results' };
    }
    if (lowerQuery.match(/\b(saved|bookmarked|my list)\b/)) {
      return { type: 'saved_items' };
    }
    if (lowerQuery.match(/\b(compare|vs|versus|or)\b/)) {
      return { type: 'comparison' };
    }

    return undefined;
  }

  private isFollowUp(query: string): boolean {
    const patterns = [
      /^(more|another|similar|like that)/i,
      /\b(but\s+(cheaper|nicer|better|different))/i,
      /\b(more\s+(budget|affordable|expensive))/i,
      /^(show me more|what else|any other)/i,
    ];
    return patterns.some(p => p.test(query));
  }

  // ============================================
  // SEARCH EXECUTION
  // ============================================

  private async executeSearch(
    intent: ParsedIntent,
    session: SearchSession,
    limit: number
  ): Promise<{ results: Destination[]; tier: SearchMetadata['searchTier']; total: number; cached: boolean }> {
    if (!this.supabase) {
      return { results: [], tier: 'keyword-search', total: 0, cached: false };
    }

    try {
      // Build query
      let query = this.supabase
        .from('destinations')
        .select('*', { count: 'exact' })
        .is('parent_destination_id', null)
        .limit(limit * 2);

      // Apply filters from intent
      const city = intent.entities.cities[0];
      const category = intent.entities.categories[0];

      if (city) {
        query = query.ilike('city', `%${city}%`);
      }
      if (category) {
        query = query.ilike('category', `%${category}%`);
      }
      if (intent.entities.priceLevel) {
        query = query.lte('price_level', intent.entities.priceLevel);
      }
      if (intent.entities.michelinStars) {
        query = query.gte('michelin_stars', intent.entities.michelinStars);
      }

      // Keyword search across multiple fields
      if (intent.keywords.length > 0 && !city && !category) {
        const searchConditions = intent.keywords.flatMap(kw => [
          `name.ilike.%${kw}%`,
          `description.ilike.%${kw}%`,
          `micro_description.ilike.%${kw}%`,
        ]).join(',');
        query = query.or(searchConditions);
      }

      const { data: results, count, error } = await query;
      if (error) throw error;

      let finalResults = results || [];

      // Filter out already shown for follow-ups (variety)
      if (intent.reference?.type === 'more_like' && session.context.shown.length > 0) {
        const shownSet = new Set(session.context.shown);
        finalResults = finalResults.filter(d => !shownSet.has(d.slug));
      }

      return {
        results: finalResults.slice(0, limit),
        tier: 'keyword-search',
        total: count || finalResults.length,
        cached: false,
      };
    } catch (error) {
      console.error('[SearchSession] Search error:', error);
      return { results: [], tier: 'keyword-search', total: 0, cached: false };
    }
  }

  // ============================================
  // RANKING
  // ============================================

  private async rankResults(
    results: Destination[],
    intent: ParsedIntent,
    session: SearchSession,
    includeReasoning: boolean
  ): Promise<RankedDestination[]> {
    if (results.length === 0) return [];

    // Use existing ranking algorithm
    const ranked = await searchRankingAlgorithm.rankResults(
      results,
      intent.query,
      session.userId,
      {
        city: intent.entities.cities[0],
        category: intent.entities.categories[0],
        modifiers: intent.entities.modifiers,
      }
    );

    // Convert to our type
    return ranked.map((r: RankedResult) => ({
      destination: r.destination,
      score: r.score,
      factors: r.factors,
      reasoning: includeReasoning ? {
        primaryReason: r.explanation,
        factors: this.buildReasoningFactors(r),
        matchScore: r.score,
      } : undefined,
    }));
  }

  private buildReasoningFactors(ranked: RankedResult): RecommendationReasoning['factors'] {
    const factors: RecommendationReasoning['factors'] = [];

    if (ranked.factors.personalization > 0.5) {
      factors.push({
        type: 'taste',
        description: 'Matches your preferences',
        strength: ranked.factors.personalization > 0.7 ? 'strong' : 'moderate',
      });
    }
    if (ranked.factors.quality > 0.7) {
      factors.push({
        type: 'popular',
        description: 'Highly rated',
        strength: 'strong',
      });
    }
    if (ranked.factors.trending > 0.6) {
      factors.push({
        type: 'popular',
        description: 'Trending now',
        strength: 'moderate',
      });
    }
    if (ranked.factors.intentMatch > 0.7) {
      factors.push({
        type: 'similar',
        description: 'Great match for your search',
        strength: 'strong',
      });
    }

    return factors.length > 0 ? factors : [{
      type: 'similar',
      description: 'Recommended for you',
      strength: 'moderate',
    }];
  }

  // ============================================
  // CLARIFICATION
  // ============================================

  private checkClarificationNeeded(intent: ParsedIntent, session: SearchSession): ClarificationRequest | null {
    // Ambiguous city
    if (intent.entities.cities.length > 1) {
      return {
        question: 'Which city would you like to explore?',
        reason: 'Multiple cities mentioned',
        options: intent.entities.cities.map(city => ({
          id: city,
          label: city.charAt(0).toUpperCase() + city.slice(1),
          value: city,
        })),
        allowFreeText: true,
      };
    }

    // Very low confidence without context
    if (intent.confidence < 0.4 && session.turns.length === 0) {
      return {
        question: 'What type of place are you looking for?',
        reason: 'Help me understand your needs better',
        options: [
          { id: 'restaurant', label: 'Restaurant', value: 'restaurant', description: 'Fine dining, casual, cafes' },
          { id: 'hotel', label: 'Hotel', value: 'hotel', description: 'Places to stay' },
          { id: 'bar', label: 'Bar', value: 'bar', description: 'Cocktails, wine, nightlife' },
          { id: 'culture', label: 'Culture', value: 'culture', description: 'Museums, galleries, landmarks' },
        ],
        allowFreeText: true,
      };
    }

    return null;
  }

  private buildClarificationResponse(
    intent: ParsedIntent,
    clarification: ClarificationRequest,
    session: SearchSession,
    startTime: number
  ): TurnOutput {
    const presentation: ChatPresentation = {
      type: 'chat',
      narrative: clarification.question,
      tone: 'friendly',
      hints: [clarification.reason],
    };

    return {
      intent,
      destinations: [],
      presentation,
      suggestions: clarification.options.map((opt, i) => ({
        id: opt.id,
        type: 'filter',
        label: opt.label,
        query: opt.value,
        priority: i,
      })),
      needsClarification: true,
      clarification,
      metadata: {
        searchTier: 'keyword-search',
        totalResults: 0,
        processingTime: Date.now() - startTime,
        cached: false,
        enrichmentAvailable: false,
      },
    };
  }

  // ============================================
  // SUGGESTIONS
  // ============================================

  private buildSuggestions(
    intent: ParsedIntent,
    results: RankedDestination[],
    session: SearchSession
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];
    let priority = 0;

    // Category refinement
    if (results.length > 3) {
      const categories = [...new Set(results.map(r => r.destination.category).filter(Boolean))];
      if (categories.length > 1) {
        suggestions.push({
          id: 'refine-category',
          type: 'refine',
          label: `Just ${categories[0]}s`,
          query: categories[0],
          icon: 'filter',
          priority: priority++,
        });
      }
    }

    // Price suggestions
    const hasExpensive = results.some(r => (r.destination.price_level || 0) >= 3);
    if (hasExpensive) {
      suggestions.push({
        id: 'budget',
        type: 'refine',
        label: 'More affordable',
        query: 'budget option',
        icon: 'dollar',
        priority: priority++,
      });
    }

    // Expand suggestions
    const city = intent.entities.cities[0];
    if (results.length < 5 && city) {
      suggestions.push({
        id: 'expand-city',
        type: 'expand',
        label: `All in ${city}`,
        query: `places in ${city}`,
        icon: 'map',
        priority: priority++,
      });
    }

    // Related suggestions
    if (results.length > 0 && !intent.tripPlanning?.detected) {
      const topCategory = results[0].destination.category;
      if (topCategory === 'restaurant') {
        suggestions.push({
          id: 'related-bar',
          type: 'related',
          label: 'Nearby bars',
          query: `bars near ${city || 'here'}`,
          icon: 'cocktail',
          priority: priority++,
        });
      }
    }

    // Trip planning suggestion
    if (city && !intent.tripPlanning?.detected && session.turns.length >= 2) {
      suggestions.push({
        id: 'trip',
        type: 'trip',
        label: `Plan a ${city} trip`,
        query: `3 day trip to ${city}`,
        icon: 'calendar',
        priority: priority++,
      });
    }

    // Saved items
    if (session.context.saved.length > 0) {
      suggestions.push({
        id: 'saved',
        type: 'saved',
        label: `Your saved places (${session.context.saved.length})`,
        action: { type: 'show_saved' },
        icon: 'heart',
        priority: priority++,
      });
    }

    return suggestions.slice(0, 5);
  }

  // ============================================
  // PRESENTATION ADAPTERS
  // ============================================

  /**
   * Build guided presentation (chips, cards, questions)
   */
  private buildGuidedPresentation(
    results: RankedDestination[],
    intent: ParsedIntent,
    session: SearchSession
  ): GuidedPresentation {
    // Build filter chips
    const filterChips: FilterChip[] = [];
    let chipId = 0;

    // Category chips
    const categories = [...new Set(results.map(r => r.destination.category).filter(Boolean))];
    categories.slice(0, 4).forEach(cat => {
      filterChips.push({
        id: `chip-${chipId++}`,
        label: cat,
        type: 'category',
        value: cat,
        count: results.filter(r => r.destination.category === cat).length,
      });
    });

    // Price chips
    filterChips.push(
      { id: `chip-${chipId++}`, label: '$', type: 'price', value: 1 },
      { id: `chip-${chipId++}`, label: '$$', type: 'price', value: 2 },
      { id: `chip-${chipId++}`, label: '$$$', type: 'price', value: 3 },
      { id: `chip-${chipId++}`, label: '$$$$', type: 'price', value: 4 }
    );

    // Quick filter chips
    filterChips.push(
      { id: `chip-${chipId++}`, label: 'Highly rated', type: 'quick', value: { rating: 4.5 } },
      { id: `chip-${chipId++}`, label: 'Michelin', type: 'quick', value: { michelin: true } }
    );

    // Group by category
    const groups = categories.map(cat => ({
      id: `group-${cat}`,
      title: cat,
      destinationSlugs: results
        .filter(r => r.destination.category === cat)
        .map(r => r.destination.slug),
    }));

    // Stats
    const stats = {
      total: results.length,
      byCategory: categories.reduce((acc, cat) => {
        acc[cat] = results.filter(r => r.destination.category === cat).length;
        return acc;
      }, {} as Record<string, number>),
    };

    // Featured destination (highest score)
    const featured = results.length > 0 ? results[0].destination.slug : undefined;

    return {
      type: 'guided',
      filterChips,
      groups,
      stats,
      featured,
    };
  }

  /**
   * Build chat presentation (narrative, conversational)
   */
  private async buildChatPresentation(
    results: RankedDestination[],
    intent: ParsedIntent,
    session: SearchSession,
    config: PresentationConfig
  ): Promise<ChatPresentation> {
    // Generate narrative
    const narrative = await this.generateNarrative(results, intent, session);

    // Build hints
    const hints: string[] = [];
    if (intent.reference?.type === 'more_like') {
      hints.push('Showing new recommendations based on your previous search');
    }
    if (session.context.saved.length > 0) {
      hints.push(`You have ${session.context.saved.length} saved places`);
    }

    // Proactive actions
    const proactiveActions: ProactiveAction[] = [];
    if (results.length >= 3) {
      proactiveActions.push({
        id: 'save-all',
        type: 'save_all',
        label: 'Save all to list',
        description: `Save these ${results.length} places`,
      });
    }
    if (intent.tripPlanning?.detected) {
      proactiveActions.push({
        id: 'create-trip',
        type: 'create_trip',
        label: 'Create trip from this',
        description: 'Turn into a bookable itinerary',
      });
    }

    // Seasonal context
    const city = intent.entities.cities[0];
    let seasonalContext: ChatPresentation['seasonalContext'];
    if (city) {
      try {
        const context = getSeasonalContext(city);
        if (context) {
          const now = new Date();
          const isActive = now >= context.start && now <= context.end;
          const daysUntil = !isActive
            ? Math.ceil((context.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

          seasonalContext = {
            event: context.event,
            description: context.text,
            isActive,
            daysUntil: daysUntil && daysUntil > 0 ? daysUntil : undefined,
          };
        }
      } catch {
        // Ignore seasonal context errors
      }
    }

    return {
      type: 'chat',
      narrative,
      tone: 'friendly',
      hints,
      proactiveActions,
      seasonalContext,
    };
  }

  private async generateNarrative(
    results: RankedDestination[],
    intent: ParsedIntent,
    session: SearchSession
  ): Promise<string> {
    if (results.length === 0) {
      const city = intent.entities.cities[0];
      return city
        ? `I couldn't find matches for that in ${city}. Try a broader search or different category.`
        : "I couldn't find what you're looking for. Try being more specific about the city or type of place.";
    }

    // Use LLM for natural response
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        const topResults = results.slice(0, 3).map(r => r.destination.name).join(', ');
        const city = intent.entities.cities[0] || '';
        const isFollowUp = session.turns.length > 0;

        const prompt = `Generate a brief, conversational response for a travel search.
User asked: "${intent.query}"
Found ${results.length} results in ${city || 'various cities'}.
Top results: ${topResults}
${isFollowUp ? 'This is part of an ongoing conversation.' : ''}

Be concise (2-3 sentences), helpful, natural. Don't list destinations - those appear as cards.`;

        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        console.error('[SearchSession] Narrative generation error:', error);
      }
    }

    // Fallback
    const city = intent.entities.cities[0];
    const category = intent.entities.categories[0] || 'places';
    return `I found ${results.length} ${category}${city ? ` in ${city}` : ''}. Here are my top picks for you.`;
  }

  // ============================================
  // TRIP PLANNING
  // ============================================

  private async buildTripPlan(
    intent: ParsedIntent,
    results: RankedDestination[],
    session: SearchSession
  ): Promise<TripPlan | undefined> {
    const city = intent.entities.cities[0];
    if (!city || results.length === 0) return undefined;

    const days = intent.tripPlanning?.days || 3;
    const tripDays: TripPlan['days'] = [];

    // Simple itinerary generation
    const categories = ['restaurant', 'cafe', 'culture', 'bar'];
    const itemsPerDay = Math.ceil(results.length / days);

    for (let day = 1; day <= days; day++) {
      const startIdx = (day - 1) * itemsPerDay;
      const dayResults = results.slice(startIdx, startIdx + itemsPerDay);

      tripDays.push({
        day,
        title: `Day ${day}`,
        items: dayResults.map((r, i) => ({
          time: i === 0 ? 'Morning' : i === 1 ? 'Afternoon' : 'Evening',
          title: r.destination.name,
          description: r.destination.micro_description || '',
          category: r.destination.category,
          destinationSlug: r.destination.slug,
        })),
      });
    }

    return {
      city,
      title: `${days}-Day ${city} Itinerary`,
      days: tripDays,
      style: intent.tripPlanning?.style,
    };
  }

  // ============================================
  // CONTEXT & PERSISTENCE
  // ============================================

  private updateSessionContext(
    session: SearchSession,
    intent: ParsedIntent,
    results: RankedDestination[]
  ): void {
    // Update current focus
    if (intent.entities.cities[0]) {
      session.context.currentCity = intent.entities.cities[0];
      if (!session.context.cities.includes(intent.entities.cities[0])) {
        session.context.cities.push(intent.entities.cities[0]);
      }
    }
    if (intent.entities.categories[0]) {
      session.context.currentCategory = intent.entities.categories[0];
    }

    // Track shown destinations
    const newSlugs = results.map(r => r.destination.slug);
    session.context.shown = [...new Set([...session.context.shown, ...newSlugs])].slice(-50);

    // Multi-city detection
    session.context.isMultiCity = session.context.cities.length > 1;

    // Infer preferences from modifiers
    if (intent.entities.modifiers.includes('michelin')) {
      session.context.inferred.prefersMichelin = true;
    }
    if (intent.entities.modifiers.includes('design')) {
      session.context.inferred.prefersDesign = true;
    }
    if (intent.entities.modifiers.includes('local')) {
      session.context.inferred.prefersLocal = true;
    }
    if (intent.entities.modifiers.includes('budget')) {
      session.context.inferred.pricePreference = 'budget';
    } else if (intent.entities.modifiers.includes('luxury')) {
      session.context.inferred.pricePreference = 'luxury';
    }
  }

  private async persistTurn(session: SearchSession, turn: SearchTurn): Promise<void> {
    if (!this.supabase) return;

    try {
      // Save user message
      await this.supabase.from('conversation_messages').insert({
        session_id: session.id,
        user_id: session.userId,
        role: 'user',
        content: turn.input.query,
        intent_data: turn.output.intent,
        metadata: {
          turnNumber: turn.turnNumber,
          mode: session.mode,
        },
      });

      // Save assistant response
      const narrative = turn.output.presentation.type === 'chat'
        ? (turn.output.presentation as ChatPresentation).narrative
        : `Found ${turn.output.destinations.length} results`;

      await this.supabase.from('conversation_messages').insert({
        session_id: session.id,
        user_id: session.userId,
        role: 'assistant',
        content: narrative,
        metadata: {
          destinations: turn.output.destinations.map(d => d.destination.slug),
          searchTier: turn.output.metadata.searchTier,
          totalResults: turn.output.metadata.totalResults,
        },
      });

      // Update session
      await this.supabase
        .from('conversation_sessions')
        .update({
          context: { ...session.context, mode: session.mode },
          last_activity: new Date().toISOString(),
        })
        .eq('id', session.id);
    } catch (error) {
      console.error('[SearchSession] Persist error:', error);
    }
  }

  // ============================================
  // BEHAVIOR TRACKING
  // ============================================

  /**
   * Track user behavior signals
   */
  async trackBehavior(session: SearchSession, signals: BehaviorSignal[]): Promise<void> {
    for (const signal of signals) {
      const turn = session.turns.find(t => t.id === signal.turnId);
      if (!turn) continue;

      if (!turn.metrics) {
        turn.metrics = { clicked: [], saved: [], ignored: [], actions: [] };
      }

      switch (signal.type) {
        case 'click':
          turn.metrics.clicked.push(signal.destinationSlug);
          session.context.liked.push(signal.destinationSlug);
          break;
        case 'save':
          turn.metrics.saved.push(signal.destinationSlug);
          session.context.saved.push(signal.destinationSlug);
          break;
        case 'reject':
        case 'scroll_past':
          turn.metrics.ignored.push(signal.destinationSlug);
          session.context.disliked.push(signal.destinationSlug);
          break;
      }

      turn.metrics.actions.push({
        type: signal.type,
        target: signal.destinationSlug,
        timestamp: signal.timestamp,
        context: signal.context,
      });
    }
  }

  /**
   * Switch session mode
   */
  switchMode(session: SearchSession, newMode: PresentationMode): void {
    session.mode = newMode;
    sessionCache.set(session.id, session);
  }
}

// Export singleton instance
export const searchSessionEngine = new SearchSessionEngine();
