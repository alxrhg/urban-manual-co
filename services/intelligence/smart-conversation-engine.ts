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

export interface SmartResponse {
  content: string;
  destinations: any[];
  suggestions: SmartSuggestion[];
  contextualHints: string[];
  proactiveActions?: ProactiveAction[];
  conversationId: string;
  turnNumber: number;
  intent: QueryIntent;
  confidence: number;
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

    // 7. Generate contextual hints
    const hints = this.generateContextualHints(
      session,
      intelligenceContext,
      searchResults
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
    };
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

    // Use LLM for intent extraction
    const systemPrompt = `You are analyzing a travel search query in context of an ongoing conversation.

CONVERSATION HISTORY:
${conversationContext}

CONTEXT:
${session.context.currentCity ? `Current focus city: ${session.context.currentCity}` : ''}
${session.context.currentCategory ? `Current category: ${session.context.currentCategory}` : ''}
${shownContext}
${likedContext}
${session.context.previousConversationInsights?.length ? `From previous conversations: ${session.context.previousConversationInsights.join('; ')}` : ''}

Extract structured information. For follow-up queries like "more", "similar", "another", infer from conversation context.
For contrast queries like "something different", "not like that", understand what to avoid.
For refinement queries like "but cheaper", "with outdoor seating", add to existing filters.

Return ONLY valid JSON:
{
  "keywords": ["array", "of", "keywords"],
  "city": "city name or null",
  "category": "category or null",
  "filters": {
    "priceLevel": 1-4 or null,
    "rating": 4-5 or null,
    "michelinStar": 1-3 or null
  },
  "intent": "brief description of what user wants",
  "confidence": 0.0-1.0,
  "clarifications": ["questions if ambiguous"],
  "isFollowUp": true/false,
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
        return {
          ...parsed,
          isFollowUp,
          referencesPrevious,
        };
      }
    } catch (error) {
      console.error('Error in LLM intent extraction:', error);
    }

    // Fallback to rule-based extraction
    return this.fallbackIntentExtraction(message, session, isFollowUp, referencesPrevious);
  }

  private detectFollowUp(message: string): boolean {
    const followUpPatterns = [
      /^(more|another|similar|like that|same|again)/i,
      /^(show me more|give me more|what else)/i,
      /^(any other|anything else|something similar)/i,
    ];
    return followUpPatterns.some(p => p.test(message));
  }

  private detectPreviousReference(message: string, session: ConversationSession): boolean {
    const referencePatterns = [
      /\b(that|those|them|it|the one|the place)\b/i,
      /\b(you (just )?showed|you mentioned|from before)\b/i,
      /\b(first one|second one|last one)\b/i,
    ];
    return referencePatterns.some(p => p.test(message)) && session.messages.length > 0;
  }

  private fallbackIntentExtraction(
    message: string,
    session: ConversationSession,
    isFollowUp: boolean,
    referencesPrevious: boolean
  ): QueryIntent {
    const lowerMessage = message.toLowerCase();

    // Extract city
    const cityNames = ['tokyo', 'paris', 'london', 'new york', 'berlin', 'barcelona', 'rome', 'amsterdam', 'vienna', 'prague', 'lisbon', 'miami', 'los angeles', 'san francisco'];
    let city = cityNames.find(c => lowerMessage.includes(c));

    // Use session context for follow-ups
    if (!city && isFollowUp && session.context.currentCity) {
      city = session.context.currentCity;
    }

    // Extract category
    const categories = ['restaurant', 'cafe', 'hotel', 'bar', 'museum', 'gallery', 'culture'];
    let category = categories.find(c => lowerMessage.includes(c));
    if (!category && isFollowUp && session.context.currentCategory) {
      category = session.context.currentCategory;
    }

    const keywords = message.split(/\s+/)
      .filter(w => w.length > 2 && !city?.includes(w) && !category?.includes(w));

    return {
      keywords,
      city,
      category,
      intent: `Finding ${category || 'places'}${city ? ` in ${city}` : ''}`,
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
    results: any[]
  ): string[] {
    const hints: string[] = [];

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

    return hints.slice(0, 2);
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
}

// Export singleton instance
export const smartConversationEngine = new SmartConversationEngine();
