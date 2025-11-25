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
  IntelligenceResult,
  TRAVEL_INTELLIGENCE_SYSTEM_PROMPT,
  MODE_PROMPTS,
  CONTEXT_EXTRACTION_PROMPT,
  RESPONSE_GENERATION_PROMPT,
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
      // Step 1: Extract/update context from the conversation
      const context = await this.extractContext(message, conversationHistory, existingContext);

      // Step 2: Detect conversation mode
      const mode = await this.detectMode(message, conversationHistory, context);

      // Step 3: Find relevant destinations from our curated collection
      const destinations = await this.findRelevantDestinations(message, context, mode, userId);

      // Step 4: Generate intelligent response
      const response = await this.generateResponse(
        message,
        destinations,
        context,
        mode,
        conversationHistory
      );

      // Step 5: Generate follow-up suggestions
      const suggestions = await this.generateSuggestions(context, mode, destinations);

      // Step 6: Extract insights if appropriate
      const insights = this.extractInsights(destinations, context, mode);

      return {
        response,
        destinations: destinations.slice(0, 12), // Limit displayed destinations
        mode,
        context,
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
   * Extract structured context from the conversation
   */
  private async extractContext(
    message: string,
    history: ConversationMessage[],
    existingContext?: TravelContext
  ): Promise<TravelContext> {
    // Start with existing context
    const context: TravelContext = { ...existingContext };

    // Build conversation summary for context extraction
    const recentHistory = history.slice(-6).map((m) => `${m.role}: ${m.content}`).join('\n');

    // Try AI extraction
    const extracted = await this.extractContextWithAI(message, recentHistory);

    // Merge extracted context (new values override old ones)
    if (extracted) {
      if (extracted.city) context.city = extracted.city;
      if (extracted.neighborhood) context.neighborhood = extracted.neighborhood;
      if (extracted.category) context.category = extracted.category;
      if (extracted.occasion) context.occasion = extracted.occasion;
      if (extracted.timeOfDay) context.timeOfDay = extracted.timeOfDay;
      if (extracted.groupSize) context.groupSize = extracted.groupSize;
      if (extracted.pricePreference) context.pricePreference = extracted.pricePreference;
      if (extracted.vibes?.length) context.vibes = extracted.vibes;
      if (extracted.constraints?.length) context.constraints = extracted.constraints;
    }

    // Track previously mentioned destinations
    const mentionedSlugs = history
      .filter((m) => m.destinations)
      .flatMap((m) => m.destinations?.map((d: any) => d.slug) || []);
    if (mentionedSlugs.length > 0) {
      context.previouslyMentioned = [...new Set(mentionedSlugs)];
    }

    return context;
  }

  /**
   * Use AI to extract context from message
   */
  private async extractContextWithAI(
    message: string,
    conversationSummary: string
  ): Promise<Partial<TravelContext> | null> {
    try {
      const prompt = `${CONTEXT_EXTRACTION_PROMPT}

Conversation:
${conversationSummary}

Current message: "${message}"

Return only the JSON, no explanation.`;

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
          if (text) result = JSON.parse(text);
        } catch (e) {
          console.warn('[TravelIntelligence] OpenAI context extraction failed:', e);
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
          if (text) result = JSON.parse(text);
        } catch (e) {
          console.warn('[TravelIntelligence] Gemini context extraction failed:', e);
        }
      }

      return result?.context || null;
    } catch (error) {
      console.error('[TravelIntelligence] Context extraction error:', error);
      return null;
    }
  }

  /**
   * Detect the conversation mode
   */
  private async detectMode(
    message: string,
    history: ConversationMessage[],
    context: TravelContext
  ): Promise<ConversationMode> {
    const lowerMessage = message.toLowerCase();

    // Quick heuristics for common patterns
    if (lowerMessage.includes(' vs ') || lowerMessage.includes('compare') || lowerMessage.includes('difference between')) {
      return 'compare';
    }
    if (lowerMessage.includes('tell me about') || lowerMessage.includes('what makes') || lowerMessage.includes('why is')) {
      return 'insight';
    }
    if (lowerMessage.includes('plan') || lowerMessage.includes('itinerary') || lowerMessage.includes('day in')) {
      return 'plan';
    }
    if (lowerMessage.includes('best') || lowerMessage.includes('recommend') || lowerMessage.includes('where should')) {
      return 'recommend';
    }
    if (lowerMessage.includes('find') || lowerMessage.includes('looking for') || lowerMessage.includes('any')) {
      return 'discover';
    }

    // Default based on context completeness
    if (context.city && context.category) {
      return 'recommend';
    }

    return 'discover';
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

    // Strategy 1: Vector search for semantic matching
    try {
      const embedding = await embedText(message);
      if (embedding) {
        const { data } = await supabase.rpc('match_destinations', {
          query_embedding: embedding,
          match_threshold: 0.55,
          match_count: 50,
          filter_city: context.city || null,
          filter_category: context.category || null,
          filter_michelin_stars: null,
          filter_min_rating: null,
          filter_max_price_level: this.mapPricePreference(context.pricePreference),
          search_query: message,
        });
        if (data?.length) {
          results = data;
        }
      }
    } catch (error) {
      console.warn('[TravelIntelligence] Vector search failed:', error);
    }

    // Strategy 2: Direct database query as fallback/supplement
    if (results.length < 5) {
      try {
        let query = supabase
          .from('destinations')
          .select('*')
          .is('parent_destination_id', null)
          .limit(50);

        if (context.city) {
          query = query.ilike('city', `%${context.city}%`);
        }
        if (context.category) {
          query = query.ilike('category', `%${context.category}%`);
        }
        if (context.neighborhood) {
          query = query.ilike('neighborhood', `%${context.neighborhood}%`);
        }

        const { data } = await query.order('rating', { ascending: false });
        if (data?.length) {
          // Merge with existing results, avoiding duplicates
          const existingSlugs = new Set(results.map((r) => r.slug));
          const newResults = data.filter((d) => !existingSlugs.has(d.slug));
          results = [...results, ...newResults];
        }
      } catch (error) {
        console.warn('[TravelIntelligence] Database query failed:', error);
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
    history: ConversationMessage[]
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

    const userPrompt = `CONTEXT:
City: ${context.city || 'not specified'}
Category: ${context.category || 'not specified'}
Occasion: ${context.occasion || 'not specified'}
Time: ${context.timeOfDay || 'not specified'}
Vibes: ${context.vibes?.join(', ') || 'not specified'}
Price preference: ${context.pricePreference || 'not specified'}

AVAILABLE DESTINATIONS (from Urban Manual's curated collection):
${JSON.stringify(destinationContext, null, 2)}

CONVERSATION HISTORY:
${history.slice(-4).map((m) => `${m.role}: ${m.content}`).join('\n')}

USER MESSAGE:
${message}

Generate a response as Urban Manual's Travel Intelligence. Remember:
- Only reference destinations from the list above
- Be specific about why each place fits
- Stay concise (2-4 sentences unless more depth is requested)
- End with a relevant follow-up question when appropriate`;

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
          max_tokens: 300,
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
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        });
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        const content = result.response.text();
        if (content) return content.trim();
      } catch (error) {
        console.warn('[TravelIntelligence] Gemini response generation failed:', error);
      }
    }

    // Fallback response
    if (destinations.length > 0) {
      const top = destinations[0];
      return `${top.name} in ${top.city} stands out — ${top.micro_description || 'a noteworthy destination'}. ${destinations.length > 1 ? `I also have ${destinations.length - 1} other suggestions.` : ''} What matters most to you — atmosphere, food quality, or location?`;
    }

    return "I'd love to help you discover something special. Could you tell me more about what you're looking for? A specific city, type of experience, or occasion?";
  }

  /**
   * Generate follow-up suggestions
   */
  private async generateSuggestions(
    context: TravelContext,
    mode: ConversationMode,
    destinations: any[]
  ): Promise<Array<{ text: string; type: 'refine' | 'expand' | 'related' | 'next-step' }>> {
    const suggestions: Array<{ text: string; type: 'refine' | 'expand' | 'related' | 'next-step' }> = [];

    // Context-aware suggestions
    if (context.city && !context.category) {
      suggestions.push({ text: `Best restaurants in ${context.city}`, type: 'refine' });
      suggestions.push({ text: `Where to stay in ${context.city}`, type: 'related' });
    }

    if (context.category === 'restaurant' || context.category === 'Restaurant') {
      if (!context.timeOfDay) {
        suggestions.push({ text: 'For dinner tonight', type: 'refine' });
      }
      suggestions.push({ text: 'Drinks nearby after', type: 'next-step' });
      if (!context.occasion) {
        suggestions.push({ text: 'Something more romantic', type: 'refine' });
      }
    }

    if (mode === 'recommend' && destinations.length > 0) {
      suggestions.push({ text: 'Something different?', type: 'expand' });
      if (context.city) {
        suggestions.push({ text: `More in ${destinations[0]?.neighborhood || context.city}`, type: 'expand' });
      }
    }

    if (mode === 'plan') {
      suggestions.push({ text: 'Coffee between activities', type: 'next-step' });
    }

    // Limit to 3 suggestions
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

    // Neighborhood insight
    if (destinations.length > 0) {
      const neighborhoods = [...new Set(destinations.slice(0, 5).map((d) => d.neighborhood).filter(Boolean))];
      if (neighborhoods.length === 1 && neighborhoods[0]) {
        insights.push({
          type: 'neighborhood',
          content: `Most results are in ${neighborhoods[0]} — a great area to explore`,
        });
      }
    }

    // Michelin insight
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
