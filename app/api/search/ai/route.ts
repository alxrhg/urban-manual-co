import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { embedText } from '@/lib/llm';
import { rerankDestinations } from '@/lib/search/reranker';
import { withErrorHandling } from '@/lib/errors';
import { searchRatelimit, memorySearchRatelimit, getIdentifier, createRateLimitResponse, isUpstashConfigured } from '@/lib/rate-limit';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * AI Search API - Natural language search for destinations
 *
 * Used by the AI chat interface for conversational search.
 * Combines semantic search with Gemini-powered response generation.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const identifier = getIdentifier(request);
  const limiter = isUpstashConfigured() ? searchRatelimit : memorySearchRatelimit;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return createRateLimitResponse('Rate limit exceeded. Please try again later.', limit, remaining, reset);
  }

  const body = await request.json();
  const { query, conversationHistory = [] } = body as {
    query: string;
    conversationHistory?: ConversationMessage[];
  };

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  try {
    // Extract location/category hints from query
    const lowerQuery = query.toLowerCase();
    let cityFilter: string | null = null;
    let categoryFilter: string | null = null;

    // Common city patterns
    const cityPatterns = [
      /in\s+(\w+(?:\s+\w+)?)/i,
      /(\w+(?:\s+\w+)?)\s+restaurants?/i,
      /(\w+(?:\s+\w+)?)\s+hotels?/i,
      /(\w+(?:\s+\w+)?)\s+bars?/i,
    ];

    for (const pattern of cityPatterns) {
      const match = lowerQuery.match(pattern);
      if (match && match[1]) {
        const possibleCity = match[1].trim();
        // Verify it's a city by checking destinations
        const { data: cityCheck } = await supabase
          .from('destinations')
          .select('city')
          .ilike('city', `%${possibleCity}%`)
          .limit(1);
        if (cityCheck && cityCheck.length > 0) {
          cityFilter = cityCheck[0].city;
          break;
        }
      }
    }

    // Category hints
    if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || lowerQuery.includes('eat')) {
      categoryFilter = 'restaurant';
    } else if (lowerQuery.includes('hotel') || lowerQuery.includes('stay') || lowerQuery.includes('accommodation')) {
      categoryFilter = 'hotel';
    } else if (lowerQuery.includes('bar') || lowerQuery.includes('drink') || lowerQuery.includes('cocktail')) {
      categoryFilter = 'bar';
    } else if (lowerQuery.includes('coffee') || lowerQuery.includes('cafe')) {
      categoryFilter = 'cafe';
    }

    // Generate embedding for semantic search
    const embedding = await embedText(query);

    if (!embedding) {
      // Fallback to text search if embedding fails
      const { data: textResults } = await supabase
        .from('destinations')
        .select('*')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,category.ilike.%${query}%`)
        .limit(10);

      return NextResponse.json({
        response: textResults && textResults.length > 0
          ? `Found ${textResults.length} places matching your search:`
          : 'No results found. Try a different search term.',
        destinations: textResults || [],
      });
    }

    // Semantic search with optional filters
    const searchParams: Record<string, unknown> = {
      query_embedding: `[${embedding.join(',')}]`,
      user_id_param: session?.user?.id || null,
      city_filter: cityFilter,
      category_filter: categoryFilter,
      open_now_filter: false,
      limit_count: 50,
    };

    const { data: results, error } = await supabase.rpc(
      'search_destinations_intelligent',
      searchParams
    );

    if (error) {
      console.error('[AI Search] RPC error:', error);
      throw error;
    }

    // Re-rank results based on query intent
    const rerankedResults = rerankDestinations(results || [], {
      query,
      queryIntent: {
        city: cityFilter || undefined,
        category: categoryFilter || undefined,
      },
      userId: session?.user?.id,
      boostPersonalized: !!session?.user?.id,
    });

    const topResults = rerankedResults.slice(0, 6);

    // Generate a natural response
    let response = '';
    if (topResults.length === 0) {
      response = `I couldn't find any destinations matching "${query}". Try being more specific or searching for a different location.`;
    } else if (cityFilter && categoryFilter) {
      response = `Here are ${topResults.length} ${categoryFilter}s in ${cityFilter} that match your search:`;
    } else if (cityFilter) {
      response = `Found ${topResults.length} great places in ${cityFilter}:`;
    } else if (categoryFilter) {
      response = `Here are ${topResults.length} ${categoryFilter}s you might like:`;
    } else {
      response = `Found ${topResults.length} places matching "${query}":`;
    }

    // Log the search
    try {
      await supabase.from('user_interactions').insert({
        interaction_type: 'ai_search',
        user_id: session?.user?.id || null,
        destination_id: null,
        metadata: {
          query,
          filters: { city: cityFilter, category: categoryFilter },
          resultCount: topResults.length,
          hasConversationHistory: conversationHistory.length > 0,
        }
      });
    } catch {
      // Best effort logging
    }

    return NextResponse.json({
      response,
      destinations: topResults,
    });

  } catch (error: unknown) {
    console.error('[AI Search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        response: 'Sorry, there was an error processing your search. Please try again.',
        destinations: [],
        error: errorMessage,
      },
      { status: 500 }
    );
  }
});
