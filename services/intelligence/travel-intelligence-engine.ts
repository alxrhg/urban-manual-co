/**
 * Travel Intelligence Engine
 * The core brain of Urban Manual's conversational AI
 * Uses Google Discovery Engine for personalized search
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { openai, getModelForQuery } from '@/lib/openai';
import { createServerClient } from '@/lib/supabase/server';
import { embedText } from '@/lib/llm';
import {
  ConversationMode,
  TravelContext,
  TRAVEL_INTELLIGENCE_SYSTEM_PROMPT,
  MODE_PROMPTS,
} from '@/lib/ai/travel-intelligence';
import { knowledgeGraphService } from '@/services/intelligence/knowledge-graph';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { unifiedSearch, trackUserEvent, isDiscoveryEngineAvailable } from '@/lib/discovery-engine/integration';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  destinations?: any[];
  context?: TravelContext;
}

export interface ProcessResult {
  response: string;
  destinations: any[];
  mode: ConversationMode;
  context: TravelContext;
  suggestions?: Array<{
    text: string;
    type: 'refine' | 'expand' | 'related' | 'next-step';
  }>;
  insights?: Array<{
    type: string;
    content: string;
  }>;
}

/**
 * Intent types for conversational flow
 *
 * KEY INSIGHT: The AI should be CONVERSATIONAL, not QUERY-STACKING.
 *
 * Example of GOOD conversational flow:
 * - User: "hotel in tokyo" → Search for hotels in Tokyo
 * - User: "something budget" → Understand this REFERS to the previous hotels, filter by budget
 * - User: "near shibuya" → Understand this MODIFIES the search, add neighborhood filter
 *
 * Example of BAD query-stacking (what we want to avoid):
 * - User: "hotel in tokyo" → Query: "hotel in tokyo"
 * - User: "something budget" → Query: "hotel in tokyo something budget" (BAD!)
 * - User: "near shibuya" → Query: "hotel in tokyo something budget near shibuya" (BAD!)
 *
 * The difference: conversational AI UNDERSTANDS the intent, query-stacking just concatenates.
 */
type MessageIntent =
  | 'search'        // User wants to find NEW places (contains explicit city/category)
  | 'followup'      // Asking about shown places: "tell me more", "which one?"
  | 'refine'        // Modify current results: "something cheaper", "near shibuya"
  | 'clarify'       // Answering a clarification question
  | 'conversational'; // Greetings, thanks, general chat

interface NLUResult {
  intent: MessageIntent;
  mode: ConversationMode;
  context: TravelContext;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
  continueConversation?: boolean; // True = don't search, just respond
  isNewTopic?: boolean; // True = user is starting a fresh search (e.g., new city/category)
  searchQuery?: string; // The CLEAN search query to use (not accumulated)
}

/**
 * LRU Cache for performance
 */
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttlMs: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export class TravelIntelligenceEngine {
  private genAI: GoogleGenerativeAI | null = null;
  private contextCache = new SimpleCache<TravelContext>(50, 10 * 60 * 1000);
  private destinationCache = new SimpleCache<any[]>(100, 5 * 60 * 1000);

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Main entry point: process a user message
   *
   * CONVERSATIONAL APPROACH:
   * - Each message is understood IN CONTEXT of the conversation
   * - We DON'T stack/concatenate queries
   * - Instead, we understand what the user MEANS and build appropriate searches
   *
   * Examples:
   * - "hotel in tokyo" → Search: hotels in Tokyo
   * - "something budget" → User means: budget hotels in Tokyo (from context)
   * - "near shibuya" → User means: budget hotels near Shibuya in Tokyo
   */
  async processMessage(
    message: string,
    conversationHistory: ConversationMessage[] = [],
    userId?: string,
    existingContext?: TravelContext
  ): Promise<ProcessResult> {
    try {
      console.log('[TravelIntelligence] ========== NEW REQUEST ==========');
      console.log('[TravelIntelligence] Message:', message);
      console.log('[TravelIntelligence] History length:', conversationHistory.length);
      console.log('[TravelIntelligence] Existing context:', existingContext);

      // Step 1: CONVERSATIONAL NLU - Understand the message in context
      const nluResult = await this.understandQuery(message, conversationHistory, existingContext);

      console.log('[TravelIntelligence] NLU Result:', {
        intent: nluResult.intent,
        mode: nluResult.mode,
        context: nluResult.context,
        confidence: nluResult.confidence,
        continueConversation: nluResult.continueConversation,
        isNewTopic: nluResult.isNewTopic,
        searchQuery: nluResult.searchQuery,
      });

      // Get previous destinations from conversation for follow-up/refine intents
      const previousDestinations = this.getPreviousDestinations(conversationHistory);

      let destinations: any[] = [];
      let response: string;
      let finalContext = nluResult.context;

      // Handle different intents with TRUE conversational understanding
      if (nluResult.continueConversation || nluResult.intent === 'conversational') {
        // Pure conversational - just respond, no search
        console.log('[TravelIntelligence] Conversational intent - no search needed');
        response = await this.generateConversationalResponse(
          message,
          nluResult.context,
          conversationHistory
        );
      } else if (nluResult.intent === 'followup' && previousDestinations.length > 0) {
        // Follow-up about shown destinations - discuss them without new search
        console.log('[TravelIntelligence] Follow-up intent - discussing previous destinations');
        destinations = previousDestinations;
        response = await this.generateFollowUpResponse(
          message,
          previousDestinations,
          nluResult.context,
          conversationHistory
        );
      } else if (nluResult.intent === 'refine' && previousDestinations.length > 0) {
        // REFINE: User wants to modify the current search
        // E.g., "something budget" or "near shibuya" after "hotels in tokyo"
        console.log('[TravelIntelligence] Refine intent - searching with updated context');

        // First try filtering existing results
        destinations = this.refineDestinations(previousDestinations, nluResult.context);

        if (destinations.length < 3) {
          // Not enough after filtering, do a new search with UNDERSTOOD context
          // DON'T use raw message - use the searchQuery which is contextually understood
          const searchQuery = nluResult.searchQuery || this.buildContextualSearchQuery(nluResult.context);
          console.log('[TravelIntelligence] Contextual search query:', searchQuery);

          destinations = await this.findRelevantDestinations(
            searchQuery,
            nluResult.context,
            nluResult.mode,
            userId
          );
        }

        response = await this.generateResponse(
          message,
          destinations,
          nluResult.context,
          nluResult.mode,
          conversationHistory,
          nluResult.needsClarification ? nluResult.clarificationQuestion : undefined
        );
      } else {
        // SEARCH: New search request
        // Check if this is a completely NEW topic or continuing the current topic
        let searchQuery = message;

        if (!nluResult.isNewTopic && conversationHistory.length > 0) {
          // Not a new topic - use context to enhance the search
          searchQuery = nluResult.searchQuery || this.buildContextualSearchQuery(nluResult.context);
          console.log('[TravelIntelligence] Continuing topic, contextual query:', searchQuery);
        } else {
          console.log('[TravelIntelligence] New topic, using raw message');
          // Reset context for new topic
          finalContext = {
            city: nluResult.context.city,
            category: nluResult.context.category,
            neighborhood: nluResult.context.neighborhood,
          };
        }

        destinations = await this.findRelevantDestinations(
          searchQuery,
          finalContext,
          nluResult.mode,
          userId
        );

        console.log('[TravelIntelligence] Found', destinations.length, 'destinations');

        // Generate intelligent response
        response = await this.generateResponse(
          message,
          destinations,
          finalContext,
          nluResult.mode,
          conversationHistory,
          nluResult.needsClarification ? nluResult.clarificationQuestion : undefined
        );
      }

      // Generate follow-up suggestions
      const suggestions = this.generateSuggestions(finalContext, nluResult.mode, destinations);

      // Extract insights if appropriate
      const insights = this.extractInsights(destinations, finalContext, nluResult.mode);

      return {
        response,
        destinations: destinations.slice(0, 12),
        mode: nluResult.mode,
        context: finalContext,
        suggestions,
        insights,
      };
    } catch (error) {
      console.error('[TravelIntelligence] Error processing message:', error);
      return {
        response: "I'm having trouble processing that request. Could you rephrase what you're looking for?",
        destinations: [],
        mode: 'discover',
        context: existingContext || {},
      };
    }
  }

  /**
   * Build a clean search query from context
   * This is used for REFINE/continuation queries where we don't want to use the raw message
   */
  private buildContextualSearchQuery(context: TravelContext): string {
    const parts: string[] = [];

    if (context.category) {
      parts.push(context.category.toLowerCase());
    }
    if (context.city) {
      parts.push(`in ${context.city}`);
    }
    if (context.neighborhood) {
      parts.push(`near ${context.neighborhood}`);
    }
    if (context.pricePreference) {
      parts.push(context.pricePreference);
    }
    if (context.occasion) {
      parts.push(context.occasion);
    }
    if (context.vibes?.length) {
      parts.push(context.vibes.join(' '));
    }

    return parts.join(' ') || 'places to visit';
  }

  /**
   * Extract destinations from previous assistant messages
   */
  private getPreviousDestinations(history: ConversationMessage[]): any[] {
    // Look at last few assistant messages for destinations
    const recentAssistantMessages = history
      .filter((m) => m.role === 'assistant' && m.destinations?.length)
      .slice(-3);

    if (recentAssistantMessages.length === 0) return [];

    // Get unique destinations from recent messages
    const seen = new Set<string>();
    const destinations: any[] = [];

    for (const msg of recentAssistantMessages.reverse()) {
      for (const dest of msg.destinations || []) {
        if (!seen.has(dest.slug)) {
          seen.add(dest.slug);
          destinations.push(dest);
        }
      }
    }

    return destinations;
  }

  /**
   * Filter destinations based on new context
   */
  private refineDestinations(destinations: any[], context: TravelContext): any[] {
    return destinations.filter((dest) => {
      // Price filter
      if (context.pricePreference) {
        const priceMap: Record<string, number> = { budget: 1, moderate: 2, upscale: 3, splurge: 4 };
        const targetPrice = priceMap[context.pricePreference] || 2;
        if (dest.price_level && Math.abs(dest.price_level - targetPrice) > 1) {
          return false;
        }
      }

      // Vibe filter
      if (context.vibes?.length) {
        const destTags = (dest.tags || []).map((t: string) => t.toLowerCase());
        const destDesc = (dest.description || '').toLowerCase();
        const hasMatchingVibe = context.vibes.some(
          (v) => destTags.includes(v.toLowerCase()) || destDesc.includes(v.toLowerCase())
        );
        // Prefer matches but don't exclude everything
        if (!hasMatchingVibe && destinations.length > 3) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Generate a purely conversational response (no destinations)
   */
  private async generateConversationalResponse(
    message: string,
    context: TravelContext,
    history: ConversationMessage[]
  ): Promise<string> {
    const recentHistory = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n');

    const prompt = `You are Urban Manual's Travel Intelligence - a knowledgeable, friendly travel concierge.

CONVERSATION HISTORY:
${recentHistory}

USER MESSAGE: "${message}"

CURRENT CONTEXT:
${JSON.stringify(context, null, 2)}

Respond naturally and conversationally. This is a follow-up or casual message, not a search request.
- If they're thanking you, acknowledge warmly
- If they're asking about something you mentioned, expand on it
- If they're making small talk, be friendly but gently guide toward travel help
- Keep your response concise and natural
- Feel free to ask what else you can help them discover`;

    // Try OpenAI
    if (openai?.chat) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 200,
        });
        const content = response.choices?.[0]?.message?.content;
        if (content) return content.trim();
      } catch (error) {
        console.warn('[TravelIntelligence] OpenAI conversational response failed:', error);
      }
    }

    // Fallback to Gemini
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { temperature: 0.8, maxOutputTokens: 200 },
        });
        const result = await model.generateContent(prompt);
        const content = result.response.text();
        if (content) return content.trim();
      } catch (error) {
        console.warn('[TravelIntelligence] Gemini conversational response failed:', error);
      }
    }

    // Hardcoded fallback for common conversational patterns
    const lower = message.toLowerCase();
    if (lower.includes('thank') || lower.includes('thanks')) {
      return "You're welcome! Let me know if you'd like to explore more places or need any other recommendations.";
    }
    if (lower.includes('great') || lower.includes('perfect') || lower.includes('sounds good')) {
      return "Glad that resonates! Anything else you'd like to discover? I'm here to help you find the perfect spots.";
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return "Hello! I'm here to help you discover amazing places. What are you in the mood for?";
    }

    return "I'm here to help you discover amazing places. What kind of experience are you looking for?";
  }

  /**
   * Generate a follow-up response about previously shown destinations
   */
  private async generateFollowUpResponse(
    message: string,
    destinations: any[],
    context: TravelContext,
    history: ConversationMessage[]
  ): Promise<string> {
    const recentHistory = history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n');

    const destinationSummary = destinations.slice(0, 5).map((d) => ({
      name: d.name,
      city: d.city,
      category: d.category,
      description: d.micro_description || d.description?.substring(0, 150),
      rating: d.rating,
      michelin_stars: d.michelin_stars,
    }));

    const prompt = `You are Urban Manual's Travel Intelligence - a knowledgeable travel editor.

RECENT CONVERSATION:
${recentHistory}

DESTINATIONS WE'VE DISCUSSED:
${JSON.stringify(destinationSummary, null, 2)}

USER'S FOLLOW-UP: "${message}"

The user is asking a follow-up question about the places we've been discussing.
- Answer their specific question about these destinations
- Reference the places by name when relevant
- Be helpful and specific
- Keep it conversational
- If they want to know more about a specific place, elaborate`;

    // Try OpenAI
    if (openai?.chat) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 300,
        });
        const content = response.choices?.[0]?.message?.content;
        if (content) return content.trim();
      } catch (error) {
        console.warn('[TravelIntelligence] OpenAI follow-up response failed:', error);
      }
    }

    // Fallback to Gemini
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        });
        const result = await model.generateContent(prompt);
        const content = result.response.text();
        if (content) return content.trim();
      } catch (error) {
        console.warn('[TravelIntelligence] Gemini follow-up response failed:', error);
      }
    }

    // Fallback
    if (destinations.length > 0) {
      return `Among the places we discussed, ${destinations[0].name} is particularly noteworthy. Would you like more details about any specific one?`;
    }
    return "I'd be happy to tell you more. Which place caught your eye?";
  }

  /**
   * UNIFIED NLU: Understand the query - extract context AND detect mode together
   * This is the core natural language understanding step
   */
  private async understandQuery(
    message: string,
    history: ConversationMessage[],
    existingContext?: TravelContext
  ): Promise<NLUResult> {
    // Start with existing context
    const baseContext: TravelContext = { ...existingContext };

    // Build conversation summary
    const recentHistory = history.slice(-6).map((m) => `${m.role}: ${m.content}`).join('\n');

    // Step 1: Try AI-powered NLU
    const aiResult = await this.runAINLU(message, recentHistory, baseContext);

    if (aiResult && aiResult.confidence > 0.5) {
      console.log('[TravelIntelligence] AI NLU succeeded with confidence:', aiResult.confidence);
      return aiResult;
    }

    // Step 2: Fallback to rule-based NLU
    console.log('[TravelIntelligence] Falling back to rule-based NLU');
    return this.runRuleBasedNLU(message, baseContext);
  }

  /**
   * AI-powered NLU using LLM
   *
   * KEY: This must determine if the user is:
   * 1. Starting a NEW search topic (e.g., "hotels in tokyo" -> new topic)
   * 2. REFINING current search (e.g., "something budget" -> adds filter)
   * 3. Continuing conversation (e.g., "tell me more" -> no new search)
   */
  private async runAINLU(
    message: string,
    conversationSummary: string,
    existingContext: TravelContext
  ): Promise<NLUResult | null> {
    const prompt = `You are a CONVERSATIONAL travel assistant analyzer. Your job is to understand the user's message IN CONTEXT of the conversation.

CRITICAL: Do NOT stack/concatenate queries. Understand what the user MEANS.

EXISTING CONTEXT (what we've been discussing):
${JSON.stringify(existingContext, null, 2)}

CONVERSATION HISTORY:
${conversationSummary || 'None'}

CURRENT MESSAGE: "${message}"

Analyze and return JSON with this EXACT structure:
{
  "intent": "search" | "followup" | "refine" | "clarify" | "conversational",
  "isNewTopic": true or false,
  "searchQuery": "the clean search query to use (built from context + message)",
  "mode": "discover" | "plan" | "compare" | "insight" | "recommend" | "navigate",
  "confidence": 0.0 to 1.0,
  "city": "city name or null",
  "neighborhood": "neighborhood name or null (e.g., 'Shibuya', 'Le Marais', 'SoHo')",
  "category": "Hotel" | "Restaurant" | "Cafe" | "Bar" | "Culture" | "Shop" | null,
  "occasion": "romantic" | "business" | "celebration" | "casual" | "solo" | null,
  "timeOfDay": "breakfast" | "brunch" | "lunch" | "afternoon" | "dinner" | "late-night" | null,
  "pricePreference": "budget" | "moderate" | "upscale" | "splurge" | null,
  "vibes": ["array", "of", "vibes"] or [],
  "needsClarification": false,
  "continueConversation": true or false
}

INTENT + isNewTopic RULES:

1. NEW TOPIC (isNewTopic=true, intent=search):
   - User explicitly mentions a NEW city or category
   - Example: After discussing Tokyo hotels, user says "restaurants in Paris" → NEW TOPIC
   - Example: First message "hotels in tokyo" → NEW TOPIC (no history)

2. REFINE (isNewTopic=false, intent=refine):
   - User adds a modifier WITHOUT changing city/category
   - Example: "something budget" after "hotels in tokyo" → REFINE (inherit hotel+tokyo)
   - Example: "near shibuya" after "hotels in tokyo" → REFINE (add neighborhood)
   - For REFINE, the searchQuery should be built from CONTEXT + new modifier

3. FOLLOWUP (isNewTopic=false, intent=followup):
   - User asking about places already shown
   - "tell me more", "which one", "the first one", "why that one"

4. CONVERSATIONAL (intent=conversational):
   - Greetings, thanks, acknowledgments
   - "thanks", "great", "sounds good", "hello"

SEARCHQUERY RULES (very important):
- For NEW TOPIC: searchQuery = the user's message as-is
- For REFINE: searchQuery = combine existing context + new info
  Example: context={city:Tokyo, category:Hotel} + message="something budget"
  → searchQuery = "budget hotels in Tokyo"
  Example: context={city:Tokyo, category:Hotel, pricePreference:budget} + message="near shibuya"
  → searchQuery = "budget hotels in Tokyo near Shibuya"

NEIGHBORHOOD EXAMPLES:
- "near shibuya", "in shibuya" → neighborhood = "Shibuya"
- "daikanyama area" → neighborhood = "Daikanyama"
- "le marais" → neighborhood = "Le Marais"

CAPITALIZE properly:
- city: "tokyo" → "Tokyo"
- category: "hotel" → "Hotel"
- neighborhood: "shibuya" → "Shibuya"

Return ONLY the JSON, no explanation.`;

    try {
      let result: any = null;

      // Try OpenAI first
      if (openai?.chat) {
        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          });
          const text = response.choices?.[0]?.message?.content;
          if (text) {
            result = JSON.parse(text);
            console.log('[TravelIntelligence] OpenAI NLU raw result:', result);
          }
        } catch (e) {
          console.warn('[TravelIntelligence] OpenAI NLU failed:', e);
        }
      }

      // Fallback to Gemini
      if (!result && this.genAI) {
        try {
          const model = this.genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          });
          const response = await model.generateContent(prompt);
          const text = response.response.text();
          if (text) {
            result = JSON.parse(text);
            console.log('[TravelIntelligence] Gemini NLU raw result:', result);
          }
        } catch (e) {
          console.warn('[TravelIntelligence] Gemini NLU failed:', e);
        }
      }

      if (!result) return null;

      // Determine intent (default to search if not specified)
      const intent: MessageIntent = result.intent || 'search';
      const isNewTopic = result.isNewTopic ?? (conversationSummary.length === 0);
      const continueConversation = result.continueConversation ||
        intent === 'conversational' ||
        intent === 'followup';

      // Build context from AI result
      // For NEW topics, reset context to just what's in this message
      // For REFINE/continuation, merge with existing context
      let context: TravelContext;

      if (isNewTopic && intent === 'search') {
        // NEW topic - start fresh context
        context = {
          city: result.city || null,
          neighborhood: result.neighborhood || null,
          category: result.category || null,
          occasion: result.occasion || null,
          timeOfDay: result.timeOfDay || null,
          pricePreference: result.pricePreference || null,
          vibes: result.vibes?.length > 0 ? result.vibes : [],
        };
        console.log('[TravelIntelligence] New topic detected - fresh context');
      } else {
        // REFINE/continuation - merge with existing context
        context = {
          ...existingContext,
          city: result.city || existingContext?.city,
          neighborhood: result.neighborhood || existingContext?.neighborhood,
          category: result.category || existingContext?.category,
          occasion: result.occasion || existingContext?.occasion,
          timeOfDay: result.timeOfDay || existingContext?.timeOfDay,
          pricePreference: result.pricePreference || existingContext?.pricePreference,
          vibes: result.vibes?.length > 0 ? result.vibes : existingContext?.vibes,
        };
        console.log('[TravelIntelligence] Continuing/refining - merged context');
      }

      console.log('[TravelIntelligence] AI detected:', {
        intent,
        isNewTopic,
        continueConversation,
        searchQuery: result.searchQuery,
      });

      return {
        intent,
        mode: result.mode || 'discover',
        context,
        confidence: result.confidence || 0.7,
        needsClarification: result.needsClarification || false,
        clarificationQuestion: result.clarificationQuestion,
        continueConversation,
        isNewTopic,
        searchQuery: result.searchQuery,
      };
    } catch (error) {
      console.error('[TravelIntelligence] AI NLU error:', error);
      return null;
    }
  }

  /**
   * Rule-based NLU fallback - parses query without AI
   */
  private runRuleBasedNLU(message: string, existingContext: TravelContext): NLUResult {
    const lower = message.toLowerCase().trim();
    const context: TravelContext = { ...existingContext };
    let mode: ConversationMode = 'discover';
    let confidence = 0.6;
    let intent: MessageIntent = 'search';
    let continueConversation = false;
    let isNewTopic = true;
    let searchQuery = message;

    // === INTENT DETECTION (do this FIRST) ===

    // Conversational patterns - these don't need search
    const conversationalPatterns = [
      /^(thanks|thank you|thx|ty)[\s!.]*$/i,
      /^(great|perfect|awesome|nice|cool|good|ok|okay|sure|yes|no|yep|nope)[\s!.]*$/i,
      /^(hi|hello|hey|howdy)[\s!.]*$/i,
      /^(sounds good|that works|got it|i see|interesting)[\s!.]*$/i,
      /^(what do you think|any thoughts|your opinion)[\s!?]*$/i,
    ];

    if (conversationalPatterns.some((p) => p.test(lower))) {
      console.log('[TravelIntelligence] Rule-based: Detected conversational intent');
      return {
        intent: 'conversational',
        mode: 'discover',
        context: existingContext,
        confidence: 0.9,
        needsClarification: false,
        continueConversation: true,
        isNewTopic: false,
        searchQuery: '',
      };
    }

    // Follow-up patterns - discuss previously shown places
    const followupPatterns = [
      /^(tell me more|more details|more info|what else|elaborate)/i,
      /^(which one|which is better|which do you recommend|what do you suggest)/i,
      /^(the first|the second|the third|option 1|option 2|that one|this one)/i,
      /^(why|how so|what makes it|what's special)/i,
      /^(and|also|plus|what about)/i,
    ];

    if (followupPatterns.some((p) => p.test(lower))) {
      console.log('[TravelIntelligence] Rule-based: Detected follow-up intent');
      return {
        intent: 'followup',
        mode: 'insight',
        context: existingContext,
        confidence: 0.8,
        needsClarification: false,
        continueConversation: true,
        isNewTopic: false,
        searchQuery: '',
      };
    }

    // Refine patterns - modify current results (NOT new topics)
    // These are messages that ADD to existing context without being a full new search
    const refinePatterns = [
      /^(something|anything) (cheaper|more expensive|different|else|similar|budget)/i,
      /^(more|less) (romantic|casual|fancy|quiet|lively)/i,
      /^(but|however) (cheaper|more|less|different)/i,
      /show me (more|different|other)/i,
      /^near /i,  // "near shibuya" is a refinement
      /^in (shibuya|shinjuku|ginza|daikanyama|harajuku|aoyama|roppongi)/i, // neighborhood refinements
      /^budget$/i,
      /^cheaper$/i,
      /^something (budget|cheaper|romantic|fancy|nice|different)$/i,
    ];

    if (refinePatterns.some((p) => p.test(lower))) {
      intent = 'refine';
      confidence = 0.75;
      isNewTopic = false;
    }

    // === CITY EXTRACTION ===
    const cityPatterns: Record<string, string> = {
      'tokyo': 'Tokyo',
      'paris': 'Paris',
      'london': 'London',
      'new york': 'New York',
      'nyc': 'New York',
      'los angeles': 'Los Angeles',
      'la': 'Los Angeles',
      'singapore': 'Singapore',
      'hong kong': 'Hong Kong',
      'sydney': 'Sydney',
      'dubai': 'Dubai',
      'bangkok': 'Bangkok',
      'berlin': 'Berlin',
      'amsterdam': 'Amsterdam',
      'rome': 'Rome',
      'barcelona': 'Barcelona',
      'lisbon': 'Lisbon',
      'madrid': 'Madrid',
      'vienna': 'Vienna',
      'prague': 'Prague',
      'stockholm': 'Stockholm',
      'copenhagen': 'Copenhagen',
      'milan': 'Milan',
      'taipei': 'Taipei',
      'seoul': 'Seoul',
      'kyoto': 'Kyoto',
      'osaka': 'Osaka',
      'mexico city': 'Mexico City',
      'san francisco': 'San Francisco',
      'chicago': 'Chicago',
      'toronto': 'Toronto',
      'vancouver': 'Vancouver',
      'melbourne': 'Melbourne',
    };

    for (const [pattern, cityName] of Object.entries(cityPatterns)) {
      if (lower.includes(pattern)) {
        context.city = cityName;
        confidence += 0.1;
        break;
      }
    }

    // === CATEGORY EXTRACTION ===
    const categoryPatterns: Array<{ patterns: string[]; category: string }> = [
      { patterns: ['hotel', 'hotels', 'stay', 'accommodation', 'where to stay', 'place to stay'], category: 'Hotel' },
      { patterns: ['restaurant', 'restaurants', 'dining', 'eat', 'food', 'meal', 'dinner', 'lunch', 'breakfast'], category: 'Restaurant' },
      { patterns: ['cafe', 'cafes', 'coffee', 'coffee shop'], category: 'Cafe' },
      { patterns: ['bar', 'bars', 'drinks', 'cocktail', 'cocktails', 'nightlife'], category: 'Bar' },
      { patterns: ['museum', 'gallery', 'art', 'culture', 'exhibition'], category: 'Culture' },
      { patterns: ['shop', 'shopping', 'store', 'boutique'], category: 'Shop' },
    ];

    for (const { patterns, category } of categoryPatterns) {
      if (patterns.some((p) => lower.includes(p))) {
        context.category = category;
        confidence += 0.1;
        break;
      }
    }

    // === OCCASION EXTRACTION ===
    if (lower.includes('romantic') || lower.includes('date') || lower.includes('anniversary')) {
      context.occasion = 'romantic';
    } else if (lower.includes('business') || lower.includes('meeting') || lower.includes('work')) {
      context.occasion = 'business';
    } else if (lower.includes('celebrat') || lower.includes('birthday') || lower.includes('special')) {
      context.occasion = 'celebration';
    }

    // === TIME OF DAY EXTRACTION ===
    if (lower.includes('breakfast')) {
      context.timeOfDay = 'breakfast';
    } else if (lower.includes('brunch')) {
      context.timeOfDay = 'brunch';
    } else if (lower.includes('lunch')) {
      context.timeOfDay = 'lunch';
    } else if (lower.includes('dinner')) {
      context.timeOfDay = 'dinner';
    } else if (lower.includes('late night') || lower.includes('late-night')) {
      context.timeOfDay = 'late-night';
    }

    // === PRICE PREFERENCE ===
    if (lower.includes('budget') || lower.includes('cheap') || lower.includes('affordable')) {
      context.pricePreference = 'budget';
    } else if (lower.includes('luxury') || lower.includes('high-end') || lower.includes('splurge') || lower.includes('fine dining')) {
      context.pricePreference = 'splurge';
    } else if (lower.includes('upscale') || lower.includes('nice')) {
      context.pricePreference = 'upscale';
    }

    // === VIBES EXTRACTION ===
    const vibePatterns = ['cozy', 'trendy', 'modern', 'classic', 'traditional', 'hip', 'quiet', 'lively', 'intimate', 'hidden gem', 'local', 'authentic'];
    const vibes = vibePatterns.filter((v) => lower.includes(v));
    if (vibes.length > 0) {
      context.vibes = vibes;
    }

    // === MODE DETECTION ===
    if (lower.includes(' vs ') || lower.includes('compare') || lower.includes('difference between') || lower.includes('or ')) {
      mode = 'compare';
    } else if (lower.includes('tell me about') || lower.includes('what is') || lower.includes('what makes') || lower.includes('why is')) {
      mode = 'insight';
    } else if (lower.includes('plan') || lower.includes('itinerary') || lower.includes('day in') || lower.includes('schedule')) {
      mode = 'plan';
    } else if (lower.includes('best') || lower.includes('recommend') || lower.includes('top') || lower.includes('where should')) {
      mode = 'recommend';
    } else if (context.city && context.category) {
      mode = 'recommend';
    }

    // === DETERMINE IF NEW TOPIC ===
    // It's a new topic if:
    // 1. A city was explicitly mentioned in THIS message (not inherited from context)
    // 2. AND it's a search intent (not refine)
    const cityMentionedInMessage = Object.keys(cityPatterns).some((p) => lower.includes(p));
    const categoryMentionedInMessage = categoryPatterns.some(({ patterns }) =>
      patterns.some((p) => lower.includes(p))
    );

    if (intent === 'search' && (cityMentionedInMessage || categoryMentionedInMessage)) {
      isNewTopic = true;
    } else if (intent === 'refine') {
      isNewTopic = false;
    }

    // === BUILD SEARCH QUERY ===
    if (isNewTopic) {
      // For new topics, use the raw message
      searchQuery = message;
    } else if (intent === 'refine') {
      // For refinements, build query from context + new modifiers
      const parts: string[] = [];
      if (context.category) parts.push(context.category.toLowerCase());
      if (context.city) parts.push(`in ${context.city}`);
      if (context.neighborhood) parts.push(`near ${context.neighborhood}`);
      if (context.pricePreference) parts.push(context.pricePreference);
      if (context.occasion) parts.push(context.occasion);

      // Add any new info from current message (neighborhood, price, etc.)
      const neighborhoodMatch = lower.match(/near (\w+)/i) || lower.match(/in (shibuya|shinjuku|ginza|daikanyama|harajuku|aoyama|roppongi)/i);
      if (neighborhoodMatch && !context.neighborhood) {
        context.neighborhood = neighborhoodMatch[1].charAt(0).toUpperCase() + neighborhoodMatch[1].slice(1);
        parts.push(`near ${context.neighborhood}`);
      }

      searchQuery = parts.join(' ') || message;
    }

    console.log('[TravelIntelligence] Rule-based NLU result:', { intent, mode, context, confidence, isNewTopic, searchQuery });

    return {
      intent,
      mode,
      context,
      confidence,
      needsClarification: !context.city && !context.category && intent === 'search',
      clarificationQuestion: !context.city && intent === 'search' ? "Which city are you interested in?" : undefined,
      continueConversation,
      isNewTopic,
      searchQuery,
    };
  }

  /**
   * Normalize category to match database format
   */
  private normalizeCategory(category?: string): string | null {
    if (!category) return null;
    const categoryMap: Record<string, string> = {
      'hotel': 'Hotel',
      'hotels': 'Hotel',
      'restaurant': 'Restaurant',
      'restaurants': 'Restaurant',
      'dining': 'Restaurant',
      'cafe': 'Cafe',
      'cafes': 'Cafe',
      'coffee': 'Cafe',
      'bar': 'Bar',
      'bars': 'Bar',
      'culture': 'Culture',
      'museum': 'Culture',
      'gallery': 'Culture',
      'shop': 'Shop',
      'shopping': 'Shop',
    };
    return categoryMap[category.toLowerCase()] || category;
  }

  /**
   * Normalize city name for matching
   */
  private normalizeCity(city?: string): string | null {
    if (!city) return null;
    return city.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Find relevant destinations using Discovery Engine (primary) with Supabase fallback
   * Discovery Engine provides personalized results based on user behavior
   */
  private async findRelevantDestinations(
    message: string,
    context: TravelContext,
    mode: ConversationMode,
    userId?: string
  ): Promise<any[]> {
    let results: any[] = [];

    // Normalize city and category
    const normalizedCity = this.normalizeCity(context.city);
    const normalizedCategory = this.normalizeCategory(context.category);

    console.log('[TravelIntelligence] Searching with:', {
      city: normalizedCity,
      category: normalizedCategory,
      userId: userId || 'anonymous',
      discoveryEngineAvailable: isDiscoveryEngineAvailable(),
    });

    // ========================================
    // STRATEGY 1: Google Discovery Engine (Primary)
    // Provides personalized search with user behavior tracking
    // ========================================
    if (isDiscoveryEngineAvailable()) {
      try {
        console.log('[TravelIntelligence] Using Discovery Engine for search');

        const searchResult = await unifiedSearch({
          query: message,
          userId,
          city: normalizedCity || undefined,
          category: normalizedCategory || undefined,
          priceLevel: this.mapPricePreference(context.pricePreference) || undefined,
          pageSize: 30,
          useCache: true,
        });

        if (searchResult.results?.length > 0) {
          console.log('[TravelIntelligence] Discovery Engine found', searchResult.results.length, 'results');
          console.log('[TravelIntelligence] Search source:', searchResult.source);

          // Discovery Engine returns different format - normalize it
          results = searchResult.results.map((r: any) => ({
            id: r.id,
            slug: r.slug || r.id,
            name: r.name,
            description: r.description,
            micro_description: r.description?.substring(0, 150),
            city: r.city,
            category: r.category,
            neighborhood: r.neighborhood,
            tags: r.tags || [],
            rating: r.rating,
            price_level: r.priceLevel || r.price_level,
            michelin_stars: r.michelin_stars,
            image: r.image || r.images?.[0],
            relevanceScore: r.relevanceScore || 0,
          }));

          // Track the search event for personalization
          if (userId) {
            trackUserEvent({
              userId,
              eventType: 'search',
              searchQuery: message,
            }).catch((err) => console.warn('[TravelIntelligence] Failed to track search event:', err));
          }
        }
      } catch (error) {
        console.warn('[TravelIntelligence] Discovery Engine search failed:', error);
        // Fall through to fallback
      }
    }

    // ========================================
    // STRATEGY 2: Supabase Direct Query (Fallback)
    // Used when Discovery Engine is unavailable or returns no results
    // ========================================
    if (results.length < 5) {
      console.log('[TravelIntelligence] Using Supabase fallback');
      const supabase = await createServerClient();

      try {
        let query = supabase
          .from('destinations')
          .select('*')
          .is('parent_destination_id', null)
          .limit(50);

        if (normalizedCity) {
          query = query.ilike('city', `%${normalizedCity}%`);
        }
        if (normalizedCategory) {
          query = query.ilike('category', `%${normalizedCategory}%`);
        }
        if (context.neighborhood) {
          query = query.ilike('neighborhood', `%${context.neighborhood}%`);
        }

        const { data, error } = await query.order('rating', { ascending: false });

        if (error) {
          console.error('[TravelIntelligence] Supabase query error:', error);
        }

        if (data?.length) {
          console.log('[TravelIntelligence] Supabase found', data.length, 'results');
          // Merge with existing results, avoiding duplicates
          const existingSlugs = new Set(results.map((r) => r.slug));
          const newResults = data.filter((d) => !existingSlugs.has(d.slug));
          results = [...results, ...newResults];
        }
      } catch (error) {
        console.warn('[TravelIntelligence] Supabase query failed:', error);
      }
    }

    // ========================================
    // STRATEGY 3: Vector Search (Supplement)
    // Adds semantically similar results
    // ========================================
    if (results.length < 10) {
      try {
        const supabase = await createServerClient();
        const embedding = await embedText(message);
        if (embedding) {
          const { data, error } = await supabase.rpc('match_destinations', {
            query_embedding: embedding,
            match_threshold: 0.40,
            match_count: 30,
            filter_city: normalizedCity,
            filter_category: normalizedCategory,
            filter_michelin_stars: null,
            filter_min_rating: null,
            filter_max_price_level: this.mapPricePreference(context.pricePreference),
            search_query: message,
          });

          if (!error && data?.length) {
            console.log('[TravelIntelligence] Vector search found', data.length, 'additional results');
            const existingSlugs = new Set(results.map((r) => r.slug));
            const newResults = data.filter((d: any) => !existingSlugs.has(d.slug));
            results = [...results, ...newResults];
          }
        }
      } catch (error) {
        console.warn('[TravelIntelligence] Vector search failed:', error);
      }
    }

    // ========================================
    // STRATEGY 4: Broader Search (Last Resort)
    // ========================================
    if (results.length === 0 && (normalizedCity || normalizedCategory)) {
      console.log('[TravelIntelligence] Trying broader search...');
      try {
        const supabase = await createServerClient();
        let query = supabase
          .from('destinations')
          .select('*')
          .is('parent_destination_id', null)
          .limit(30);

        if (normalizedCity) {
          query = query.ilike('city', `%${normalizedCity}%`);
        } else if (normalizedCategory) {
          query = query.ilike('category', `%${normalizedCategory}%`);
        }

        const { data } = await query.order('rating', { ascending: false });
        if (data?.length) {
          console.log('[TravelIntelligence] Broader search found', data.length, 'results');
          results = data;
        }
      } catch (error) {
        console.warn('[TravelIntelligence] Broader search failed:', error);
      }
    }

    // Apply contextual ranking
    results = this.rankByContext(results, context, mode);

    // Exclude previously mentioned destinations if we have enough results
    if (results.length > 5 && context.previouslyMentioned?.length) {
      const previousSet = new Set(context.previouslyMentioned);
      const filtered = results.filter((r) => !previousSet.has(r.slug));
      if (filtered.length >= 3) {
        results = filtered;
      }
    }

    console.log('[TravelIntelligence] Final result count:', results.length);
    return results;
  }

  /**
   * Rank destinations by contextual relevance
   */
  private rankByContext(destinations: any[], context: TravelContext, mode: ConversationMode): any[] {
    return destinations.map((dest) => {
      let score = dest.similarity || 0.5;

      // Boost by rating
      if (dest.rating) {
        score += (dest.rating / 5) * 0.2;
      }

      // Boost Michelin stars
      if (dest.michelin_stars) {
        score += dest.michelin_stars * 0.1;
      }

      // Context-specific boosts
      if (context.vibes?.length) {
        const destTags = (dest.tags || []).map((t: string) => t.toLowerCase());
        const vibeMatches = context.vibes.filter((v) =>
          destTags.some((t: string) => t.includes(v.toLowerCase()))
        );
        score += vibeMatches.length * 0.1;
      }

      // Time of day matching
      if (context.timeOfDay && dest.category) {
        const category = dest.category.toLowerCase();
        if (context.timeOfDay === 'breakfast' || context.timeOfDay === 'brunch') {
          if (category.includes('cafe') || category.includes('bakery')) score += 0.15;
        }
        if (context.timeOfDay === 'dinner' || context.timeOfDay === 'late-night') {
          if (category.includes('restaurant') || category.includes('bar')) score += 0.15;
        }
      }

      // Price preference matching
      if (context.pricePreference && dest.price_level) {
        const priceMap: Record<string, number> = { budget: 1, moderate: 2, upscale: 3, splurge: 4 };
        const targetPrice = priceMap[context.pricePreference] || 2;
        const priceDiff = Math.abs(dest.price_level - targetPrice);
        score -= priceDiff * 0.05;
      }

      // Occasion matching
      if (context.occasion) {
        const destTags = (dest.tags || []).map((t: string) => t.toLowerCase());
        const destDesc = (dest.description || '').toLowerCase();
        if (context.occasion === 'romantic' && (destTags.some((t: string) => t.includes('romantic')) || destDesc.includes('intimate'))) {
          score += 0.15;
        }
        if (context.occasion === 'business' && (destTags.some((t: string) => t.includes('business')) || destDesc.includes('professional'))) {
          score += 0.15;
        }
      }

      return { ...dest, contextScore: score };
    }).sort((a, b) => (b.contextScore || 0) - (a.contextScore || 0));
  }

  /**
   * Generate the intelligent response
   */
  private async generateResponse(
    message: string,
    destinations: any[],
    context: TravelContext,
    mode: ConversationMode,
    history: ConversationMessage[],
    clarificationQuestion?: string
  ): Promise<string> {
    // Build destination context for the AI
    const destinationContext = destinations.slice(0, 8).map((d) => ({
      name: d.name,
      city: d.city,
      neighborhood: d.neighborhood,
      category: d.category,
      description: d.micro_description || d.description?.substring(0, 200),
      rating: d.rating,
      price_level: d.price_level,
      michelin_stars: d.michelin_stars,
      tags: d.tags?.slice(0, 5),
    }));

    const systemPrompt = `${TRAVEL_INTELLIGENCE_SYSTEM_PROMPT}

${MODE_PROMPTS[mode]}`;

    // Determine how many options to present
    const numDestinations = destinationContext.length;
    const presentMultiple = mode === 'discover' || mode === 'recommend' || numDestinations > 1;

    const userPrompt = `CONTEXT:
City: ${context.city || 'not specified'}
Category: ${context.category || 'not specified'}
Occasion: ${context.occasion || 'not specified'}
Time: ${context.timeOfDay || 'not specified'}
Vibes: ${context.vibes?.join(', ') || 'not specified'}
Price preference: ${context.pricePreference || 'not specified'}

AVAILABLE DESTINATIONS (${numDestinations} options from Urban Manual's curated collection):
${JSON.stringify(destinationContext, null, 2)}

CONVERSATION HISTORY:
${history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n')}

USER MESSAGE:
${message}

Generate a response as Urban Manual's Travel Intelligence. Remember:
- Only reference destinations from the list above
- ${presentMultiple && numDestinations > 1 ? `IMPORTANT: Present 2-3 OPTIONS from the list with brief descriptions of each. The user wants to see choices, not just one recommendation.` : 'Be specific about why this place fits'}
- For each place mentioned, include a brief reason why it stands out
- Keep it conversational but informative
- ${clarificationQuestion ? `Consider asking: "${clarificationQuestion}"` : 'End with a follow-up question to help narrow down'}`;

    // Try OpenAI first
    if (openai?.chat) {
      try {
        const model = getModelForQuery(message, []);
        const response = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: presentMultiple ? 500 : 300,
        });
        const content = response.choices?.[0]?.message?.content;
        if (content) return content.trim();
      } catch (error) {
        console.warn('[TravelIntelligence] OpenAI response generation failed:', error);
      }
    }

    // Fallback to Gemini
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { temperature: 0.7, maxOutputTokens: presentMultiple ? 500 : 300 },
        });
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        const content = result.response.text();
        if (content) return content.trim();
      } catch (error) {
        console.warn('[TravelIntelligence] Gemini response generation failed:', error);
      }
    }

    // Fallback response - show multiple options
    if (destinations.length > 0) {
      if (destinations.length >= 3) {
        const top3 = destinations.slice(0, 3);
        return `Here are a few options: **${top3[0].name}** — ${top3[0].micro_description || 'a standout choice'}. **${top3[1].name}** — ${top3[1].micro_description || 'another great option'}. And **${top3[2].name}** if you want something different. What vibe are you going for?`;
      } else if (destinations.length === 2) {
        return `Two great options: **${destinations[0].name}** — ${destinations[0].micro_description || 'highly recommended'}. Or **${destinations[1].name}** — ${destinations[1].micro_description || 'equally impressive'}. Which sounds more like what you're after?`;
      } else {
        const top = destinations[0];
        return `${top.name} in ${top.city} stands out — ${top.micro_description || 'a noteworthy destination'}. What matters most to you — atmosphere, quality, or location?`;
      }
    }

    // No results - ask for clarification
    if (clarificationQuestion) {
      return `I'd love to help! ${clarificationQuestion}`;
    }

    return "I'd love to help you discover something special. Could you tell me more about what you're looking for? A specific city, type of experience, or occasion?";
  }

  /**
   * Generate follow-up suggestions
   */
  private generateSuggestions(
    context: TravelContext,
    mode: ConversationMode,
    destinations: any[]
  ): Array<{ text: string; type: 'refine' | 'expand' | 'related' | 'next-step' }> {
    const suggestions: Array<{ text: string; type: 'refine' | 'expand' | 'related' | 'next-step' }> = [];

    // Context-aware suggestions
    if (context.city && !context.category) {
      suggestions.push({ text: `Best restaurants in ${context.city}`, type: 'refine' });
      suggestions.push({ text: `Where to stay in ${context.city}`, type: 'related' });
    }

    if (context.category === 'Restaurant' || context.category === 'restaurant') {
      if (!context.timeOfDay) {
        suggestions.push({ text: 'For dinner tonight', type: 'refine' });
      }
      suggestions.push({ text: 'Drinks nearby after', type: 'next-step' });
      if (!context.occasion) {
        suggestions.push({ text: 'Something more romantic', type: 'refine' });
      }
    }

    if (context.category === 'Hotel' || context.category === 'hotel') {
      suggestions.push({ text: 'Something more boutique', type: 'refine' });
      suggestions.push({ text: 'With a great restaurant', type: 'refine' });
    }

    if (mode === 'recommend' && destinations.length > 0) {
      suggestions.push({ text: 'Something different?', type: 'expand' });
      if (context.city && destinations[0]?.neighborhood) {
        suggestions.push({ text: `More in ${destinations[0].neighborhood}`, type: 'expand' });
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Extract insights from destinations and context
   */
  private extractInsights(
    destinations: any[],
    context: TravelContext,
    mode: ConversationMode
  ): Array<{ type: string; content: string }> {
    const insights: Array<{ type: string; content: string }> = [];

    if (destinations.length > 0) {
      const neighborhoods = [...new Set(destinations.slice(0, 5).map((d) => d.neighborhood).filter(Boolean))];
      if (neighborhoods.length === 1 && neighborhoods[0]) {
        insights.push({
          type: 'neighborhood',
          content: `Most results are in ${neighborhoods[0]} — a great area to explore`,
        });
      }
    }

    const michelinCount = destinations.filter((d) => d.michelin_stars > 0).length;
    if (michelinCount > 2) {
      insights.push({
        type: 'quality',
        content: `${michelinCount} Michelin-starred options available`,
      });
    }

    return insights;
  }

  /**
   * Map price preference to numeric value
   */
  private mapPricePreference(pref?: string): number | null {
    if (!pref) return null;
    const map: Record<string, number> = { budget: 1, moderate: 2, upscale: 3, splurge: 4 };
    return map[pref] || null;
  }

  /**
   * Get related destinations using knowledge graph
   */
  async getRelatedDestinations(destinationId: string): Promise<any[]> {
    try {
      const [similar, complementary] = await Promise.all([
        knowledgeGraphService.findSimilar(destinationId, 3),
        knowledgeGraphService.findComplementary(destinationId, 2),
      ]);
      return [...similar, ...complementary];
    } catch (error) {
      console.warn('[TravelIntelligence] Related destinations lookup failed:', error);
      return [];
    }
  }
}

// Export singleton instance
export const travelIntelligenceEngine = new TravelIntelligenceEngine();
