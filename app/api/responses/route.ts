/**
 * Responses API Endpoint
 *
 * New conversation endpoint using OpenAI Responses API
 * Features:
 * - Built-in web search for real-time travel info
 * - Curated destination search from Urban Manual
 * - Streaming support
 * - Lower latency than Assistants API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';
import {
  chatWithResponses,
  streamChatWithResponses,
} from '@/lib/openai/responses';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
  createRateLimitResponse,
} from '@/lib/rate-limit';
import { mem0Service, isMem0Available } from '@/lib/ai/mem0';

// SSE helper
function createSSEMessage(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * POST /api/responses
 *
 * Chat with the Responses API
 *
 * Body:
 * - message: string (required) - User's message
 * - conversationHistory: Array<{role, content}> - Previous messages
 * - stream: boolean - Enable streaming (default: false)
 * - enableWebSearch: boolean - Enable web search (default: true)
 */
export async function POST(request: NextRequest): Promise<Response> {
  const encoder = new TextEncoder();

  try {
    // Auth check
    const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  // Rate limiting
  const identifier = getIdentifier(request, userId);
  const ratelimit = isUpstashConfigured()
    ? conversationRatelimit
    : memoryConversationRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return createRateLimitResponse(
      'Too many requests. Please wait a moment.',
      limit,
      remaining,
      reset
    );
  }

  // Parse body
  const body = await request.json();
  const {
    message,
    conversationHistory = [],
    stream = false,
    enableWebSearch = true,
  } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    );
  }

  // Get user context for personalization
  let userContext: {
    favoriteCities?: string[];
    favoriteCategories?: string[];
    travelStyle?: string;
  } | undefined;

  if (userId) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('favorite_cities, favorite_categories, travel_style')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        userContext = {
          favoriteCities: profile.favorite_cities || undefined,
          favoriteCategories: profile.favorite_categories || undefined,
          travelStyle: profile.travel_style || undefined,
        };
      }
    } catch {
      // User context is optional
    }
  }

  // Get Mem0 memory context (if available)
  let memoryContext = '';
  if (userId && isMem0Available()) {
    try {
      memoryContext = await mem0Service.getConversationContext(userId, message);
    } catch {
      // Memory is optional
    }
  }

  // Streaming response
  if (stream) {
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              createSSEMessage({ type: 'status', status: 'processing' })
            )
          );

          const generator = streamChatWithResponses({
            message,
            conversationHistory,
            userId,
            userContext,
            enableWebSearch,
          });

          for await (const event of generator) {
            switch (event.type) {
              case 'text':
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({ type: 'chunk', content: event.content })
                  )
                );
                break;

              case 'tool_start':
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'tool_start',
                      tool: event.name,
                    })
                  )
                );
                break;

              case 'tool_result':
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'tool_result',
                      tool: event.name,
                      result: event.result,
                    })
                  )
                );
                break;

              case 'destinations':
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'destinations',
                      destinations: event.data,
                    })
                  )
                );
                break;

              case 'citations':
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'citations',
                      citations: event.data,
                    })
                  )
                );
                break;

              case 'done':
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'complete',
                      usage: event.usage,
                    })
                  )
                );
                break;
            }
          }

          controller.close();
        } catch (error: any) {
          console.error('[Responses API] Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: 'error',
                error: error.message || 'Failed to process request',
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // Non-streaming response
  try {
    const result = await chatWithResponses({
      message,
      conversationHistory,
      userId,
      userContext,
      enableWebSearch,
    });

    // Use intent from chatWithResponses (already extracted there)
    const intent = result.intent;

    // Store in Mem0 if available (non-blocking)
    if (userId && isMem0Available()) {
      mem0Service
        .addFromConversation(
          [
            { role: 'user', content: message },
            { role: 'assistant', content: result.response },
          ],
          userId,
          {
            source: 'conversation',
            city: intent?.city || undefined,
            category: intent?.category || undefined,
          }
        )
        .catch(() => {
          // Non-blocking
        });
    }

    // Log interaction (best-effort)
    try {
      await supabase.from('user_interactions').insert({
        interaction_type: 'chat',
        user_id: userId || null,
        destination_id: null,
        metadata: {
          query: message,
          intent,
          toolsUsed: result.toolsUsed,
          resultCount: result.curatedResults?.length || 0,
          webSearchUsed: result.webSearchResults !== undefined,
          source: 'api/responses',
        },
      });
    } catch {
      // Non-critical
    }

    // Return full response matching ai-chat format
    return NextResponse.json({
      // Core response
      content: result.response,  // Match ai-chat field name
      message: result.response,  // Keep for backwards compat
      destinations: result.curatedResults || [],

      // Intent and context
      intent: intent ? {
        ...intent,
        resultCount: result.curatedResults?.length || 0,
        hasResults: (result.curatedResults?.length || 0) > 0,
      } : undefined,
      inferredTags: result.inferredTags,

      // Trip planning (when detected)
      tripPlanning: result.tripPlanning,

      // Follow-up suggestions
      suggestions: result.suggestions || [],

      // Enrichment metadata
      enriched: result.enriched,

      // Web search data
      citations: result.citations || [],
      webSearchUsed: result.webSearchResults !== undefined,

      // Metadata
      toolsUsed: result.toolsUsed,
      model: result.model,
      usage: result.usage,
      searchTier: 'openai-responses',  // Indicate this came from responses API
    });
  } catch (error: any) {
    console.error('[Responses API] Error:', error);

    // Fallback error response
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error.message,
      },
      { status: 500 }
    );
  }
  } catch (error: any) {
    console.error('[Responses API] Outer error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/responses/health
 *
 * Health check for Responses API
 */
export const GET = withErrorHandling(async () => {
  return NextResponse.json({
    status: 'ok',
    api: 'responses',
    features: {
      webSearch: true,
      curatedSearch: true,
      streaming: true,
      mem0Integration: isMem0Available(),
    },
  });
});
