import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling } from '@/lib/errors';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * AI Search API - Natural language search for destinations
 *
 * Simple text-based search with natural language processing.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { query, conversationHistory = [] } = body as {
    query: string;
    conversationHistory?: ConversationMessage[];
  };

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  try {
    const lowerQuery = query.toLowerCase();

    // Extract city from query
    let cityFilter: string | null = null;
    const cityPatterns = [
      /in\s+([a-zA-Z\s]+?)(?:\s+for|\s+with|\s*$)/i,
      /([a-zA-Z\s]+?)\s+(?:restaurants?|hotels?|bars?|cafes?|food)/i,
    ];

    for (const pattern of cityPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const possibleCity = match[1].trim();
        if (possibleCity.length > 2) {
          // Verify it's a city
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
    }

    // Extract category from query
    let categoryFilter: string | null = null;
    if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || lowerQuery.includes('eat') || lowerQuery.includes('dining')) {
      categoryFilter = 'restaurant';
    } else if (lowerQuery.includes('hotel') || lowerQuery.includes('stay') || lowerQuery.includes('accommodation') || lowerQuery.includes('sleep')) {
      categoryFilter = 'hotel';
    } else if (lowerQuery.includes('bar') || lowerQuery.includes('drink') || lowerQuery.includes('cocktail')) {
      categoryFilter = 'bar';
    } else if (lowerQuery.includes('coffee') || lowerQuery.includes('cafe') || lowerQuery.includes('café')) {
      categoryFilter = 'cafe';
    } else if (lowerQuery.includes('bakery') || lowerQuery.includes('pastry') || lowerQuery.includes('bread')) {
      categoryFilter = 'bakery';
    }

    // Build the query
    let dbQuery = supabase
      .from('destinations')
      .select('id, slug, name, city, country, category, micro_description, description, image, image_thumbnail, michelin_stars, crown, rating, price_level, neighborhood');

    // Apply filters
    if (cityFilter) {
      dbQuery = dbQuery.ilike('city', `%${cityFilter}%`);
    }
    if (categoryFilter) {
      dbQuery = dbQuery.ilike('category', `%${categoryFilter}%`);
    }

    // If no filters extracted, do a broader text search
    if (!cityFilter && !categoryFilter) {
      // Search in name, city, category, description
      const searchTerms = query.split(' ').filter(t => t.length > 2);
      if (searchTerms.length > 0) {
        const searchPattern = searchTerms.join('%');
        dbQuery = dbQuery.or(`name.ilike.%${searchPattern}%,city.ilike.%${searchPattern}%,category.ilike.%${searchPattern}%,micro_description.ilike.%${searchPattern}%`);
      }
    }

    // Execute query
    const { data: results, error } = await dbQuery.limit(20);

    if (error) {
      console.error('[AI Search] Database error:', error);
      throw error;
    }

    // Sort results - prioritize Michelin and Crown
    const sortedResults = (results || []).sort((a, b) => {
      // Michelin stars first
      if ((b.michelin_stars || 0) !== (a.michelin_stars || 0)) {
        return (b.michelin_stars || 0) - (a.michelin_stars || 0);
      }
      // Then crown
      if (b.crown !== a.crown) {
        return b.crown ? 1 : -1;
      }
      // Then rating
      return (b.rating || 0) - (a.rating || 0);
    });

    const topResults = sortedResults.slice(0, 6);

    // Generate response based on results and context
    let response = '';
    const hasContext = conversationHistory.length > 0;

    if (topResults.length === 0) {
      if (cityFilter && categoryFilter) {
        response = `I couldn't find any ${categoryFilter}s in ${cityFilter}. Would you like me to search in a different city or category?`;
      } else if (cityFilter) {
        response = `I couldn't find destinations in ${cityFilter} matching your search. Try a different query.`;
      } else if (categoryFilter) {
        response = `No ${categoryFilter}s found matching your search. Try specifying a city.`;
      } else {
        response = `I couldn't find destinations matching "${query}". Try searching for a specific city or category like "restaurants in Tokyo".`;
      }
    } else {
      const prefix = hasContext ? 'Here are more results:' : '';
      if (cityFilter && categoryFilter) {
        response = `${prefix} Found ${topResults.length} ${categoryFilter}s in ${cityFilter}:`.trim();
      } else if (cityFilter) {
        response = `${prefix} Here are ${topResults.length} great places in ${cityFilter}:`.trim();
      } else if (categoryFilter) {
        response = `${prefix} Found ${topResults.length} ${categoryFilter}s:`.trim();
      } else {
        response = `${prefix} Here are ${topResults.length} places matching your search:`.trim();
      }
    }

    return NextResponse.json({
      response,
      destinations: topResults,
      filters: { city: cityFilter, category: categoryFilter },
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
