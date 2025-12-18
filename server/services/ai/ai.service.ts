import { SupabaseClient } from '@supabase/supabase-js';
import { AIService, ChatRequest, ChatResponse, SearchResultItem } from './types';
import { analyzeIntent } from '@/lib/ai/intent-analysis';
import { findSimilarPlace, inferPriceFromBudgetPhrase, inferGroupSize } from '@/lib/ai/fuzzy-matching';
import { generateDestinationEmbedding } from '@/lib/embeddings/generate';

/** Saved place data structure matching DB response */
interface SavedPlaceData {
  name?: string;
  city?: string;
  category?: string;
  tags?: string[];
  destination?: {
    name?: string;
    city?: string;
    category?: string;
    tags?: string[];
  };
}

/** Visited place data structure matching DB response */
interface VisitedPlaceData {
  slug: string;
}

export class SupabaseAIService implements AIService {
  constructor(private supabase: SupabaseClient) {}

  async processChat(request: ChatRequest): Promise<ChatResponse> {
    const { message, userId, sessionId: inputSessionId } = request;

    // 1. Session Management
    const sessionId = inputSessionId || crypto.randomUUID();
    const now = new Date().toISOString();

    if (inputSessionId) {
      await this.supabase.from('conversation_sessions').update({
        last_activity: now,
      }).eq('id', inputSessionId);
    } else {
      await this.supabase.from('conversation_sessions').insert({
        id: sessionId,
        user_id: userId,
        started_at: now,
        last_activity: now,
      });
    }

    await this.supabase.from('conversation_messages').insert({
      session_id: sessionId,
      user_id: userId,
      message_text: message,
      message_type: 'user',
    });

    // 2. Context Gathering
    let savedPlaces: { data: SavedPlaceData[] | null } = { data: null };
    try {
      const result = await this.supabase.rpc('get_user_saved_destinations', { target_user_id: userId });
      savedPlaces = result as { data: SavedPlaceData[] | null };
    } catch (error) {
      console.error('Error fetching saved places:', error);
    }

    const budgetInference = inferPriceFromBudgetPhrase(message);
    const groupSizeInference = inferGroupSize(message);

    let comparisonBase = null;
    const likeMatch = message.match(/like\s+([^\s]+(?:[^but]*)?)|similar.*to\s+([^\s]+(?:[^but]*)?)/i);
    if (likeMatch) {
      const placeName = (likeMatch[1] || likeMatch[2] || '').trim();
      if (placeName) {
        comparisonBase = await findSimilarPlace(
          placeName,
          (savedPlaces?.data || []) as SavedPlaceData[],
          this.supabase
        );
      }
    }

    // 3. Intent Analysis
    const intent = await analyzeIntent(message, {
      savedPlaces: (savedPlaces?.data || []).slice(0, 10).map((sp) => ({
        name: sp.name || sp.destination?.name || '',
        city: sp.city || sp.destination?.city || '',
        category: sp.category || sp.destination?.category || '',
        tags: sp.tags || sp.destination?.tags || [],
      })),
      recentVisits: [], // TODO: Fetch if needed
      tasteProfile: undefined, // TODO: Fetch if needed
      comparisonBase,
      budgetInference,
      groupSizeInference,
    });

    // 4. Search Execution
    const searchQuery = intent.interpretations?.[0]?.semanticQuery || message;
    const filters = intent.interpretations?.[0]?.filters || {};

    const embedding = await generateDestinationEmbedding({
      name: searchQuery,
      city: filters.city || '',
      category: filters.category || '',
      content: searchQuery,
      tags: filters.tags || [],
    });

    let results: SearchResultItem[] = [];
    try {
      // Try hybrid search first
      const { data, error: searchError } = await this.supabase
        .rpc('search_destinations_hybrid', {
          query_embedding: `[${embedding.join(',')}]`,
          user_id_param: userId,
          city_filter: filters.city || null,
          category_filter: filters.category || null,
          michelin_only: filters.michelin_preference || false,
          price_max: filters.price_level_max || null,
          rating_min: filters.rating_min || null,
          tags_filter: filters.tags && filters.tags.length > 0 ? filters.tags : null,
          limit_count: 10,
          include_saved_only: filters.include_saved_only || false,
          boost_saved: true,
        });

      if (!searchError && data) {
        results = data;
      } else {
        // Fallback to basic vector search
        const fallbackResult = await this.supabase.rpc('match_destinations', {
          query_embedding: embedding,
          match_threshold: 0.6,
          match_count: 10,
          filter_city: filters.city || null,
          filter_category: filters.category || null,
        });
        results = fallbackResult.data || [];
      }
    } catch (error) {
      console.error('Search error:', error);
    }

    // 5. Post-process Results (Filter Visited)
    if (filters.exclude_visited) {
      let visitedPlaces: { data: VisitedPlaceData[] | null } = { data: null };
      try {
        const result = await this.supabase.rpc('get_user_visited_destinations', { target_user_id: userId });
        visitedPlaces = result as { data: VisitedPlaceData[] | null };
      } catch (error) {
        console.error('Error fetching visited places:', error);
      }
      const visitedSlugs = new Set((visitedPlaces?.data || []).map((vp) => vp.slug));
      results = results.filter((r) => !visitedSlugs.has(r.slug));
    }

    // 6. Response Generation
    let responseText: string;
    if (intent.needsClarification && intent.clarifyingQuestions?.length) {
      responseText = `I found some options, but I'd love to narrow it down. ${intent.clarifyingQuestions[0]}`;
    } else if (!results?.length && intent.interpretations?.[0]) {
      const filterCity = filters.city ? ` in ${filters.city}` : '';
      const alternatives = intent.alternativeInterpretations?.slice(0, 3).map(alt => `• ${alt}`).join('\n') ||
        '• Being more specific about location or type\n• Adjusting your criteria';
      responseText = `I couldn't find exact matches for "${message}"${filterCity}. Try:\n${alternatives}`;
    } else if (results?.length) {
      responseText = `Found ${results.length} place${results.length === 1 ? '' : 's'} matching "${message}".`;
      if (intent.reasoning) {
        responseText += `\n\n💡 ${intent.reasoning}`;
      }
    } else {
      responseText = "I can help you find places. Try asking about a specific city, vibe, or occasion.";
    }

    // 7. Save Assistant Message
    await this.supabase.from('conversation_messages').insert({
      session_id: sessionId,
      user_id: userId,
      message_text: responseText,
      message_type: 'assistant',
    });

    return {
      sessionId,
      response: responseText,
      results,
      intent: {
        type: intent.intent,
        confidence: intent.confidence,
        reasoning: intent.reasoning,
        needsClarification: intent.needsClarification,
      },
    };
  }

  async getSuggestedPrompts(userId: string): Promise<string[]> {
    // Get user's saved cities
    let savedPlaces: { data: SavedPlaceData[] | null } = { data: null };
    try {
      const result = await this.supabase.rpc('get_user_saved_destinations', { target_user_id: userId });
      savedPlaces = result as { data: SavedPlaceData[] | null };
    } catch (error) {
      console.error('Error fetching saved places:', error);
    }

    const cities = [
      ...new Set(
        ((savedPlaces?.data || []) as SavedPlaceData[])
          .map((p) => p.city)
          .filter(Boolean)
      )
    ] as string[];

    const prompts: string[] = [];
    if (cities.length > 0) {
      prompts.push(`Show me new places in ${cities[0]}`);
    }
    prompts.push(
      'Find Michelin restaurants',
      'Show my saved places',
      'Plan a weekend itinerary',
    );

    return prompts.filter(Boolean);
  }
}
