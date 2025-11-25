/**
 * Travel Intelligence Engine
 * The core brain of Urban Manual's conversational AI
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

interface NLUResult {
  mode: ConversationMode;
  context: TravelContext;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
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
      console.log('[TravelIntelligence] Existing context:', existingContext);

      // Step 1: UNIFIED NLU - Extract context AND mode together
      const nluResult = await this.understandQuery(message, conversationHistory, existingContext);

      console.log('[TravelIntelligence] NLU Result:', {
        mode: nluResult.mode,
        context: nluResult.context,
        confidence: nluResult.confidence,
      });

      // Step 2: Find relevant destinations from our curated collection
      const destinations = await this.findRelevantDestinations(
        message,
        nluResult.context,
        nluResult.mode,
        userId
      );

      console.log('[TravelIntelligence] Found', destinations.length, 'destinations');

      // Step 3: Generate intelligent response
      const response = await this.generateResponse(
        message,
        destinations,
        nluResult.context,
        nluResult.mode,
        conversationHistory,
        nluResult.needsClarification ? nluResult.clarificationQuestion : undefined
      );

      // Step 4: Generate follow-up suggestions
      const suggestions = this.generateSuggestions(nluResult.context, nluResult.mode, destinations);

      // Step 5: Extract insights if appropriate
      const insights = this.extractInsights(destinations, nluResult.context, nluResult.mode);

      return {
        response,
        destinations: destinations.slice(0, 12),
        mode: nluResult.mode,
        context: nluResult.context,
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
   */
  private async runAINLU(
    message: string,
    conversationSummary: string,
    existingContext: TravelContext
  ): Promise<NLUResult | null> {
    const prompt = `You are a travel query analyzer. Extract structured information from this travel query.

EXISTING CONTEXT (from previous conversation):
${JSON.stringify(existingContext, null, 2)}

CONVERSATION HISTORY:
${conversationSummary || 'None'}

CURRENT MESSAGE: "${message}"

Analyze and return JSON with this EXACT structure:
{
  "mode": "discover" | "plan" | "compare" | "insight" | "recommend" | "navigate",
  "confidence": 0.0 to 1.0,
  "city": "city name or null",
  "neighborhood": "neighborhood name or null",
  "category": "Hotel" | "Restaurant" | "Cafe" | "Bar" | "Culture" | "Shop" | null,
  "occasion": "romantic" | "business" | "celebration" | "casual" | "solo" | null,
  "timeOfDay": "breakfast" | "brunch" | "lunch" | "afternoon" | "dinner" | "late-night" | null,
  "pricePreference": "budget" | "moderate" | "upscale" | "splurge" | null,
  "vibes": ["array", "of", "vibes"] or [],
  "needsClarification": true or false,
  "clarificationQuestion": "question to ask if clarification needed"
}

RULES:
- For "hotel in tokyo": city="Tokyo", category="Hotel", mode="discover" or "recommend"
- For "best restaurant paris": city="Paris", category="Restaurant", mode="recommend"
- For "romantic dinner": occasion="romantic", category="Restaurant", timeOfDay="dinner"
- CAPITALIZE city names properly: "tokyo" -> "Tokyo", "paris" -> "Paris"
- CAPITALIZE category: "hotel" -> "Hotel", "restaurant" -> "Restaurant"
- If query is vague, set needsClarification=true
- confidence should reflect how clear the intent is

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

      // Build context from AI result
      const context: TravelContext = {
        ...existingContext,
        city: result.city || existingContext?.city,
        neighborhood: result.neighborhood || existingContext?.neighborhood,
        category: result.category || existingContext?.category,
        occasion: result.occasion || existingContext?.occasion,
        timeOfDay: result.timeOfDay || existingContext?.timeOfDay,
        pricePreference: result.pricePreference || existingContext?.pricePreference,
        vibes: result.vibes?.length > 0 ? result.vibes : existingContext?.vibes,
      };

      return {
        mode: result.mode || 'discover',
        context,
        confidence: result.confidence || 0.7,
        needsClarification: result.needsClarification || false,
        clarificationQuestion: result.clarificationQuestion,
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
    const lower = message.toLowerCase();
    const context: TravelContext = { ...existingContext };
    let mode: ConversationMode = 'discover';
    let confidence = 0.6;

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

    console.log('[TravelIntelligence] Rule-based NLU result:', { mode, context, confidence });

    return {
      mode,
      context,
      confidence,
      needsClarification: !context.city && !context.category,
      clarificationQuestion: !context.city ? "Which city are you interested in?" : undefined,
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
   * Find relevant destinations from our curated collection
   */
  private async findRelevantDestinations(
    message: string,
    context: TravelContext,
    mode: ConversationMode,
    userId?: string
  ): Promise<any[]> {
    const supabase = await createServerClient();
    let results: any[] = [];

    // Normalize city and category (in case AI returned lowercase)
    const normalizedCity = this.normalizeCity(context.city);
    const normalizedCategory = this.normalizeCategory(context.category);

    console.log('[TravelIntelligence] Searching with normalized values:', {
      city: normalizedCity,
      category: normalizedCategory,
      originalCity: context.city,
      originalCategory: context.category,
    });

    // Strategy 1: Direct database query FIRST for specific queries
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
        console.error('[TravelIntelligence] Database query error:', error);
      }

      if (data?.length) {
        console.log('[TravelIntelligence] Database found', data.length, 'results');
        results = data;
      } else {
        console.log('[TravelIntelligence] Database found 0 results');
      }
    } catch (error) {
      console.warn('[TravelIntelligence] Database query failed:', error);
    }

    // Strategy 2: Vector search for semantic matching (supplements database results)
    if (results.length < 10) {
      try {
        const embedding = await embedText(message);
        if (embedding) {
          const { data, error } = await supabase.rpc('match_destinations', {
            query_embedding: embedding,
            match_threshold: 0.40,
            match_count: 50,
            filter_city: normalizedCity,
            filter_category: normalizedCategory,
            filter_michelin_stars: null,
            filter_min_rating: null,
            filter_max_price_level: this.mapPricePreference(context.pricePreference),
            search_query: message,
          });

          if (error) {
            console.warn('[TravelIntelligence] Vector search error:', error);
          }

          if (data?.length) {
            console.log('[TravelIntelligence] Vector search found', data.length, 'results');
            const existingSlugs = new Set(results.map((r) => r.slug));
            const newResults = data.filter((d: any) => !existingSlugs.has(d.slug));
            results = [...results, ...newResults];
          }
        }
      } catch (error) {
        console.warn('[TravelIntelligence] Vector search failed:', error);
      }
    }

    // Strategy 3: Broader search if still no results
    if (results.length === 0 && (normalizedCity || normalizedCategory)) {
      console.log('[TravelIntelligence] Trying broader search...');
      try {
        let query = supabase
          .from('destinations')
          .select('*')
          .is('parent_destination_id', null)
          .limit(30);

        // Try with just city OR just category
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
