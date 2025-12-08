/**
 * Smart Conversation Engine
 *
 * The brain behind intelligent, continuous conversations that feel smart.
 *
 * Features:
 * - Persistent sessions across page reloads
 * - Cross-session learning (remembers past conversations)
 * - Real-time behavior tracking (clicks, saves, rejections)
 * - Implicit preference learning
 * - Proactive contextual suggestions
 * - Trip-aware responses
 * - Taste fingerprint integration
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { unifiedIntelligenceCore, UnifiedContext, TasteFingerprint } from './unified-intelligence-core';
import { extendedConversationMemoryService } from './conversation-memory';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { openai } from '@/lib/openai';
import { generateTextEmbedding } from '@/lib/ml/embeddings';
import { getSeasonalContext, getAllSeasonalEvents } from '@/services/seasonality';

// ============================================
// TYPES
// ============================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: QueryIntent;
    destinations?: string[];  // slugs of shown destinations
    clickedDestinations?: string[];  // slugs user clicked on
    rejectedDestinations?: string[];  // shown but not clicked after viewing others
    savedDestinations?: string[];  // destinations user saved during this turn
    searchTier?: string;
    responseTime?: number;
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
}

export interface QueryIntent {
  keywords: string[];
  city?: string;
  category?: string;
  filters?: {
    priceLevel?: number;
    rating?: number;
    michelinStar?: number;
  };
  intent?: string;
  confidence?: number;
  clarifications?: string[];
  isFollowUp?: boolean;
  referencesPrevious?: boolean;
}

export interface ConversationSession {
  id: string;
  userId?: string;
  messages: ConversationMessage[];
  context: ConversationContext;
  createdAt: Date;
  lastActive: Date;
}

export interface ConversationContext {
  // Current conversation focus
  currentCity?: string;
  currentCategory?: string;
  currentIntent?: string;

  // Multi-city planning
  cities?: string[];  // For multi-city trips
  isMultiCity?: boolean;

  // Companion/Group awareness
  travelCompanion?: TravelCompanion;

  // Accumulated preferences from this conversation
  likedDestinations: string[];  // slugs
  dislikedDestinations: string[];  // implicitly rejected
  savedDestinations: string[];

  // Inferred preferences from behavior
  inferredPreferences: {
    prefersMichelin?: boolean;
    prefersDesign?: boolean;
    prefersLocal?: boolean;
    pricePreference?: 'budget' | 'mid' | 'luxury';
    moodPreference?: string[];
  };

  // Trip context if active
  activeTrip?: {
    id: string;
    name: string;
    city: string;
    startDate?: string;
    endDate?: string;
  };

  // What we've shown already (to avoid repetition)
  shownDestinations: string[];

  // Conversation summary (for long conversations)
  summary?: string;

  // Cross-session memory highlights
  previousConversationInsights?: string[];
}

// Companion/Group awareness types
export interface TravelCompanion {
  type: 'solo' | 'couple' | 'family' | 'friends' | 'business';
  hasKids?: boolean;
  kidsAges?: number[];
  groupSize?: number;
  specialNeeds?: string[];  // e.g., 'wheelchair', 'vegetarian', 'allergies'
  vibe?: 'romantic' | 'adventurous' | 'relaxed' | 'cultural' | 'party';
}

export interface SmartResponse {
  content: string;
  destinations: DestinationWithReasoning[];
  suggestions: SmartSuggestion[];
  contextualHints: string[];
  proactiveActions?: ProactiveAction[];
  conversationId: string;
  turnNumber: number;
  intent: QueryIntent;
  confidence: number;
  // Smart disambiguation
  needsClarification?: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: ClarificationOption[];
  // Conversation repair
  isRepairResponse?: boolean;
  repairContext?: string;
  // Proactive seasonal awareness
  seasonalContext?: {
    event: string;
    description: string;
    isActive: boolean;
    daysUntil?: number;
  };
}

// "Why This?" - Each destination includes reasoning
export interface DestinationWithReasoning {
  destination: any;
  reasoning: RecommendationReasoning;
}

export interface RecommendationReasoning {
  primaryReason: string;  // Main reason shown prominently
  factors: ReasoningFactor[];  // Detailed breakdown
  matchScore: number;  // 0-1 how well it matches user
}

export interface ReasoningFactor {
  type: 'taste' | 'behavior' | 'similar' | 'popular' | 'trip' | 'location' | 'price';
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
}

// Smart disambiguation options
export interface ClarificationOption {
  text: string;
  context: string;  // What this choice implies
  icon?: string;
}

export interface SmartSuggestion {
  text: string;
  type: 'refine' | 'expand' | 'related' | 'contrast' | 'trip' | 'saved';
  icon?: string;
  reasoning?: string;  // Why this suggestion
}

export interface ProactiveAction {
  type: 'save' | 'add_to_trip' | 'compare' | 'show_map' | 'schedule';
  label: string;
  destinationSlug?: string;
  reasoning: string;
}

export interface BehaviorSignal {
  type: 'click' | 'save' | 'reject' | 'hover' | 'scroll_past' | 'dwell';
  destinationSlug: string;
  timestamp: Date;
  context?: {
    queryId?: string;
    position?: number;  // position in results
    dwellTime?: number;  // ms spent viewing
  };
}

// ============================================
// SMART CONVERSATION ENGINE
// ============================================

class SmartConversationEngine {
  private supabase: any;
  private genAI: GoogleGenerativeAI | null = null;
  private activeSessions: Map<string, ConversationSession> = new Map();

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
   * Get or create a conversation session
   */
  async getOrCreateSession(
    sessionId: string | null,
    userId?: string
  ): Promise<ConversationSession> {
    // Check in-memory cache first
    if (sessionId && this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }

    // Try to load from database
    if (sessionId && this.supabase) {
      const existing = await this.loadSessionFromDb(sessionId);
      if (existing) {
        this.activeSessions.set(sessionId, existing);
        return existing;
      }
    }

    // Create new session
    const newSession = await this.createNewSession(userId);
    this.activeSessions.set(newSession.id, newSession);
    return newSession;
  }

  private async loadSessionFromDb(sessionId: string): Promise<ConversationSession | null> {
    if (!this.supabase) return null;

    try {
      // Get session
      const { data: session } = await this.supabase
        .from('conversation_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) return null;

      // Get messages
      const { data: messages } = await this.supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100);

      return {
        id: session.id,
        userId: session.user_id,
        messages: (messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
          metadata: m.metadata || {},
        })),
        context: session.context || this.createEmptyContext(),
        createdAt: new Date(session.created_at),
        lastActive: new Date(session.last_activity || session.created_at),
      };
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }

  private async createNewSession(userId?: string): Promise<ConversationSession> {
    const sessionId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    const session: ConversationSession = {
      id: sessionId,
      userId,
      messages: [],
      context: this.createEmptyContext(),
      createdAt: now,
      lastActive: now,
    };

    // Load cross-session insights if user is logged in
    if (userId) {
      session.context.previousConversationInsights = await this.loadCrossSessionInsights(userId);
    }

    // Persist to database
    if (this.supabase) {
      try {
        await this.supabase
          .from('conversation_sessions')
          .insert({
            id: sessionId,
            user_id: userId,
            session_token: sessionId,
            context: session.context,
            created_at: now.toISOString(),
            last_activity: now.toISOString(),
          });
      } catch (error) {
        console.error('Error creating session in DB:', error);
      }
    }

    return session;
  }

  private createEmptyContext(): ConversationContext {
    return {
      likedDestinations: [],
      dislikedDestinations: [],
      savedDestinations: [],
      shownDestinations: [],
      inferredPreferences: {},
    };
  }

  private async loadCrossSessionInsights(userId: string): Promise<string[]> {
    if (!this.supabase) return [];

    try {
      // Get recent sessions with summaries
      const { data: sessions } = await this.supabase
        .from('conversation_sessions')
        .select('context, summary, last_activity')
        .eq('user_id', userId)
        .order('last_activity', { ascending: false })
        .limit(5);

      const insights: string[] = [];

      for (const session of sessions || []) {
        if (session.summary) {
          insights.push(session.summary);
        }
        if (session.context?.currentCity) {
          insights.push(`Previously explored: ${session.context.currentCity}`);
        }
      }

      return insights.slice(0, 5);
    } catch {
      return [];
    }
  }

  // ============================================
  // MAIN QUERY PROCESSING
  // ============================================

  /**
   * Process a user message with full intelligence
   */
  async processMessage(
    sessionId: string | null,
    userId: string | undefined,
    message: string,
    options?: {
      includeProactiveActions?: boolean;
      maxDestinations?: number;
    }
  ): Promise<SmartResponse> {
    const startTime = Date.now();

    // Get or create session
    const session = await this.getOrCreateSession(sessionId, userId);
    const turnNumber = session.messages.length + 1;

    // Add user message
    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    session.messages.push(userMessage);

    // 1. Understand the query with conversation context
    const intent = await this.understandQueryWithContext(message, session);

    // 2. Get unified intelligence context
    let intelligenceContext: UnifiedContext | null = null;
    if (userId) {
      try {
        const result = await unifiedIntelligenceCore.processIntelligentQuery(
          message,
          userId,
          session.id,
          {
            includeReasoning: true,
            currentCity: intent.city || session.context.currentCity,
          }
        );
        intelligenceContext = result.context;
      } catch (error) {
        console.error('Error getting intelligence context:', error);
      }
    }

    // 3. Search for destinations
    const searchResults = await this.intelligentSearch(
      message,
      intent,
      session,
      intelligenceContext,
      options?.maxDestinations || 10
    );

    // 4. Generate smart response
    const response = await this.generateSmartResponse(
      message,
      intent,
      searchResults,
      session,
      intelligenceContext
    );

    // 5. Generate contextual suggestions
    const suggestions = await this.generateSmartSuggestions(
      intent,
      searchResults,
      session,
      intelligenceContext
    );

    // 6. Generate proactive actions
    let proactiveActions: ProactiveAction[] = [];
    if (options?.includeProactiveActions) {
      proactiveActions = this.generateProactiveActions(
        searchResults,
        session,
        intelligenceContext
      );
    }

    // 7. Generate contextual hints (including proactive seasonal awareness)
    const hints = this.generateContextualHints(
      session,
      intelligenceContext,
      searchResults,
      intent.city  // Pass city for seasonal hints
    );

    // 8. Update session context
    this.updateSessionContext(session, intent, searchResults);

    // 9. Add assistant message
    const assistantMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      metadata: {
        intent,
        destinations: searchResults.map((d: any) => d.slug),
        searchTier: 'smart-engine',
        responseTime: Date.now() - startTime,
      },
    };
    session.messages.push(assistantMessage);
    session.lastActive = new Date();

    // 10. Persist session update
    await this.persistSession(session);

    // 11. Get seasonal context for proactive awareness
    const seasonalContext = intent.city ? this.buildSeasonalContext(intent.city) : undefined;

    return {
      content: response,
      destinations: searchResults,
      suggestions,
      contextualHints: hints,
      proactiveActions,
      conversationId: session.id,
      turnNumber,
      intent,
      confidence: intent.confidence || 0.8,
      seasonalContext,
    };
  }

  /**
   * Build structured seasonal context for a city
   */
  private buildSeasonalContext(city: string): SmartResponse['seasonalContext'] | undefined {
    try {
      const context = getSeasonalContext(city);
      if (!context) return undefined;

      // Determine if event is currently active
      const now = new Date();
      const isActive = now >= context.start && now <= context.end;
      const daysUntil = !isActive
        ? Math.ceil((context.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        event: context.event,
        description: context.text,
        isActive,
        daysUntil: daysUntil && daysUntil > 0 ? daysUntil : undefined,
      };
    } catch {
      return undefined;
    }
  }

  // ============================================
  // INTELLIGENT QUERY UNDERSTANDING
  // ============================================

  private async understandQueryWithContext(
    message: string,
    session: ConversationSession
  ): Promise<QueryIntent> {
    const lowerMessage = message.toLowerCase();

    // Check for follow-up patterns
    const isFollowUp = this.detectFollowUp(lowerMessage);
    const referencesPrevious = this.detectPreviousReference(lowerMessage, session);

    // Build conversation context for LLM
    const recentMessages = session.messages.slice(-6);
    const conversationContext = recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Include context about what we've shown
    const shownContext = session.context.shownDestinations.length > 0
      ? `Previously shown: ${session.context.shownDestinations.slice(-10).join(', ')}`
      : '';

    const likedContext = session.context.likedDestinations.length > 0
      ? `User liked: ${session.context.likedDestinations.join(', ')}`
      : '';

    // Detect if this is a refinement query (modifies previous, keeps context)
    const isRefinement = this.detectRefinement(message);

    // Use LLM for intent extraction
    const systemPrompt = `You are analyzing a travel search query in context of an ongoing conversation.

CONVERSATION HISTORY:
${conversationContext}

CURRENT SESSION CONTEXT:
${session.context.currentCity ? `Active city: ${session.context.currentCity}` : 'No city set'}
${session.context.currentCategory ? `Active category: ${session.context.currentCategory}` : 'No category set'}
${shownContext}
${likedContext}

CRITICAL RULES FOR FOLLOW-UP/REFINEMENT QUERIES:
1. If user says "more budget", "cheaper option", "but nicer", etc. - this is a REFINEMENT
2. For refinements: ALWAYS keep the city and category from the active context above
3. Example: If active category is "Hotel" and user says "more budget option" → category MUST be "Hotel"
4. Only change city/category if user EXPLICITLY mentions a new one
5. "more budget option" for hotels → city: same, category: "Hotel", priceLevel: 2
6. "something different" → keep city, but try different category or style

QUERY TYPE DETECTION:
- New query: User mentions specific city/category → use what they say
- Follow-up: "more", "similar", "another" → keep city AND category from context
- Refinement: "but cheaper", "more budget", "nicer" → keep city AND category, add filter
- Contrast: "something different" → keep city, maybe change category

Return ONLY valid JSON:
{
  "keywords": ["array", "of", "keywords"],
  "city": "${session.context.currentCity || 'null if not mentioned and no context'}",
  "category": "${session.context.currentCategory || 'null if not mentioned and no context'}",
  "filters": {
    "priceLevel": 1-4 or null (1-2 for budget, 3-4 for luxury),
    "rating": 4-5 or null,
    "michelinStar": 1-3 or null
  },
  "intent": "brief description of what user wants",
  "confidence": 0.0-1.0,
  "clarifications": ["questions if ambiguous"],
  "isFollowUp": true/false,
  "isRefinement": true/false,
  "referencesPrevious": true/false,
  "contrastWith": ["things to avoid based on context"],
  "expandOn": ["things to keep from previous context"]
}`;

    try {
      if (this.genAI) {
        const model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash-latest',
          generationConfig: { responseMimeType: 'application/json' },
        });

        const result = await model.generateContent([
          { text: systemPrompt },
          { text: `Current query: "${message}"` },
        ]);

        const parsed = JSON.parse(result.response.text());

        // CRITICAL: Enforce context carryover for refinement/follow-up queries
        // If this is a follow-up or refinement, ensure we keep the previous context
        const shouldCarryContext = isFollowUp || isRefinement || parsed.isRefinement || parsed.isFollowUp;

        let finalCity = parsed.city;
        let finalCategory = parsed.category;

        if (shouldCarryContext && session.messages.length > 0) {
          // If LLM didn't return a city but we have one in context, use it
          if (!finalCity && session.context.currentCity) {
            finalCity = session.context.currentCity;
            console.log(`[SmartChat] Carrying forward city: ${finalCity}`);
          }
          // If LLM didn't return a category but we have one in context, use it
          if (!finalCategory && session.context.currentCategory) {
            finalCategory = session.context.currentCategory;
            console.log(`[SmartChat] Carrying forward category: ${finalCategory}`);
          }
        }

        // Extract price filter from refinement queries
        let priceLevel = parsed.filters?.priceLevel;
        if (isRefinement && !priceLevel) {
          const lowerMessage = message.toLowerCase();
          if (lowerMessage.includes('budget') || lowerMessage.includes('cheap') || lowerMessage.includes('affordable')) {
            priceLevel = 2;  // Budget: $-$$
          } else if (lowerMessage.includes('luxury') || lowerMessage.includes('upscale') || lowerMessage.includes('fancy')) {
            priceLevel = 4;  // Luxury: $$$$
          }
        }

        return {
          ...parsed,
          city: finalCity,
          category: finalCategory,
          filters: {
            ...parsed.filters,
            priceLevel: priceLevel || parsed.filters?.priceLevel,
          },
          isFollowUp: isFollowUp || parsed.isFollowUp,
          isRefinement: isRefinement || parsed.isRefinement,
          referencesPrevious,
        };
      }
    } catch (error) {
      console.error('Error in LLM intent extraction:', error);
    }

    // Fallback to rule-based extraction
    return this.fallbackIntentExtraction(message, session, isFollowUp, isRefinement, referencesPrevious);
  }

  private detectFollowUp(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Patterns that indicate this builds on previous query
    const followUpPatterns = [
      /^(more|another|similar|like that|same|again)/i,
      /^(show me more|give me more|what else)/i,
      /^(any other|anything else|something similar)/i,
      /\b(but\s+(cheaper|nicer|better|different|closer))/i,
      /\b(more\s+(budget|affordable|expensive|luxury|cheap))/i,
      /\b(cheaper|budget|affordable)\s+(option|one|place)/i,
      /\b(less\s+expensive|lower\s+price)/i,
    ];

    // Also detect if message is very short and conversational
    const isShortFollowUp = lowerMessage.split(/\s+/).length <= 5 &&
      (lowerMessage.includes('more') || lowerMessage.includes('another') ||
       lowerMessage.includes('cheaper') || lowerMessage.includes('budget') ||
       lowerMessage.includes('similar') || lowerMessage.includes('different'));

    return followUpPatterns.some(p => p.test(message)) || isShortFollowUp;
  }

  private detectPreviousReference(message: string, session: ConversationSession): boolean {
    const referencePatterns = [
      /\b(that|those|them|it|the one|the place)\b/i,
      /\b(you (just )?showed|you mentioned|from before)\b/i,
      /\b(first one|second one|last one)\b/i,
    ];
    return referencePatterns.some(p => p.test(message)) && session.messages.length > 0;
  }

  private detectRefinement(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Refinement patterns - modifies previous query but keeps core context
    const refinementPatterns = [
      /\b(but\s+\w+)/i,  // "but cheaper", "but nicer"
      /\b(more\s+(budget|affordable|expensive|luxury|cheap|upscale))/i,
      /\b(less\s+(expensive|pricey))/i,
      /\b(cheaper|budget|affordable)\s*(option|one|place|alternative)?/i,
      /\b(nicer|fancier|better|higher\s+end)/i,
      /\b(with\s+(outdoor|indoor|rooftop|view|parking))/i,
      /\b(closer\s+to|near\s+the|in\s+the\s+center)/i,
      /\b(open\s+(now|late|early))/i,
    ];

    return refinementPatterns.some(p => p.test(lowerMessage));
  }

  private fallbackIntentExtraction(
    message: string,
    session: ConversationSession,
    isFollowUp: boolean,
    isRefinement: boolean,
    referencesPrevious: boolean
  ): QueryIntent {
    const lowerMessage = message.toLowerCase();
    const shouldCarryContext = isFollowUp || isRefinement;

    // Extract city
    const cityNames = ['tokyo', 'paris', 'london', 'new york', 'berlin', 'barcelona', 'rome', 'amsterdam', 'vienna', 'prague', 'lisbon', 'miami', 'los angeles', 'san francisco'];
    let city = cityNames.find(c => lowerMessage.includes(c));

    // Use session context for follow-ups/refinements
    if (!city && shouldCarryContext && session.context.currentCity) {
      city = session.context.currentCity;
      console.log(`[SmartChat Fallback] Carrying forward city: ${city}`);
    }

    // Extract category
    const categories = ['restaurant', 'cafe', 'hotel', 'bar', 'museum', 'gallery', 'culture'];
    let category = categories.find(c => lowerMessage.includes(c));
    if (!category && shouldCarryContext && session.context.currentCategory) {
      category = session.context.currentCategory;
      console.log(`[SmartChat Fallback] Carrying forward category: ${category}`);
    }

    // Extract price filter from refinement
    let priceLevel: number | undefined;
    if (isRefinement) {
      if (lowerMessage.includes('budget') || lowerMessage.includes('cheap') || lowerMessage.includes('affordable')) {
        priceLevel = 2;
      } else if (lowerMessage.includes('luxury') || lowerMessage.includes('upscale') || lowerMessage.includes('fancy')) {
        priceLevel = 4;
      }
    }

    const keywords = message.split(/\s+/)
      .filter(w => w.length > 2 && !city?.includes(w) && !category?.includes(w));

    return {
      keywords,
      city,
      category,
      filters: priceLevel ? { priceLevel } : undefined,
      intent: isRefinement
        ? `Refining search for ${category || 'places'}${city ? ` in ${city}` : ''}${priceLevel ? ' (budget)' : ''}`
        : `Finding ${category || 'places'}${city ? ` in ${city}` : ''}`,
      confidence: city ? 0.8 : 0.6,
      isFollowUp,
      referencesPrevious,
    };
  }

  // ============================================
  // INTELLIGENT SEARCH
  // ============================================

  private async intelligentSearch(
    message: string,
    intent: QueryIntent,
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null,
    limit: number
  ): Promise<any[]> {
    if (!this.supabase) return [];

    try {
      // Build smart query
      let query = this.supabase
        .from('destinations')
        .select('*')
        .is('parent_destination_id', null)
        .limit(limit * 2);  // Get more to filter

      // Apply intent filters
      if (intent.city) {
        query = query.ilike('city', `%${intent.city}%`);
      }
      if (intent.category) {
        query = query.ilike('category', `%${intent.category}%`);
      }
      if (intent.filters?.priceLevel) {
        query = query.lte('price_level', intent.filters.priceLevel);
      }
      if (intent.filters?.rating) {
        query = query.gte('rating', intent.filters.rating);
      }
      if (intent.filters?.michelinStar) {
        query = query.gte('michelin_stars', intent.filters.michelinStar);
      }

      // Keyword search
      if (intent.keywords.length > 0) {
        const searchConditions = intent.keywords.flatMap(kw => [
          `name.ilike.%${kw}%`,
          `description.ilike.%${kw}%`,
          `micro_description.ilike.%${kw}%`,
        ]).join(',');
        query = query.or(searchConditions);
      }

      const { data: results, error } = await query;
      if (error) throw error;

      let finalResults = results || [];

      // Filter out already shown destinations (for variety)
      if (intent.isFollowUp && session.context.shownDestinations.length > 0) {
        const shown = new Set(session.context.shownDestinations);
        finalResults = finalResults.filter((d: any) => !shown.has(d.slug));
      }

      // Boost liked destinations' similar items
      if (session.context.likedDestinations.length > 0) {
        finalResults = this.boostSimilarToLiked(finalResults, session.context.likedDestinations);
      }

      // Deprioritize disliked destinations
      if (session.context.dislikedDestinations.length > 0) {
        finalResults = this.deprioritizeSimilarToDisliked(finalResults, session.context.dislikedDestinations);
      }

      // Apply taste fingerprint boost if available
      if (intelligenceContext?.tasteFingerprint) {
        finalResults = this.applyTasteFingerprint(finalResults, intelligenceContext.tasteFingerprint);
      }

      return finalResults.slice(0, limit);
    } catch (error) {
      console.error('Error in intelligent search:', error);
      return [];
    }
  }

  private boostSimilarToLiked(results: any[], likedSlugs: string[]): any[] {
    // Simple category/city boost for now
    // In production, use embeddings similarity
    return results.sort((a, b) => {
      const aScore = likedSlugs.includes(a.slug) ? 2 : 0;
      const bScore = likedSlugs.includes(b.slug) ? 2 : 0;
      return bScore - aScore;
    });
  }

  private deprioritizeSimilarToDisliked(results: any[], dislikedSlugs: string[]): any[] {
    return results.filter(d => !dislikedSlugs.includes(d.slug));
  }

  private applyTasteFingerprint(results: any[], fingerprint: TasteFingerprint): any[] {
    return results.map(dest => {
      let boost = 0;

      // Price affinity
      if (fingerprint.priceAffinity > 0.6 && dest.price_level >= 3) {
        boost += 0.2;
      } else if (fingerprint.priceAffinity < 0.4 && dest.price_level <= 2) {
        boost += 0.2;
      }

      // Design sensitivity
      if (fingerprint.designSensitivity > 0.6 && dest.architect_name) {
        boost += 0.3;
      }

      // Authenticity seeker
      if (fingerprint.authenticitySeeker > 0.6 && !dest.michelin_stars) {
        boost += 0.1;
      }

      dest._smartScore = (dest.rating || 0) + boost;
      return dest;
    }).sort((a, b) => (b._smartScore || 0) - (a._smartScore || 0));
  }

  // ============================================
  // SMART RESPONSE GENERATION
  // ============================================

  private async generateSmartResponse(
    message: string,
    intent: QueryIntent,
    results: any[],
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null
  ): Promise<string> {
    if (results.length === 0) {
      return this.generateNoResultsResponse(intent, session);
    }

    // Build rich context for response
    const contextParts: string[] = [];

    // Trip context
    if (intelligenceContext?.activeTrip) {
      const trip = intelligenceContext.activeTrip;
      contextParts.push(`For your ${trip.name} trip`);
    }

    // Taste awareness
    if (intelligenceContext?.tasteFingerprint) {
      const taste = intelligenceContext.tasteFingerprint;
      if (taste.designSensitivity > 0.7) {
        contextParts.push('based on your appreciation for design');
      }
      if (taste.authenticitySeeker > 0.7) {
        contextParts.push('focusing on authentic local spots');
      }
    }

    // Conversation continuity
    if (intent.isFollowUp) {
      contextParts.push('continuing from where we left off');
    }

    const contextString = contextParts.length > 0
      ? ` (${contextParts.join(', ')})`
      : '';

    // Generate response using LLM
    try {
      if (this.genAI) {
        const model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash-latest',
        });

        const prompt = `Generate a brief, conversational response for a travel search.

User asked: "${message}"
Found ${results.length} results.
Top results: ${results.slice(0, 3).map((r: any) => r.name).join(', ')}
Context: ${contextString}

${session.messages.length > 2 ? 'This is an ongoing conversation, be natural and build on previous context.' : 'This is the start of the conversation.'}

Be concise (2-3 sentences max), helpful, and personalized. Don't list destinations - those will be shown as cards.`;

        const result = await model.generateContent(prompt);
        return result.response.text();
      }
    } catch (error) {
      console.error('Error generating response:', error);
    }

    // Fallback response
    const city = intent.city ? ` in ${intent.city}` : '';
    const category = intent.category || 'places';
    return `I found ${results.length} ${category}${city}${contextString}. Here are my top picks for you.`;
  }

  private generateNoResultsResponse(intent: QueryIntent, session: ConversationSession): string {
    const suggestions: string[] = [];

    if (intent.city) {
      suggestions.push(`Try broadening your search in ${intent.city}`);
    }
    if (intent.filters?.priceLevel) {
      suggestions.push('Consider adjusting your budget range');
    }
    if (session.context.currentCity && intent.city !== session.context.currentCity) {
      suggestions.push(`Or explore more in ${session.context.currentCity}`);
    }

    const suggestionText = suggestions.length > 0
      ? ` ${suggestions[0]}.`
      : ' Try a different search.';

    return `I couldn't find matches for that specific query.${suggestionText}`;
  }

  // ============================================
  // SMART SUGGESTIONS
  // ============================================

  private async generateSmartSuggestions(
    intent: QueryIntent,
    results: any[],
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // 1. Refine suggestions based on results
    if (results.length > 3) {
      const categories = [...new Set(results.map((r: any) => r.category).filter(Boolean))];
      if (categories.length > 1) {
        suggestions.push({
          text: `Just ${categories[0]}s`,
          type: 'refine',
          icon: 'filter',
          reasoning: 'Narrow down to specific category',
        });
      }
    }

    // 2. Price refinement
    if (results.some((r: any) => r.price_level >= 3)) {
      suggestions.push({
        text: 'More affordable options',
        type: 'refine',
        icon: 'dollar',
        reasoning: 'User might want budget-friendly alternatives',
      });
    }

    // 3. Expand suggestions
    if (results.length < 5 && intent.city) {
      suggestions.push({
        text: `All places in ${intent.city}`,
        type: 'expand',
        icon: 'map',
        reasoning: 'Few results - offer broader view',
      });
    }

    // 4. Related suggestions based on taste
    if (intelligenceContext?.tasteFingerprint && intelligenceContext.tasteFingerprint.designSensitivity > 0.6) {
      suggestions.push({
        text: 'Architecturally significant spots',
        type: 'related',
        icon: 'building',
        reasoning: 'User appreciates design',
      });
    }

    // 5. Trip-aware suggestions
    if (intelligenceContext?.activeTrip) {
      suggestions.push({
        text: 'Add top pick to trip',
        type: 'trip',
        icon: 'calendar',
        reasoning: 'User has an active trip',
      });
    }

    // 6. Contrast suggestion
    if (session.context.likedDestinations.length > 0) {
      suggestions.push({
        text: 'Something different',
        type: 'contrast',
        icon: 'shuffle',
        reasoning: 'Offer variety from liked items',
      });
    }

    // 7. Saved places context
    if (intelligenceContext?.savedPlaces && intelligenceContext.savedPlaces.length > 0) {
      suggestions.push({
        text: 'Similar to your saved places',
        type: 'saved',
        icon: 'bookmark',
        reasoning: 'Connect to user\'s saved items',
      });
    }

    return suggestions.slice(0, 5);
  }

  // ============================================
  // PROACTIVE ACTIONS
  // ============================================

  private generateProactiveActions(
    results: any[],
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null
  ): ProactiveAction[] {
    const actions: ProactiveAction[] = [];

    if (results.length === 0) return actions;

    const topResult = results[0];

    // Save suggestion for highly rated
    if (topResult.rating >= 4.5) {
      actions.push({
        type: 'save',
        label: `Save ${topResult.name}`,
        destinationSlug: topResult.slug,
        reasoning: 'Highly rated destination you might want to revisit',
      });
    }

    // Add to trip if active
    if (intelligenceContext?.activeTrip) {
      actions.push({
        type: 'add_to_trip',
        label: `Add to ${intelligenceContext.activeTrip.name}`,
        destinationSlug: topResult.slug,
        reasoning: 'Fits your upcoming trip',
      });
    }

    // Compare if multiple similar results
    if (results.length >= 3) {
      actions.push({
        type: 'compare',
        label: 'Compare top 3',
        reasoning: 'Help decide between similar options',
      });
    }

    // Map view for location-based queries
    if (results.every((r: any) => r.latitude && r.longitude)) {
      actions.push({
        type: 'show_map',
        label: 'See on map',
        reasoning: 'Visualize locations',
      });
    }

    return actions.slice(0, 3);
  }

  // ============================================
  // CONTEXTUAL HINTS
  // ============================================

  private generateContextualHints(
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null,
    results: any[],
    city?: string
  ): string[] {
    const hints: string[] = [];

    // 🌸 PROACTIVE SEASONAL AWARENESS - Most important, show first!
    const searchCity = city || session.context.currentCity;
    if (searchCity) {
      const seasonalHint = this.getProactiveSeasonalHint(searchCity);
      if (seasonalHint) {
        hints.push(seasonalHint);
      }
    }

    // Cross-session hints
    if (session.context.previousConversationInsights?.length) {
      hints.push(`I remember you were interested in ${session.context.previousConversationInsights[0]}`);
    }

    // Trip awareness
    if (intelligenceContext?.activeTrip) {
      const trip = intelligenceContext.activeTrip;
      hints.push(`These would be great for your ${trip.name} trip`);
    }

    // Taste-based hints
    if (intelligenceContext?.tasteFingerprint) {
      const taste = intelligenceContext.tasteFingerprint;
      if (taste.adventurousness > 0.7 && results.some((r: any) => !r.michelin_stars)) {
        hints.push('I included some hidden gems based on your adventurous taste');
      }
      if (taste.designSensitivity > 0.7 && results.some((r: any) => r.architect_name)) {
        hints.push('Highlighted some architecturally significant spots for you');
      }
    }

    // Behavior-based hints
    if (session.context.likedDestinations.length >= 3) {
      hints.push('I\'m learning your preferences - these match what you\'ve liked');
    }

    return hints.slice(0, 3);  // Allow 3 hints now (seasonal is important)
  }

  /**
   * Get proactive seasonal hint for a city
   * This is what makes the chat feel "smart" - it knows what's happening NOW
   */
  private getProactiveSeasonalHint(city: string): string | null {
    try {
      const seasonalContext = getSeasonalContext(city);
      if (!seasonalContext) return null;

      // Format a natural hint
      // The seasonality service returns: { text, start, end, event }
      return `🌸 ${seasonalContext.text}`;
    } catch (error) {
      console.error('Error getting seasonal hint:', error);
      return null;
    }
  }

  /**
   * Get all seasonal events for a city (for itinerary planning)
   */
  getSeasonalEventsForCity(city: string): any[] {
    try {
      return getAllSeasonalEvents(city);
    } catch {
      return [];
    }
  }

  // ============================================
  // SESSION CONTEXT UPDATES
  // ============================================

  private updateSessionContext(
    session: ConversationSession,
    intent: QueryIntent,
    results: any[]
  ): void {
    // Update current focus
    if (intent.city) session.context.currentCity = intent.city;
    if (intent.category) session.context.currentCategory = intent.category;
    if (intent.intent) session.context.currentIntent = intent.intent;

    // Track shown destinations
    const shownSlugs = results.map((d: any) => d.slug);
    session.context.shownDestinations = [
      ...session.context.shownDestinations,
      ...shownSlugs,
    ].slice(-50);  // Keep last 50
  }

  // ============================================
  // BEHAVIOR TRACKING
  // ============================================

  /**
   * Track user behavior signals (clicks, saves, etc.)
   */
  async trackBehavior(
    sessionId: string,
    signal: BehaviorSignal
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    switch (signal.type) {
      case 'click':
        if (!session.context.likedDestinations.includes(signal.destinationSlug)) {
          session.context.likedDestinations.push(signal.destinationSlug);
        }
        break;
      case 'save':
        if (!session.context.savedDestinations.includes(signal.destinationSlug)) {
          session.context.savedDestinations.push(signal.destinationSlug);
        }
        break;
      case 'reject':
      case 'scroll_past':
        if (!session.context.dislikedDestinations.includes(signal.destinationSlug)) {
          session.context.dislikedDestinations.push(signal.destinationSlug);
        }
        break;
    }

    // Update inferred preferences
    await this.updateInferredPreferences(session);
  }

  private async updateInferredPreferences(session: ConversationSession): Promise<void> {
    const liked = session.context.likedDestinations;
    if (liked.length < 3) return;

    // Fetch details of liked destinations
    if (!this.supabase) return;

    try {
      const { data: destinations } = await this.supabase
        .from('destinations')
        .select('price_level, michelin_stars, architect_name, vibe_tags')
        .in('slug', liked.slice(-10));

      if (!destinations) return;

      // Infer preferences
      const avgPrice = destinations.reduce((sum: number, d: any) => sum + (d.price_level || 2), 0) / destinations.length;
      const michelinCount = destinations.filter((d: any) => d.michelin_stars > 0).length;
      const designCount = destinations.filter((d: any) => d.architect_name).length;

      session.context.inferredPreferences = {
        pricePreference: avgPrice >= 3 ? 'luxury' : avgPrice >= 2 ? 'mid' : 'budget',
        prefersMichelin: michelinCount >= destinations.length * 0.3,
        prefersDesign: designCount >= destinations.length * 0.3,
      };
    } catch (error) {
      console.error('Error updating inferred preferences:', error);
    }
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  private async persistSession(session: ConversationSession): Promise<void> {
    if (!this.supabase) return;

    try {
      // Update session
      await this.supabase
        .from('conversation_sessions')
        .update({
          context: session.context,
          last_activity: session.lastActive.toISOString(),
        })
        .eq('id', session.id);

      // Save latest message
      const latestMessage = session.messages[session.messages.length - 1];
      if (latestMessage) {
        await this.supabase
          .from('conversation_messages')
          .insert({
            id: latestMessage.id,
            session_id: session.id,
            user_id: session.userId,
            role: latestMessage.role,
            content: latestMessage.content,
            metadata: latestMessage.metadata || {},
            created_at: latestMessage.timestamp.toISOString(),
          });
      }
    } catch (error) {
      console.error('Error persisting session:', error);
    }
  }

  /**
   * Generate session summary for long conversations
   */
  async summarizeSession(sessionId: string): Promise<string | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.messages.length < 6 || !this.genAI) return null;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

      const conversationText = session.messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = `Summarize this travel conversation in 2-3 sentences, capturing:
- What the user was looking for
- Key preferences discovered
- Any decisions made

Conversation:
${conversationText}

Summary:`;

      const result = await model.generateContent(prompt);
      const summary = result.response.text();

      // Update session with summary
      session.context.summary = summary;

      // Persist summary
      if (this.supabase) {
        await this.supabase
          .from('conversation_sessions')
          .update({ summary })
          .eq('id', sessionId);
      }

      return summary;
    } catch (error) {
      console.error('Error summarizing session:', error);
      return null;
    }
  }

  // ============================================
  // CONTINUE CONVERSATION
  // ============================================

  /**
   * Continue a conversation from where it left off
   */
  async continueConversation(
    sessionId: string,
    userId?: string
  ): Promise<{
    session: ConversationSession;
    welcomeBack: string;
    suggestions: SmartSuggestion[];
  }> {
    const session = await this.getOrCreateSession(sessionId, userId);

    // Generate welcome back message
    let welcomeBack = 'Welcome back! ';

    if (session.context.currentCity) {
      welcomeBack += `I see we were exploring ${session.context.currentCity}. `;
    }

    if (session.context.likedDestinations.length > 0) {
      welcomeBack += `You showed interest in some great spots. `;
    }

    welcomeBack += 'How can I help you continue?';

    // Generate continuation suggestions
    const suggestions: SmartSuggestion[] = [];

    if (session.context.currentCity) {
      suggestions.push({
        text: `More in ${session.context.currentCity}`,
        type: 'expand',
        reasoning: 'Continue exploring the same city',
      });
    }

    if (session.context.likedDestinations.length > 0) {
      suggestions.push({
        text: 'Similar to what I liked',
        type: 'related',
        reasoning: 'Find more like your favorites',
      });
    }

    suggestions.push({
      text: 'Start fresh',
      type: 'contrast',
      reasoning: 'Begin a new search',
    });

    return { session, welcomeBack, suggestions };
  }

  // ============================================
  // SMART DISAMBIGUATION
  // ============================================

  /**
   * Detect if query is ambiguous and needs clarification
   */
  private detectAmbiguity(
    message: string,
    intent: QueryIntent,
    session: ConversationSession
  ): boolean {
    const lowerMessage = message.toLowerCase();

    // Very generic queries need clarification
    const genericPatterns = [
      /^(good|nice|best|great)\s+(place|spot|recommendation)s?\s*(in\s+\w+)?$/i,
      /^(where|what)\s+(should|can)\s+i\s+(go|visit|eat|stay)/i,
      /^(recommend|suggest)\s+(something|anything|a place)/i,
      /^(help me|i need|looking for)\s+(find|choose)/i,
    ];

    const isGeneric = genericPatterns.some(p => p.test(lowerMessage));

    // Low confidence from intent extraction
    const lowConfidence = (intent.confidence || 0) < 0.5;

    // Missing both city and category
    const missingContext = !intent.city && !intent.category && !session.context.currentCity;

    return isGeneric || lowConfidence || missingContext;
  }

  /**
   * Generate smart, personalized clarification question
   */
  private async generateSmartClarification(
    message: string,
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null
  ): Promise<{
    question: string;
    options: ClarificationOption[];
  }> {
    // Build personalized options based on user history
    const options: ClarificationOption[] = [];

    // Option based on recent liked places
    if (session.context.likedDestinations.length > 0) {
      const lastLiked = session.context.likedDestinations[session.context.likedDestinations.length - 1];
      options.push({
        text: `Something like ${lastLiked}`,
        context: 'Based on places you\'ve liked',
        icon: 'heart',
      });
    }

    // Option based on taste fingerprint
    if (intelligenceContext?.tasteFingerprint) {
      const taste = intelligenceContext.tasteFingerprint;
      if (taste.designSensitivity > 0.6) {
        options.push({
          text: 'Design-focused places',
          context: 'Matches your appreciation for design',
          icon: 'building',
        });
      }
      if (taste.authenticitySeeker > 0.6) {
        options.push({
          text: 'Local hidden gems',
          context: 'Authentic spots off the beaten path',
          icon: 'compass',
        });
      }
    }

    // Option based on active trip
    if (intelligenceContext?.activeTrip) {
      options.push({
        text: `For my ${intelligenceContext.activeTrip.name} trip`,
        context: `Places in ${intelligenceContext.activeTrip.destinations[0] || 'your trip destinations'}`,
        icon: 'calendar',
      });
    }

    // Category options if no category specified
    if (!session.context.currentCategory) {
      options.push(
        { text: 'Restaurants & dining', context: 'Food experiences', icon: 'utensils' },
        { text: 'Hotels & stays', context: 'Accommodation', icon: 'bed' },
        { text: 'Cafes & coffee', context: 'Coffee culture', icon: 'coffee' },
      );
    }

    // Generate personalized question
    let question = 'What are you looking for? ';

    if (session.context.previousConversationInsights?.length) {
      question = `Last time you were interested in ${session.context.previousConversationInsights[0]}. Looking for something similar, or exploring a different vibe?`;
    } else if (session.context.likedDestinations.length > 0) {
      question = 'Based on what you\'ve liked, I can suggest similar places. Or are you in the mood for something different?';
    } else if (intelligenceContext?.tasteFingerprint && intelligenceContext.tasteFingerprint.designSensitivity > 0.6) {
      question = 'I know you appreciate good design. Want me to focus on architecturally significant places, or explore other vibes?';
    }

    return {
      question,
      options: options.slice(0, 4),
    };
  }

  // ============================================
  // "WHY THIS?" EXPLANATIONS
  // ============================================

  /**
   * Generate reasoning for why each destination was recommended
   */
  private generateRecommendationReasoning(
    destination: any,
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null,
    intent: QueryIntent
  ): RecommendationReasoning {
    const factors: ReasoningFactor[] = [];
    let matchScore = 0.5;  // Base score

    // Check taste fingerprint matches
    if (intelligenceContext?.tasteFingerprint) {
      const taste = intelligenceContext.tasteFingerprint;

      // Design match
      if (destination.architect_name && taste.designSensitivity > 0.5) {
        factors.push({
          type: 'taste',
          description: `Architecturally significant (designed by ${destination.architect_name})`,
          strength: taste.designSensitivity > 0.7 ? 'strong' : 'moderate',
        });
        matchScore += 0.15;
      }

      // Price match
      const destPrice = destination.price_level || 2;
      const userPriceAffinity = taste.priceAffinity;
      if ((destPrice >= 3 && userPriceAffinity > 0.6) || (destPrice <= 2 && userPriceAffinity < 0.4)) {
        factors.push({
          type: 'price',
          description: destPrice >= 3 ? 'Matches your preference for upscale experiences' : 'Great value, fits your budget preference',
          strength: 'moderate',
        });
        matchScore += 0.1;
      }

      // Authenticity match
      if (!destination.michelin_stars && taste.authenticitySeeker > 0.6) {
        factors.push({
          type: 'taste',
          description: 'Local favorite, authentic experience',
          strength: 'moderate',
        });
        matchScore += 0.1;
      }
    }

    // Check behavioral matches
    if (session.context.likedDestinations.length > 0) {
      // Check if similar category to liked places
      factors.push({
        type: 'behavior',
        description: 'Similar to places you\'ve shown interest in',
        strength: 'moderate',
      });
      matchScore += 0.1;
    }

    // Check trip context
    if (intelligenceContext?.activeTrip) {
      const tripDests = intelligenceContext.activeTrip.destinations || [];
      if (tripDests.some(d => d.toLowerCase() === destination.city?.toLowerCase())) {
        factors.push({
          type: 'trip',
          description: `Perfect for your ${intelligenceContext.activeTrip.name} trip`,
          strength: 'strong',
        });
        matchScore += 0.15;
      }
    }

    // Rating factor
    if (destination.rating >= 4.5) {
      factors.push({
        type: 'popular',
        description: `Highly rated (${destination.rating}★)`,
        strength: 'strong',
      });
      matchScore += 0.1;
    }

    // Michelin factor
    if (destination.michelin_stars > 0) {
      factors.push({
        type: 'popular',
        description: `${destination.michelin_stars} Michelin star${destination.michelin_stars > 1 ? 's' : ''}`,
        strength: 'strong',
      });
      matchScore += 0.1;
    }

    // Location match
    if (intent.city && destination.city?.toLowerCase() === intent.city.toLowerCase()) {
      factors.push({
        type: 'location',
        description: `Located in ${destination.city}`,
        strength: 'moderate',
      });
    }

    // Generate primary reason
    let primaryReason = 'Recommended for you';
    if (factors.length > 0) {
      const strongFactor = factors.find(f => f.strength === 'strong');
      primaryReason = strongFactor?.description || factors[0].description;
    }

    return {
      primaryReason,
      factors: factors.slice(0, 4),
      matchScore: Math.min(1, matchScore),
    };
  }

  /**
   * Wrap destinations with reasoning
   */
  private wrapDestinationsWithReasoning(
    destinations: any[],
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null,
    intent: QueryIntent
  ): DestinationWithReasoning[] {
    return destinations.map(dest => ({
      destination: dest,
      reasoning: this.generateRecommendationReasoning(dest, session, intelligenceContext, intent),
    }));
  }

  // ============================================
  // CONVERSATION REPAIR
  // ============================================

  /**
   * Detect if user is rejecting/correcting previous results
   */
  private detectRejection(message: string): {
    isRejection: boolean;
    rejectionType?: 'price' | 'style' | 'location' | 'category' | 'general';
    correction?: string;
  } {
    const lowerMessage = message.toLowerCase();

    // Price rejection
    if (/\b(too\s+expensive|too\s+pricey|can't\s+afford|out\s+of\s+budget|cheaper|budget)/i.test(lowerMessage)) {
      return { isRejection: true, rejectionType: 'price', correction: 'budget' };
    }
    if (/\b(too\s+cheap|want\s+nicer|more\s+upscale|fancier|luxury)/i.test(lowerMessage)) {
      return { isRejection: true, rejectionType: 'price', correction: 'luxury' };
    }

    // Style rejection
    if (/\b(too\s+(modern|trendy|hipster|fancy|casual|formal))/i.test(lowerMessage)) {
      return { isRejection: true, rejectionType: 'style' };
    }

    // Location rejection
    if (/\b(too\s+far|not\s+in|wrong\s+(area|neighborhood|location))/i.test(lowerMessage)) {
      return { isRejection: true, rejectionType: 'location' };
    }

    // Category rejection
    if (/\b(not\s+(restaurants?|hotels?|cafes?|bars?)|don't\s+want\s+(food|stay|coffee))/i.test(lowerMessage)) {
      return { isRejection: true, rejectionType: 'category' };
    }

    // General rejection
    if (/\b(no|nope|not\s+(these|this|that|what|right)|wrong|different|don't\s+like)/i.test(lowerMessage)) {
      return { isRejection: true, rejectionType: 'general' };
    }

    return { isRejection: false };
  }

  /**
   * Handle conversation repair - adjust based on rejection
   */
  private async handleConversationRepair(
    message: string,
    rejection: { isRejection: boolean; rejectionType?: string; correction?: string },
    session: ConversationSession,
    intent: QueryIntent
  ): Promise<{
    adjustedIntent: QueryIntent;
    repairMessage: string;
  }> {
    const adjustedIntent = { ...intent };
    let repairMessage = 'Got it! ';

    switch (rejection.rejectionType) {
      case 'price':
        if (rejection.correction === 'budget') {
          adjustedIntent.filters = { ...adjustedIntent.filters, priceLevel: 2 };
          repairMessage += 'Here are some more affordable options';
          // Update inferred preferences
          session.context.inferredPreferences.pricePreference = 'budget';
        } else {
          adjustedIntent.filters = { ...adjustedIntent.filters, priceLevel: 4 };
          repairMessage += 'Let me show you some nicer options';
          session.context.inferredPreferences.pricePreference = 'luxury';
        }
        break;

      case 'style':
        repairMessage += 'Let me find something with a different vibe';
        // Mark shown destinations as disliked
        session.context.dislikedDestinations.push(...session.context.shownDestinations.slice(-5));
        break;

      case 'location':
        repairMessage += 'Let me look in a different area';
        break;

      case 'category':
        repairMessage += 'What type of place would you prefer?';
        adjustedIntent.category = undefined;
        break;

      default:
        repairMessage += 'Let me try something different';
        // Mark shown as disliked
        session.context.dislikedDestinations.push(...session.context.shownDestinations.slice(-5));
    }

    // Carry forward city and category unless explicitly rejected
    if (!adjustedIntent.city && session.context.currentCity) {
      adjustedIntent.city = session.context.currentCity;
    }
    if (rejection.rejectionType !== 'category' && !adjustedIntent.category && session.context.currentCategory) {
      adjustedIntent.category = session.context.currentCategory;
    }

    return { adjustedIntent, repairMessage };
  }

  // ============================================
  // ITINERARY INTELLIGENCE
  // ============================================

  /**
   * Detect if user wants an itinerary built
   */
  private detectItineraryRequest(message: string): {
    isItinerary: boolean;
    duration?: 'morning' | 'afternoon' | 'evening' | 'day' | 'weekend';
    area?: string;
  } {
    const lowerMessage = message.toLowerCase();

    const itineraryPatterns = [
      /\b(build|create|plan|make)\s+(me\s+)?(a|an)?\s*(day|itinerary|schedule|route)/i,
      /\b(day\s+in|afternoon\s+in|morning\s+in|evening\s+in)\s+(\w+)/i,
      /\b(what\s+should\s+i\s+do|how\s+to\s+spend)\s+(a\s+)?(day|morning|afternoon)/i,
      /\b(perfect|ideal|best)\s+(day|itinerary)\s+(in|for)/i,
    ];

    const isItinerary = itineraryPatterns.some(p => p.test(lowerMessage));

    if (!isItinerary) return { isItinerary: false };

    // Extract duration
    let duration: 'morning' | 'afternoon' | 'evening' | 'day' | 'weekend' = 'day';
    if (lowerMessage.includes('morning')) duration = 'morning';
    else if (lowerMessage.includes('afternoon')) duration = 'afternoon';
    else if (lowerMessage.includes('evening')) duration = 'evening';
    else if (lowerMessage.includes('weekend')) duration = 'weekend';

    // Extract area (neighborhood or city)
    const areaMatch = lowerMessage.match(/\b(in|around|near)\s+(\w+(?:\s+\w+)?)/i);
    const area = areaMatch ? areaMatch[2] : undefined;

    return { isItinerary, duration, area };
  }

  /**
   * Build intelligent itinerary with logical flow
   */
  async buildItinerary(
    city: string,
    duration: 'morning' | 'afternoon' | 'evening' | 'day' | 'weekend',
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null,
    neighborhood?: string
  ): Promise<ItineraryPlan> {
    if (!this.supabase) {
      return { slots: [], totalDuration: 0, walkingTime: 0 };
    }

    // Define time slots based on duration
    const slots = this.getTimeSlotsForDuration(duration);

    // Fetch destinations for the city/neighborhood
    let query = this.supabase
      .from('destinations')
      .select('*')
      .ilike('city', `%${city}%`)
      .is('parent_destination_id', null);

    if (neighborhood) {
      query = query.or(`neighborhood.ilike.%${neighborhood}%,name.ilike.%${neighborhood}%`);
    }

    const { data: destinations } = await query.limit(50);

    if (!destinations || destinations.length === 0) {
      return { slots: [], totalDuration: 0, walkingTime: 0 };
    }

    // Categorize destinations by type
    const byCategory: Record<string, any[]> = {};
    for (const dest of destinations) {
      const cat = dest.category?.toLowerCase() || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(dest);
    }

    // Build itinerary slots
    const itinerarySlots: ItinerarySlot[] = [];

    for (const slot of slots) {
      const suitable = this.findSuitableForTimeSlot(slot, byCategory, session, intelligenceContext);
      if (suitable) {
        // Remove from available to avoid duplicates
        const cat = suitable.category?.toLowerCase() || 'other';
        byCategory[cat] = byCategory[cat]?.filter(d => d.slug !== suitable.slug) || [];

        itinerarySlots.push({
          time: slot.time,
          timeLabel: slot.label,
          destination: suitable,
          duration: slot.duration,
          activity: slot.activity,
          reasoning: this.generateRecommendationReasoning(suitable, session, intelligenceContext, {} as QueryIntent),
        });
      }
    }

    // Calculate walking times between consecutive slots
    let totalWalkingTime = 0;
    for (let i = 1; i < itinerarySlots.length; i++) {
      const prev = itinerarySlots[i - 1].destination;
      const curr = itinerarySlots[i].destination;
      if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
        const distance = this.calculateDistance(
          prev.latitude, prev.longitude,
          curr.latitude, curr.longitude
        );
        const walkingMinutes = Math.round(distance / 80); // ~80m per minute walking
        itinerarySlots[i].walkingTimeFromPrevious = walkingMinutes;
        totalWalkingTime += walkingMinutes;
      }
    }

    return {
      slots: itinerarySlots,
      totalDuration: itinerarySlots.reduce((sum, s) => sum + s.duration, 0),
      walkingTime: totalWalkingTime,
      city,
      neighborhood,
    };
  }

  private getTimeSlotsForDuration(duration: string): Array<{
    time: string;
    label: string;
    activity: string;
    duration: number;
    preferredCategories: string[];
  }> {
    switch (duration) {
      case 'morning':
        return [
          { time: '09:00', label: 'Morning coffee', activity: 'coffee', duration: 45, preferredCategories: ['cafe', 'coffee'] },
          { time: '10:00', label: 'Mid-morning', activity: 'explore', duration: 90, preferredCategories: ['museum', 'gallery', 'culture'] },
          { time: '12:00', label: 'Lunch', activity: 'lunch', duration: 75, preferredCategories: ['restaurant'] },
        ];
      case 'afternoon':
        return [
          { time: '14:00', label: 'Afternoon', activity: 'explore', duration: 120, preferredCategories: ['museum', 'gallery', 'culture', 'shop'] },
          { time: '16:30', label: 'Late afternoon', activity: 'coffee', duration: 45, preferredCategories: ['cafe', 'coffee', 'bar'] },
          { time: '18:00', label: 'Early evening', activity: 'drinks', duration: 60, preferredCategories: ['bar', 'restaurant'] },
        ];
      case 'evening':
        return [
          { time: '18:00', label: 'Aperitivo', activity: 'drinks', duration: 60, preferredCategories: ['bar'] },
          { time: '19:30', label: 'Dinner', activity: 'dinner', duration: 120, preferredCategories: ['restaurant'] },
          { time: '22:00', label: 'Nightcap', activity: 'drinks', duration: 60, preferredCategories: ['bar'] },
        ];
      case 'weekend':
        return [
          { time: '10:00', label: 'Morning coffee', activity: 'coffee', duration: 45, preferredCategories: ['cafe', 'coffee'] },
          { time: '11:00', label: 'Late morning', activity: 'explore', duration: 90, preferredCategories: ['museum', 'gallery'] },
          { time: '13:00', label: 'Lunch', activity: 'lunch', duration: 90, preferredCategories: ['restaurant'] },
          { time: '15:00', label: 'Afternoon', activity: 'explore', duration: 120, preferredCategories: ['culture', 'shop'] },
          { time: '17:30', label: 'Aperitivo', activity: 'drinks', duration: 60, preferredCategories: ['bar', 'cafe'] },
          { time: '19:00', label: 'Dinner', activity: 'dinner', duration: 120, preferredCategories: ['restaurant'] },
        ];
      default: // day
        return [
          { time: '09:00', label: 'Morning coffee', activity: 'coffee', duration: 45, preferredCategories: ['cafe', 'coffee'] },
          { time: '10:00', label: 'Mid-morning', activity: 'explore', duration: 90, preferredCategories: ['museum', 'gallery', 'culture'] },
          { time: '12:00', label: 'Lunch', activity: 'lunch', duration: 75, preferredCategories: ['restaurant'] },
          { time: '14:00', label: 'Afternoon', activity: 'explore', duration: 90, preferredCategories: ['culture', 'shop', 'gallery'] },
          { time: '16:00', label: 'Afternoon break', activity: 'coffee', duration: 45, preferredCategories: ['cafe', 'coffee'] },
          { time: '18:00', label: 'Early evening', activity: 'drinks', duration: 60, preferredCategories: ['bar'] },
          { time: '19:30', label: 'Dinner', activity: 'dinner', duration: 120, preferredCategories: ['restaurant'] },
        ];
    }
  }

  private findSuitableForTimeSlot(
    slot: { preferredCategories: string[]; activity: string },
    byCategory: Record<string, any[]>,
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null
  ): any | null {
    // Try preferred categories first
    for (const cat of slot.preferredCategories) {
      const options = byCategory[cat];
      if (options && options.length > 0) {
        // Sort by taste match and rating
        const sorted = options.sort((a, b) => {
          let scoreA = a.rating || 0;
          let scoreB = b.rating || 0;

          // Boost for design if user likes design
          if (intelligenceContext?.tasteFingerprint && intelligenceContext.tasteFingerprint.designSensitivity > 0.6) {
            if (a.architect_name) scoreA += 1;
            if (b.architect_name) scoreB += 1;
          }

          // Boost for liked destinations similarity
          if (session.context.likedDestinations.includes(a.slug)) scoreA += 2;
          if (session.context.likedDestinations.includes(b.slug)) scoreB += 2;

          // Penalize disliked
          if (session.context.dislikedDestinations.includes(a.slug)) scoreA -= 3;
          if (session.context.dislikedDestinations.includes(b.slug)) scoreB -= 3;

          return scoreB - scoreA;
        });

        return sorted[0];
      }
    }

    return null;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula for distance in meters
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert itinerary to actual trip
   */
  async convertItineraryToTrip(
    itinerary: ItineraryPlan,
    userId: string,
    tripName?: string,
    date?: string
  ): Promise<{ tripId: string; success: boolean }> {
    if (!this.supabase) {
      return { tripId: '', success: false };
    }

    try {
      // Create trip
      const { data: trip, error: tripError } = await this.supabase
        .from('trips')
        .insert({
          user_id: userId,
          name: tripName || `${itinerary.city || 'My'} Trip`,
          destination: itinerary.city,
          status: 'planning',
          start_date: date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (tripError || !trip) throw tripError;

      // Add itinerary items
      const itineraryItems = itinerary.slots.map((slot, index) => ({
        trip_id: trip.id,
        destination_slug: slot.destination.slug,
        scheduled_date: date || new Date().toISOString().split('T')[0],
        scheduled_time: slot.time,
        duration_minutes: slot.duration,
        order_index: index,
        notes: `${slot.timeLabel}: ${slot.activity}`,
      }));

      const { error: itemsError } = await this.supabase
        .from('trip_itinerary_items')
        .insert(itineraryItems);

      if (itemsError) throw itemsError;

      return { tripId: trip.id, success: true };
    } catch (error) {
      console.error('Error converting itinerary to trip:', error);
      return { tripId: '', success: false };
    }
  }

  // ============================================
  // SIMILAR PLACE DISCOVERY
  // ============================================

  /**
   * Detect if user wants similar places to a specific destination
   */
  private detectSimilarPlaceRequest(message: string): {
    isSimilarRequest: boolean;
    referencedPlace?: string;
    similarityType?: 'vibe' | 'style' | 'category' | 'price' | 'experience';
  } {
    const lowerMessage = message.toLowerCase();

    // Patterns for "more like X"
    const similarPatterns = [
      /\b(more\s+like|similar\s+to|places?\s+like)\s+["']?([^"',]+)["']?/i,
      /\b(something\s+like|same\s+vibe\s+as)\s+["']?([^"',]+)["']?/i,
      /\b(another|other)\s+["']?([^"',]+)["']?/i,
      /\blike\s+["']?([^"',]+)["']?\s+(but|with)/i,
    ];

    for (const pattern of similarPatterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        const place = match[2] || match[1];
        return {
          isSimilarRequest: true,
          referencedPlace: place.trim(),
          similarityType: this.detectSimilarityType(lowerMessage),
        };
      }
    }

    // Also detect "more like that" referencing previous results
    if (/\b(more\s+like\s+(that|this|those)|similar\s+ones?)\b/i.test(lowerMessage)) {
      return {
        isSimilarRequest: true,
        similarityType: this.detectSimilarityType(lowerMessage),
      };
    }

    return { isSimilarRequest: false };
  }

  private detectSimilarityType(message: string): 'vibe' | 'style' | 'category' | 'price' | 'experience' {
    if (/\b(vibe|atmosphere|mood|feel)\b/i.test(message)) return 'vibe';
    if (/\b(style|design|aesthetic|look)\b/i.test(message)) return 'style';
    if (/\b(price|budget|cost|afford)\b/i.test(message)) return 'price';
    if (/\b(experience|activity|do|visit)\b/i.test(message)) return 'experience';
    return 'vibe';  // Default to vibe similarity
  }

  /**
   * Find similar places using embeddings and precomputed relationships
   */
  async findSimilarPlaces(
    destinationSlug: string,
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null,
    limit: number = 10
  ): Promise<DestinationWithReasoning[]> {
    if (!this.supabase) return [];

    try {
      // First try precomputed relationships
      const { data: precomputed } = await this.supabase
        .from('destination_relationships')
        .select(`
          destination_b,
          similarity_score,
          relation_type,
          destinations!destination_relationships_destination_b_fkey (*)
        `)
        .eq('destination_a_slug', destinationSlug)
        .eq('relation_type', 'similar')
        .gte('similarity_score', 0.6)
        .order('similarity_score', { ascending: false })
        .limit(limit);

      if (precomputed && precomputed.length > 0) {
        return precomputed.map((rel: any) => ({
          destination: rel.destinations,
          reasoning: {
            primaryReason: `Similar vibe to ${destinationSlug} (${Math.round(rel.similarity_score * 100)}% match)`,
            factors: [{
              type: 'similar' as const,
              description: 'Semantic similarity based on style, vibe, and experience',
              strength: rel.similarity_score > 0.8 ? 'strong' as const : 'moderate' as const,
            }],
            matchScore: rel.similarity_score,
          },
        }));
      }

      // Fallback: Use embedding-based search
      return await this.findSimilarByEmbedding(destinationSlug, session, intelligenceContext, limit);
    } catch (error) {
      console.error('Error finding similar places:', error);
      return [];
    }
  }

  /**
   * Find similar places using real-time embedding comparison
   */
  private async findSimilarByEmbedding(
    destinationSlug: string,
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null,
    limit: number
  ): Promise<DestinationWithReasoning[]> {
    if (!this.supabase) return [];

    try {
      // Get the source destination
      const { data: source } = await this.supabase
        .from('destinations')
        .select('*')
        .eq('slug', destinationSlug)
        .single();

      if (!source) return [];

      // Build search text from source destination
      const searchText = [
        source.name,
        source.category,
        source.micro_description || source.description,
        source.vibe_tags?.join(' '),
      ].filter(Boolean).join('. ');

      // Generate embedding for search text
      const { embedding } = await generateTextEmbedding(searchText);

      // Search by embedding (if we have a vector search capability)
      // For now, fall back to category/city similarity
      let query = this.supabase
        .from('destinations')
        .select('*')
        .is('parent_destination_id', null)
        .neq('slug', destinationSlug)  // Exclude source
        .limit(limit * 3);

      // Same city, same category for maximum similarity
      if (source.city) {
        query = query.ilike('city', `%${source.city}%`);
      }
      if (source.category) {
        query = query.ilike('category', `%${source.category}%`);
      }

      const { data: candidates } = await query;

      if (!candidates) return [];

      // Score candidates based on multiple factors
      const scored = candidates.map((dest: any) => {
        let score = 0;

        // Category match
        if (dest.category?.toLowerCase() === source.category?.toLowerCase()) score += 0.3;

        // Price level similarity
        const priceDiff = Math.abs((dest.price_level || 2) - (source.price_level || 2));
        score += (4 - priceDiff) * 0.1;

        // Both have or don't have Michelin stars
        if ((dest.michelin_stars > 0) === (source.michelin_stars > 0)) score += 0.15;

        // Both have or don't have architect
        if ((!!dest.architect_name) === (!!source.architect_name)) score += 0.1;

        // Vibe tag overlap
        if (dest.vibe_tags && source.vibe_tags) {
          const overlap = dest.vibe_tags.filter((t: string) =>
            source.vibe_tags.includes(t)
          ).length;
          score += overlap * 0.1;
        }

        // Rating similarity
        const ratingDiff = Math.abs((dest.rating || 0) - (source.rating || 0));
        score += (5 - ratingDiff) * 0.05;

        // Taste fingerprint boost
        if (intelligenceContext?.tasteFingerprint) {
          const taste = intelligenceContext.tasteFingerprint;
          if (dest.architect_name && taste.designSensitivity > 0.6) score += 0.1;
          if (!dest.michelin_stars && taste.authenticitySeeker > 0.6) score += 0.1;
        }

        return { destination: dest, score: Math.min(1, score) };
      });

      // Sort by score and take top results
      scored.sort((a: { destination: any; score: number }, b: { destination: any; score: number }) => b.score - a.score);

      return scored.slice(0, limit).map((item: { destination: any; score: number }) => ({
        destination: item.destination,
        reasoning: {
          primaryReason: `Similar to ${source.name}`,
          factors: [
            {
              type: 'similar' as const,
              description: `Matches ${source.name}'s style and vibe`,
              strength: item.score > 0.7 ? 'strong' as const : 'moderate' as const,
            },
            ...(item.destination.category === source.category ? [{
              type: 'similar' as const,
              description: `Same category: ${source.category}`,
              strength: 'moderate' as const,
            }] : []),
          ],
          matchScore: item.score,
        },
      }));
    } catch (error) {
      console.error('Error in embedding-based similarity search:', error);
      return [];
    }
  }

  // ============================================
  // MULTI-CITY PLANNING
  // ============================================

  /**
   * Detect multi-city trip requests
   */
  private detectMultiCityRequest(message: string): {
    isMultiCity: boolean;
    cities: string[];
    tripType?: 'roundtrip' | 'one-way' | 'circuit';
  } {
    const lowerMessage = message.toLowerCase();

    // Common city combinations
    const knownCities = [
      'tokyo', 'kyoto', 'osaka', 'paris', 'london', 'berlin', 'barcelona',
      'rome', 'florence', 'venice', 'amsterdam', 'vienna', 'prague',
      'new york', 'los angeles', 'san francisco', 'miami', 'chicago',
      'bangkok', 'singapore', 'hong kong', 'seoul', 'taipei',
      'sydney', 'melbourne', 'lisbon', 'madrid', 'munich', 'copenhagen',
    ];

    // Patterns for multi-city
    const multiCityPatterns = [
      /\b(\w+)\s+and\s+(\w+)\s+(trip|itinerary|vacation|holiday)/i,
      /\b(trip|itinerary|vacation|holiday)\s+to\s+(\w+)\s+and\s+(\w+)/i,
      /\b(visiting|going\s+to|traveling\s+to)\s+(\w+)\s+and\s+(\w+)/i,
      /\b(\w+)\s*[,&]\s*(\w+)(?:\s*[,&]\s*(\w+))?\s+(trip|itinerary)/i,
      /\b(between|from)\s+(\w+)\s+(and|to)\s+(\w+)/i,
    ];

    const foundCities: string[] = [];

    // Check each known city mentioned
    for (const city of knownCities) {
      if (lowerMessage.includes(city)) {
        foundCities.push(city);
      }
    }

    // Also check for "multiple cities" or "multi-city" keywords
    const hasMultiCityKeyword = /\b(multi-?city|multiple\s+cities|several\s+cities|city\s+hopping)\b/i.test(lowerMessage);

    if (foundCities.length >= 2 || hasMultiCityKeyword) {
      // Determine trip type
      let tripType: 'roundtrip' | 'one-way' | 'circuit' = 'one-way';
      if (/\b(round\s*trip|return|back\s+to)\b/i.test(lowerMessage)) {
        tripType = 'roundtrip';
      } else if (/\b(circuit|loop|tour)\b/i.test(lowerMessage)) {
        tripType = 'circuit';
      }

      return {
        isMultiCity: true,
        cities: foundCities,
        tripType,
      };
    }

    return { isMultiCity: false, cities: [] };
  }

  /**
   * Build multi-city itinerary with logical flow between cities
   */
  async buildMultiCityItinerary(
    cities: string[],
    session: ConversationSession,
    intelligenceContext: UnifiedContext | null,
    daysPerCity: number = 2
  ): Promise<MultiCityPlan> {
    const cityPlans: CityPlan[] = [];

    for (const city of cities) {
      // Build itinerary for each city
      const itinerary = await this.buildItinerary(
        city,
        daysPerCity === 1 ? 'day' : 'weekend',
        session,
        intelligenceContext
      );

      // Get city highlights
      const highlights = await this.getCityHighlights(city);

      cityPlans.push({
        city,
        days: daysPerCity,
        itinerary,
        highlights,
        transitTo: cities[cities.indexOf(city) + 1] || null,
      });
    }

    // Calculate total duration
    const totalDays = cityPlans.reduce((sum, c) => sum + c.days, 0);

    return {
      cities: cityPlans,
      totalDays,
      route: cities,
      suggestedTransit: this.suggestTransitOptions(cities),
    };
  }

  /**
   * Get city highlights for overview
   */
  private async getCityHighlights(city: string): Promise<string[]> {
    if (!this.supabase) return [];

    try {
      const { data: topRated } = await this.supabase
        .from('destinations')
        .select('name, category')
        .ilike('city', `%${city}%`)
        .is('parent_destination_id', null)
        .order('rating', { ascending: false })
        .limit(5);

      if (!topRated) return [];

      return topRated.map((d: any) => `${d.name} (${d.category})`);
    } catch {
      return [];
    }
  }

  /**
   * Suggest transit options between cities
   */
  private suggestTransitOptions(cities: string[]): TransitSuggestion[] {
    const suggestions: TransitSuggestion[] = [];

    // Known transit options between popular city pairs
    const transitMap: Record<string, { mode: string; duration: string; tip: string }> = {
      'tokyo-kyoto': { mode: 'Shinkansen', duration: '2h 15m', tip: 'Reserve seats on Nozomi train' },
      'tokyo-osaka': { mode: 'Shinkansen', duration: '2h 30m', tip: 'JR Pass covers this route' },
      'kyoto-osaka': { mode: 'Train', duration: '30m', tip: 'Easy day trip distance' },
      'paris-london': { mode: 'Eurostar', duration: '2h 20m', tip: 'Book early for best fares' },
      'rome-florence': { mode: 'High-speed train', duration: '1h 30m', tip: 'Frecce trains are fastest' },
      'florence-venice': { mode: 'High-speed train', duration: '2h', tip: 'Beautiful scenic route' },
      'barcelona-madrid': { mode: 'AVE train', duration: '2h 30m', tip: 'Very comfortable journey' },
      'amsterdam-paris': { mode: 'Thalys', duration: '3h 15m', tip: 'Book in advance' },
      'vienna-prague': { mode: 'Train', duration: '4h', tip: 'Scenic route through countryside' },
    };

    for (let i = 0; i < cities.length - 1; i++) {
      const pair = `${cities[i]}-${cities[i + 1]}`;
      const reversePair = `${cities[i + 1]}-${cities[i]}`;

      const transit = transitMap[pair] || transitMap[reversePair];
      if (transit) {
        suggestions.push({
          from: cities[i],
          to: cities[i + 1],
          mode: transit.mode,
          duration: transit.duration,
          tip: transit.tip,
        });
      } else {
        suggestions.push({
          from: cities[i],
          to: cities[i + 1],
          mode: 'Check local options',
          duration: 'varies',
        });
      }
    }

    return suggestions;
  }

  // ============================================
  // COMPANION/GROUP AWARENESS
  // ============================================

  /**
   * Detect travel companion context from message
   */
  private detectTravelCompanion(message: string): TravelCompanion | null {
    const lowerMessage = message.toLowerCase();

    // Kids/Family detection
    if (/\b(with\s+(kids?|children|family|toddler|baby)|family\s+trip|kid-?friendly|child-?friendly)\b/i.test(lowerMessage)) {
      const companion: TravelCompanion = {
        type: 'family',
        hasKids: true,
      };

      // Try to extract ages
      const ageMatch = lowerMessage.match(/(\d+)\s*(year|yr|yo)?s?\s*old/i);
      if (ageMatch) {
        companion.kidsAges = [parseInt(ageMatch[1])];
      }

      // Detect if toddler/baby
      if (/\b(toddler|baby|infant)\b/i.test(lowerMessage)) {
        companion.kidsAges = [2];  // Default young age
      }

      return companion;
    }

    // Couple/Romantic detection
    if (/\b(romantic|date\s+night|anniversary|honeymoon|couple|with\s+(my\s+)?(partner|wife|husband|girlfriend|boyfriend))\b/i.test(lowerMessage)) {
      return {
        type: 'couple',
        vibe: 'romantic',
      };
    }

    // Friends/Group detection
    if (/\b(with\s+friends|group\s+trip|bachelor|bachelorette|guys\s+trip|girls\s+trip)\b/i.test(lowerMessage)) {
      const companion: TravelCompanion = {
        type: 'friends',
      };

      // Party vibe detection
      if (/\b(party|nightlife|bars|clubs|celebrate)\b/i.test(lowerMessage)) {
        companion.vibe = 'party';
      }

      // Group size
      const sizeMatch = lowerMessage.match(/(\d+)\s*(people|friends|of\s+us)/i);
      if (sizeMatch) {
        companion.groupSize = parseInt(sizeMatch[1]);
      }

      return companion;
    }

    // Business detection
    if (/\b(business\s+trip|client|meeting|conference|work\s+trip|colleagues)\b/i.test(lowerMessage)) {
      return {
        type: 'business',
        vibe: 'cultural',  // Usually prefer sophisticated options
      };
    }

    // Solo detection
    if (/\b(solo|alone|by\s+myself|traveling\s+alone)\b/i.test(lowerMessage)) {
      return {
        type: 'solo',
      };
    }

    // Special needs detection
    const specialNeeds: string[] = [];
    if (/\b(vegetarian|vegan|plant-?based)\b/i.test(lowerMessage)) {
      specialNeeds.push('vegetarian');
    }
    if (/\b(allerg(y|ies)|gluten-?free|celiac)\b/i.test(lowerMessage)) {
      specialNeeds.push('allergies');
    }
    if (/\b(wheelchair|accessible|mobility)\b/i.test(lowerMessage)) {
      specialNeeds.push('wheelchair');
    }

    if (specialNeeds.length > 0) {
      return {
        type: 'solo',  // Default, but with special needs
        specialNeeds,
      };
    }

    return null;
  }

  /**
   * Apply companion-aware filtering to results
   */
  private applyCompanionFilters(
    destinations: any[],
    companion: TravelCompanion
  ): any[] {
    return destinations.map(dest => {
      let boost = 0;
      let penalty = 0;

      switch (companion.type) {
        case 'family':
          // Boost family-friendly places
          if (dest.category?.toLowerCase() === 'museum') boost += 0.2;
          if (dest.category?.toLowerCase() === 'cafe') boost += 0.1;
          if (dest.vibe_tags?.includes('family-friendly')) boost += 0.3;
          // Penalize bars and nightlife for families with kids
          if (companion.hasKids) {
            if (dest.category?.toLowerCase() === 'bar') penalty += 0.5;
            if (dest.vibe_tags?.includes('nightlife')) penalty += 0.5;
            // Penalize very expensive restaurants for families
            if (dest.price_level >= 4) penalty += 0.2;
          }
          break;

        case 'couple':
          // Boost romantic places
          if (dest.vibe_tags?.includes('romantic')) boost += 0.3;
          if (dest.vibe_tags?.includes('intimate')) boost += 0.2;
          if (dest.vibe_tags?.includes('rooftop')) boost += 0.15;
          if (dest.category?.toLowerCase() === 'restaurant' && dest.price_level >= 3) boost += 0.2;
          // Penalize loud/party places for romantic trips
          if (dest.vibe_tags?.includes('lively') || dest.vibe_tags?.includes('party')) penalty += 0.2;
          break;

        case 'friends':
          // Boost social/group-friendly places
          if (dest.category?.toLowerCase() === 'bar') boost += 0.2;
          if (dest.vibe_tags?.includes('lively')) boost += 0.2;
          if (dest.vibe_tags?.includes('party') && companion.vibe === 'party') boost += 0.3;
          // Group-friendly restaurants
          if (dest.category?.toLowerCase() === 'restaurant') boost += 0.1;
          break;

        case 'business':
          // Boost sophisticated/professional places
          if (dest.michelin_stars > 0) boost += 0.3;
          if (dest.vibe_tags?.includes('elegant')) boost += 0.2;
          if (dest.vibe_tags?.includes('refined')) boost += 0.2;
          if (dest.price_level >= 3) boost += 0.15;
          // Penalize very casual places
          if (dest.vibe_tags?.includes('casual')) penalty += 0.1;
          break;

        case 'solo':
          // Boost solo-friendly (bar seating, communal tables)
          if (dest.vibe_tags?.includes('counter-seating')) boost += 0.2;
          if (dest.category?.toLowerCase() === 'cafe') boost += 0.15;
          break;
      }

      // Apply special needs filters
      if (companion.specialNeeds?.includes('vegetarian')) {
        if (dest.tags?.includes('vegetarian-friendly') || dest.tags?.includes('vegan')) {
          boost += 0.3;
        }
      }
      if (companion.specialNeeds?.includes('wheelchair')) {
        if (dest.tags?.includes('accessible') || dest.tags?.includes('wheelchair-accessible')) {
          boost += 0.3;
        }
      }

      dest._companionScore = (dest._smartScore || dest.rating || 0) + boost - penalty;
      return dest;
    }).sort((a, b) => (b._companionScore || 0) - (a._companionScore || 0));
  }

  /**
   * Generate companion-aware response text
   */
  private generateCompanionAwareResponse(companion: TravelCompanion): string {
    switch (companion.type) {
      case 'family':
        if (companion.hasKids) {
          const ageNote = companion.kidsAges
            ? ` (great for ages ${companion.kidsAges.join(', ')})`
            : '';
          return `I've selected family-friendly options${ageNote}. These places are welcoming to children and have a relaxed atmosphere.`;
        }
        return 'Here are some family-friendly options that work well for groups.';

      case 'couple':
        return 'I\'ve found some romantic spots perfect for a special outing. These places have intimate atmospheres and are great for quality time together.';

      case 'friends':
        if (companion.vibe === 'party') {
          return 'Here are some lively spots perfect for a night out with friends!';
        }
        return 'These are great places to enjoy with friends - good vibes and social atmospheres.';

      case 'business':
        return 'I\'ve selected refined options suitable for business settings. These places offer excellent service and professional atmospheres.';

      case 'solo':
        return 'These are great solo-friendly spots with welcoming atmospheres, some with counter seating or communal tables.';

      default:
        return '';
    }
  }

  // ============================================
  // STREAMING SUPPORT
  // ============================================

  /**
   * Process message with streaming support
   * Returns an async generator for SSE streaming
   */
  async *processMessageStreaming(
    sessionId: string | null,
    userId: string | undefined,
    message: string,
    options?: {
      includeProactiveActions?: boolean;
      maxDestinations?: number;
    }
  ): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();

    // Get or create session
    const session = await this.getOrCreateSession(sessionId, userId);
    const turnNumber = session.messages.length + 1;

    // Add user message
    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    session.messages.push(userMessage);

    // Yield session info immediately
    yield {
      type: 'session',
      data: { sessionId: session.id, turnNumber },
    };

    // 1. Understand the query
    yield { type: 'status', data: { status: 'understanding' } };
    const intent = await this.understandQueryWithContext(message, session);

    yield {
      type: 'intent',
      data: intent,
    };

    // 2. Check for companion context
    const companion = this.detectTravelCompanion(message);
    if (companion) {
      session.context.travelCompanion = companion;
      yield {
        type: 'companion',
        data: companion,
      };
    }

    // 3. Check for multi-city
    const multiCity = this.detectMultiCityRequest(message);
    if (multiCity.isMultiCity) {
      session.context.cities = multiCity.cities;
      session.context.isMultiCity = true;
      yield {
        type: 'multicity',
        data: multiCity,
      };
    }

    // 4. Check for similar place request
    const similarRequest = this.detectSimilarPlaceRequest(message);

    // 5. Get intelligence context
    yield { type: 'status', data: { status: 'personalizing' } };
    let intelligenceContext: UnifiedContext | null = null;
    if (userId) {
      try {
        const result = await unifiedIntelligenceCore.processIntelligentQuery(
          message,
          userId,
          session.id,
          { currentCity: intent.city || session.context.currentCity }
        );
        intelligenceContext = result.context;
      } catch (error) {
        console.error('Error getting intelligence context:', error);
      }
    }

    // 6. Search for destinations
    yield { type: 'status', data: { status: 'searching' } };
    let searchResults: any[] = [];

    if (similarRequest.isSimilarRequest && similarRequest.referencedPlace) {
      // Similar place search
      searchResults = await this.findSimilarPlaces(
        similarRequest.referencedPlace,
        session,
        intelligenceContext,
        options?.maxDestinations || 10
      );
    } else if (multiCity.isMultiCity) {
      // Multi-city: get highlights from each city
      for (const city of multiCity.cities) {
        yield { type: 'status', data: { status: `Exploring ${city}...` } };
        const cityResults = await this.intelligentSearch(
          message,
          { ...intent, city },
          session,
          intelligenceContext,
          Math.floor((options?.maxDestinations || 10) / multiCity.cities.length)
        );
        searchResults.push(...cityResults);
      }
    } else {
      // Standard search
      searchResults = await this.intelligentSearch(
        message,
        intent,
        session,
        intelligenceContext,
        options?.maxDestinations || 10
      );
    }

    // 7. Apply companion filters if present
    if (session.context.travelCompanion) {
      searchResults = this.applyCompanionFilters(
        searchResults,
        session.context.travelCompanion
      );
    }

    // 8. Stream destinations one by one
    yield { type: 'status', data: { status: 'curating' } };

    for (let i = 0; i < searchResults.length; i++) {
      const dest = searchResults[i];
      const reasoning = this.generateRecommendationReasoning(
        dest.destination || dest,
        session,
        intelligenceContext,
        intent
      );

      yield {
        type: 'destination',
        data: {
          index: i,
          total: searchResults.length,
          destination: dest.destination || dest,
          reasoning: dest.reasoning || reasoning,
        },
      };

      // Small delay between destinations for UX
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 9. Generate response text
    yield { type: 'status', data: { status: 'composing' } };

    // Stream response text word by word
    const responseText = await this.generateSmartResponse(
      message,
      intent,
      searchResults.map(r => r.destination || r),
      session,
      intelligenceContext
    );

    // Add companion-aware note if applicable
    const companionNote = session.context.travelCompanion
      ? '\n\n' + this.generateCompanionAwareResponse(session.context.travelCompanion)
      : '';

    const fullResponse = responseText + companionNote;
    const words = fullResponse.split(/(\s+)/);

    for (const word of words) {
      yield {
        type: 'text',
        data: { text: word },
      };
      // Small delay for streaming effect
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    // 10. Generate suggestions
    const suggestions = await this.generateSmartSuggestions(
      intent,
      searchResults.map(r => r.destination || r),
      session,
      intelligenceContext
    );

    yield {
      type: 'suggestions',
      data: suggestions,
    };

    // 11. Update session and complete
    this.updateSessionContext(session, intent, searchResults.map(r => r.destination || r));

    const assistantMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date(),
      metadata: {
        intent,
        destinations: searchResults.map((d: any) => (d.destination || d).slug),
        responseTime: Date.now() - startTime,
      },
    };
    session.messages.push(assistantMessage);
    session.lastActive = new Date();

    await this.persistSession(session);

    yield {
      type: 'complete',
      data: {
        sessionId: session.id,
        turnNumber,
        responseTime: Date.now() - startTime,
      },
    };
  }
}

// Itinerary types
export interface ItineraryPlan {
  slots: ItinerarySlot[];
  totalDuration: number;  // minutes
  walkingTime: number;  // minutes
  city?: string;
  neighborhood?: string;
}

export interface ItinerarySlot {
  time: string;
  timeLabel: string;
  destination: any;
  duration: number;  // minutes
  activity: string;
  reasoning: RecommendationReasoning;
  walkingTimeFromPrevious?: number;
}

// Multi-city planning types
export interface MultiCityPlan {
  cities: CityPlan[];
  totalDays: number;
  route: string[];
  suggestedTransit: TransitSuggestion[];
}

export interface CityPlan {
  city: string;
  days: number;
  itinerary: ItineraryPlan;
  highlights: string[];
  transitTo: string | null;
}

export interface TransitSuggestion {
  from: string;
  to: string;
  mode: string;
  duration: string;
  tip?: string;
}

// Streaming types
export interface StreamChunk {
  type: 'session' | 'status' | 'intent' | 'companion' | 'multicity' | 'destination' | 'text' | 'suggestions' | 'complete';
  data: any;
}

// Export singleton instance
export const smartConversationEngine = new SmartConversationEngine();
