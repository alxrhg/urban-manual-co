/**
 * OpenAI Responses API Integration
 *
 * Migrated from Assistants API (sunset mid-2026) to Chat Completions with Tools
 * This implementation uses Chat Completions API with function calling, which provides:
 * - Custom tools for curated destination search
 * - Lower latency (no polling required like Assistants)
 * - Streaming support
 *
 * When OpenAI Responses API is fully available in the SDK, this can be upgraded.
 * The Responses API will add:
 * - Built-in web search
 * - Built-in file search
 * - MCP server support
 */

import { getOpenAI } from '../openai';
import { createServerClient } from '@/lib/supabase/server';
import { URBAN_MANUAL_EDITOR_SYSTEM_PROMPT } from '@/lib/ai/systemPrompts';
import { trackUsage, estimateTokens, trackOpenAIResponse } from '@/lib/ai/cost-tracking';

// Models - using GPT-4.1 series for best performance
const RESPONSES_MODEL = process.env.OPENAI_RESPONSES_MODEL || 'gpt-4o';
const RESPONSES_MODEL_MINI = process.env.OPENAI_RESPONSES_MODEL_MINI || 'gpt-4o-mini';

// Web search configuration (for future Responses API upgrade)
const WEB_SEARCH_CONFIG = {
  // Trusted travel domains for domain filtering
  allowedDomains: [
    'tripadvisor.com',
    'timeout.com',
    'lonelyplanet.com',
    'cntraveler.com',
    'theinfatuation.com',
    'eater.com',
    'michelin.com',
    'booking.com',
    'expedia.com',
    'yelp.com',
    'google.com/travel',
    'fodors.com',
    'frommers.com',
  ],
};

/**
 * Tool definitions for Chat Completions with function calling
 * Format compatible with OpenAI's tools parameter
 */
export const RESPONSES_TOOLS: Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}> = [
  // Custom tool: Search curated Urban Manual destinations
  {
    type: 'function' as const,
    function: {
      name: 'search_curated_destinations',
      description: `Search Urban Manual's curated collection of 900+ hand-picked destinations including restaurants, hotels, cafes, bars, and cultural spots. Use this for specific place recommendations from our editorial collection. Returns detailed information including ratings, Michelin stars, price levels, and descriptions.`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query - can be natural language like "romantic dinner in Paris" or keywords',
          },
          city: {
            type: 'string',
            description: 'City name (e.g., "Tokyo", "Paris", "New York", "London")',
          },
          category: {
            type: 'string',
            enum: ['Restaurant', 'Hotel', 'Cafe', 'Bar', 'Culture', 'Shop'],
            description: 'Destination category',
          },
          priceLevel: {
            type: 'number',
            minimum: 1,
            maximum: 4,
            description: 'Price level: 1=budget, 2=moderate, 3=upscale, 4=luxury',
          },
          minRating: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: 'Minimum rating filter',
          },
          michelinStars: {
            type: 'number',
            minimum: 1,
            maximum: 3,
            description: 'Filter for Michelin-starred restaurants only',
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 20,
            description: 'Maximum results to return (default: 10)',
          },
        },
        required: ['query'],
      },
    },
  },
  // Custom tool: Get destination details
  {
    type: 'function' as const,
    function: {
      name: 'get_destination_details',
      description: 'Get detailed information about a specific destination from Urban Manual by its slug or name. Returns full details including hours, address, photos, reviews, and more.',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'Destination slug (URL-friendly identifier) or exact name',
          },
        },
        required: ['slug'],
      },
    },
  },
  // Custom tool: Save destination
  {
    type: 'function' as const,
    function: {
      name: 'save_destination',
      description: "Save a destination to the user's bookmarks/saved places for later reference.",
      parameters: {
        type: 'object',
        properties: {
          destinationSlug: {
            type: 'string',
            description: 'Destination slug to save',
          },
          note: {
            type: 'string',
            description: 'Optional note to add when saving',
          },
        },
        required: ['destinationSlug'],
      },
    },
  },
  // Custom tool: Mark as visited
  {
    type: 'function' as const,
    function: {
      name: 'mark_visited',
      description: "Mark a destination as visited in the user's travel history.",
      parameters: {
        type: 'object',
        properties: {
          destinationSlug: {
            type: 'string',
            description: 'Destination slug to mark as visited',
          },
          rating: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            description: "User's rating (1-5 stars)",
          },
          review: {
            type: 'string',
            description: "User's brief review or notes",
          },
        },
        required: ['destinationSlug'],
      },
    },
  },
];

/**
 * Execute a tool call from the Responses API
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  userId?: string
): Promise<{ result: any; error?: string }> {
  const supabase = await createServerClient();

  try {
    switch (toolName) {
      case 'search_curated_destinations': {
        const { query, city, category, priceLevel, minRating, michelinStars, limit = 10 } = args;

        // Build Supabase query
        let dbQuery = supabase
          .from('destinations')
          .select(
            'id, slug, name, city, country, category, description, micro_description, image, rating, price_level, michelin_stars, latitude, longitude, address, neighborhood'
          )
          .is('parent_destination_id', null) // Only top-level destinations
          .limit(Math.min(limit, 20)); // Cap at 20 for performance

        // Apply city filter - simple ilike (matches working ai-chat implementation)
        if (city) {
          dbQuery = dbQuery.ilike('city', `%${city}%`);
        }

        if (category) {
          dbQuery = dbQuery.ilike('category', `%${category}%`);
        }
        if (priceLevel) {
          dbQuery = dbQuery.lte('price_level', priceLevel);
        }
        if (minRating) {
          dbQuery = dbQuery.gte('rating', minRating);
        }
        if (michelinStars) {
          dbQuery = dbQuery.gte('michelin_stars', michelinStars);
        }

        // Text search - only apply if NO city filter (to avoid conflicts)
        // When city is provided, we just return all destinations in that city
        if (!city && query && query.trim()) {
          const stopWords = new Set(['in', 'the', 'a', 'an', 'for', 'at', 'to', 'best', 'good', 'nice', 'great', 'find', 'show', 'me', 'restaurants', 'hotel', 'hotels', 'bar', 'bars', 'cafe', 'cafes']);
          const searchTerms = query
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 2)
            .filter((w: string) => !stopWords.has(w));

          if (searchTerms.length > 0) {
            const conditions = searchTerms.flatMap((term: string) => [
              `name.ilike.%${term}%`,
              `description.ilike.%${term}%`,
              `city.ilike.%${term}%`,
            ]);
            dbQuery = dbQuery.or(conditions.join(','));
          }
        }

        // Order by rating
        dbQuery = dbQuery.order('rating', { ascending: false, nullsFirst: false });

        const { data, error } = await dbQuery;

        if (error) {
          console.error('[Responses] Search error:', error);
          return { result: [], error: error.message };
        }

        // Log for debugging
        console.log(`[Responses] search_curated_destinations: city=${city}, category=${category}, query=${query}, results=${data?.length || 0}`);

        // Format results for the AI
        const results = (data || []).map((d: any) => ({
          name: d.name,
          slug: d.slug,
          city: d.city,
          country: d.country,
          category: d.category,
          description: d.micro_description || d.description?.substring(0, 200),
          rating: d.rating,
          priceLevel: d.price_level,
          michelinStars: d.michelin_stars,
          neighborhood: d.neighborhood,
          image: d.image,
        }));

        return {
          result: {
            destinations: results,
            count: results.length,
            query: { city, category, priceLevel, minRating, michelinStars },
          },
        };
      }

      case 'get_destination_details': {
        const { slug } = args;

        const { data, error } = await supabase
          .from('destinations')
          .select('*')
          .or(`slug.eq.${slug},name.ilike.%${slug}%`)
          .limit(1)
          .single();

        if (error || !data) {
          return { result: null, error: 'Destination not found' };
        }

        return {
          result: {
            name: data.name,
            slug: data.slug,
            city: data.city,
            country: data.country,
            category: data.category,
            description: data.description,
            microDescription: data.micro_description,
            rating: data.rating,
            priceLevel: data.price_level,
            michelinStars: data.michelin_stars,
            address: data.address,
            neighborhood: data.neighborhood,
            phone: data.phone,
            website: data.website,
            hours: data.hours,
            image: data.image,
            latitude: data.latitude,
            longitude: data.longitude,
            cuisineType: data.cuisine_type,
            tags: data.tags,
          },
        };
      }

      case 'save_destination': {
        if (!userId) {
          return { result: null, error: 'User must be logged in to save destinations' };
        }

        const { destinationSlug, note } = args;

        // Get destination ID
        const { data: dest } = await supabase
          .from('destinations')
          .select('id')
          .eq('slug', destinationSlug)
          .single();

        if (!dest) {
          return { result: null, error: 'Destination not found' };
        }

        // Save to saved_places
        const { error } = await supabase.from('saved_places').upsert(
          {
            user_id: userId,
            destination_id: dest.id,
            note: note || null,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,destination_id' }
        );

        if (error) {
          return { result: null, error: error.message };
        }

        return {
          result: {
            success: true,
            message: `Saved ${destinationSlug} to your places`,
          },
        };
      }

      case 'mark_visited': {
        if (!userId) {
          return { result: null, error: 'User must be logged in to mark places as visited' };
        }

        const { destinationSlug, rating, review } = args;

        // Get destination ID
        const { data: dest } = await supabase
          .from('destinations')
          .select('id')
          .eq('slug', destinationSlug)
          .single();

        if (!dest) {
          return { result: null, error: 'Destination not found' };
        }

        // Mark as visited
        const { error } = await supabase.from('visited_places').upsert(
          {
            user_id: userId,
            destination_id: dest.id,
            visited_at: new Date().toISOString(),
            rating: rating || null,
            review: review || null,
          },
          { onConflict: 'user_id,destination_id' }
        );

        if (error) {
          return { result: null, error: error.message };
        }

        return {
          result: {
            success: true,
            message: `Marked ${destinationSlug} as visited`,
          },
        };
      }

      default:
        return { result: null, error: `Unknown tool: ${toolName}` };
    }
  } catch (error: any) {
    console.error(`[Responses] Tool execution error for ${toolName}:`, error);
    return { result: null, error: error.message };
  }
}

/**
 * Build system instructions for the travel assistant
 */
function buildSystemInstructions(userContext?: {
  favoriteCities?: string[];
  favoriteCategories?: string[];
  travelStyle?: string;
}): string {
  let instructions = `${URBAN_MANUAL_EDITOR_SYSTEM_PROMPT}

## Available Tools

You have access to the following tools:

1. **Web Search** - Use for real-time information:
   - Current events and festivals in cities
   - Restaurant hours and current status
   - Weather conditions
   - Recent reviews and news
   - Flight/hotel prices
   - Local tips and recent travel articles

2. **search_curated_destinations** - Use for finding places from Urban Manual's curated collection:
   - 900+ hand-picked restaurants, hotels, cafes, bars, and cultural spots
   - Editorial recommendations with detailed descriptions
   - Michelin-starred restaurants
   - Hidden gems selected by travel editors

3. **get_destination_details** - Get full details about a specific place

4. **save_destination** - Save a place to user's bookmarks

5. **mark_visited** - Mark a place as visited

## Guidelines

- ALWAYS use search_curated_destinations first for specific place recommendations
- Use web search for real-time info (hours, events, weather, recent news)
- Combine both: find curated places, then enrich with live web data
- Never invent places - only recommend destinations from our database
- Be concise (2-3 sentences) unless detailed info is requested
- Include relevant web citations when using real-time data
`;

  // Add user context if available
  if (userContext) {
    instructions += '\n## User Preferences\n';
    if (userContext.favoriteCities?.length) {
      instructions += `- Favorite cities: ${userContext.favoriteCities.join(', ')}\n`;
    }
    if (userContext.favoriteCategories?.length) {
      instructions += `- Favorite categories: ${userContext.favoriteCategories.join(', ')}\n`;
    }
    if (userContext.travelStyle) {
      instructions += `- Travel style: ${userContext.travelStyle}\n`;
    }
  }

  return instructions;
}

/**
 * Chat with OpenAI using Chat Completions with Tools
 * Handles tool calls automatically in a loop
 */
export async function chatWithResponses(options: {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
  userContext?: {
    favoriteCities?: string[];
    favoriteCategories?: string[];
    travelStyle?: string;
  };
  enableWebSearch?: boolean;
  maxToolCalls?: number;
}): Promise<{
  response: string;
  toolsUsed: string[];
  webSearchResults?: any[];
  curatedResults?: any[];
  citations?: Array<{ title: string; url: string }>;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}> {
  const openai = getOpenAI();
  if (!openai?.chat) {
    throw new Error('OpenAI client not available');
  }

  const {
    message,
    conversationHistory = [],
    userId,
    userContext,
    maxToolCalls = 5,
  } = options;

  // Build messages array with system prompt
  const messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_call_id?: string;
  }> = [{ role: 'system', content: buildSystemInstructions(userContext) }];

  // Add conversation history
  for (const msg of conversationHistory.slice(-10)) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add current message
  messages.push({ role: 'user', content: message });

  // Track results
  const toolsUsed: string[] = [];
  let curatedResults: any[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Determine model based on query complexity
  const isComplex =
    message.length > 200 ||
    message.includes('compare') ||
    message.includes('plan') ||
    message.includes('itinerary');
  const model = isComplex ? RESPONSES_MODEL : RESPONSES_MODEL_MINI;

  try {
    // Initial API call with tools
    let response = await openai.chat.completions.create({
      model,
      messages: messages as any,
      tools: RESPONSES_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Track usage
    if (response.usage) {
      totalInputTokens += response.usage.prompt_tokens || 0;
      totalOutputTokens += response.usage.completion_tokens || 0;
    }

    // Process tool calls in a loop
    let toolCallCount = 0;
    let currentMessages = [...messages];

    while (response.choices[0]?.message?.tool_calls && toolCallCount < maxToolCalls) {
      const toolCalls = response.choices[0].message.tool_calls;

      // Add assistant message with tool calls to history
      currentMessages.push(response.choices[0].message as any);

      // Process each tool call
      for (const toolCall of toolCalls) {
        toolCallCount++;
        const { id, function: func } = toolCall;
        const args = JSON.parse(func.arguments || '{}');

        toolsUsed.push(func.name);

        // Execute custom tool
        const { result, error } = await executeToolCall(func.name, args, userId);

        if (func.name === 'search_curated_destinations' && result?.destinations) {
          curatedResults = result.destinations;
        }

        // Add tool result to messages
        currentMessages.push({
          role: 'tool',
          tool_call_id: id,
          content: JSON.stringify(error ? { error } : result),
        });
      }

      // Continue conversation with tool results
      response = await openai.chat.completions.create({
        model,
        messages: currentMessages as any,
        tools: RESPONSES_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
      });

      // Track usage
      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens || 0;
        totalOutputTokens += response.usage.completion_tokens || 0;
      }
    }

    // Extract final text response
    const finalResponse =
      response.choices[0]?.message?.content ||
      'I apologize, but I was unable to generate a response.';

    // Track costs
    trackOpenAIResponse(response, model, '/api/responses', userId);

    return {
      response: finalResponse,
      toolsUsed,
      curatedResults: curatedResults.length > 0 ? curatedResults : undefined,
      model,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
    };
  } catch (error: any) {
    console.error('[Responses] API error:', error);
    throw error;
  }
}

/**
 * Stream chat response with Chat Completions API
 */
export async function* streamChatWithResponses(options: {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
  userContext?: {
    favoriteCities?: string[];
    favoriteCategories?: string[];
    travelStyle?: string;
  };
  enableWebSearch?: boolean;
}): AsyncGenerator<
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_result'; name: string; result: any }
  | { type: 'destinations'; data: any[] }
  | { type: 'citations'; data: Array<{ title: string; url: string }> }
  | { type: 'done'; usage?: { inputTokens: number; outputTokens: number } }
> {
  const openai = getOpenAI();
  if (!openai?.chat) {
    throw new Error('OpenAI client not available');
  }

  const { message, conversationHistory = [], userId, userContext } = options;

  // Build messages with system prompt
  const messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_call_id?: string;
  }> = [{ role: 'system', content: buildSystemInstructions(userContext) }];

  for (const msg of conversationHistory.slice(-10)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: message });

  const isComplex = message.length > 200 || message.includes('plan');
  const model = isComplex ? RESPONSES_MODEL : RESPONSES_MODEL_MINI;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // First, make a non-streaming call to handle tool calls
    let response = await openai.chat.completions.create({
      model,
      messages: messages as any,
      tools: RESPONSES_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000,
    });

    if (response.usage) {
      totalInputTokens += response.usage.prompt_tokens || 0;
      totalOutputTokens += response.usage.completion_tokens || 0;
    }

    let currentMessages = [...messages];
    let toolCallCount = 0;
    const maxToolCalls = 5;

    // Process tool calls
    while (response.choices[0]?.message?.tool_calls && toolCallCount < maxToolCalls) {
      const toolCalls = response.choices[0].message.tool_calls;
      currentMessages.push(response.choices[0].message as any);

      for (const toolCall of toolCalls) {
        toolCallCount++;
        const { id, function: func } = toolCall;
        const args = JSON.parse(func.arguments || '{}');

        yield { type: 'tool_start', name: func.name };

        const { result, error } = await executeToolCall(func.name, args, userId);

        yield {
          type: 'tool_result',
          name: func.name,
          result: error ? { error } : result,
        };

        if (func.name === 'search_curated_destinations' && result?.destinations) {
          yield { type: 'destinations', data: result.destinations };
        }

        currentMessages.push({
          role: 'tool',
          tool_call_id: id,
          content: JSON.stringify(error ? { error } : result),
        });
      }

      // Get next response
      response = await openai.chat.completions.create({
        model,
        messages: currentMessages as any,
        tools: RESPONSES_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
      });

      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens || 0;
        totalOutputTokens += response.usage.completion_tokens || 0;
      }
    }

    // Now stream the final text response
    if (response.choices[0]?.message?.content) {
      // If we already have content from non-streaming, yield it in chunks
      const content = response.choices[0].message.content;
      const chunkSize = 20;
      for (let i = 0; i < content.length; i += chunkSize) {
        yield { type: 'text', content: content.slice(i, i + chunkSize) };
        // Small delay for streaming effect
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } else if (!response.choices[0]?.message?.tool_calls) {
      // Stream final response if no tool calls pending
      const stream = await openai.chat.completions.create({
        model,
        messages: currentMessages as any,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield { type: 'text', content };
        }
      }
    }

    // Track costs
    trackUsage({
      model,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      endpoint: '/api/responses/stream',
      userId,
    });

    yield {
      type: 'done',
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
    };
  } catch (error: any) {
    console.error('[Responses Stream] Error:', error);
    throw error;
  }
}

export { RESPONSES_MODEL, RESPONSES_MODEL_MINI, WEB_SEARCH_CONFIG };
