/**
 * Travel Intelligence API
 * The new conversational AI endpoint for Urban Manual
 */

import { NextRequest, NextResponse } from 'next/server';
import { travelIntelligenceEngine, ConversationMessage } from '@/services/intelligence/travel-intelligence-engine';
import { TravelContext } from '@/lib/ai/travel-intelligence';
import { createServerClient } from '@/lib/supabase/server';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
  createRateLimitResponse,
} from '@/lib/rate-limit';

// SSE helper for streaming responses
function createSSEMessage(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const {
      message,
      userId,
      conversationHistory = [],
      context: existingContext,
      stream: useStreaming = false,
    } = body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length < 2) {
      return NextResponse.json(
        {
          error: 'Message is required and must be at least 2 characters',
          response: "What are you looking for? Tell me about the kind of experience you're after.",
          destinations: [],
          mode: 'discover',
          context: {},
        },
        { status: 400 }
      );
    }

    // Rate limiting
    const identifier = getIdentifier(request, userId);
    const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      if (useStreaming) {
        return new Response(
          encoder.encode(
            createSSEMessage({
              type: 'error',
              error: 'Too many requests. Please wait a moment.',
              limit,
              remaining,
              reset,
            })
          ),
          {
            status: 429,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          }
        );
      }
      return createRateLimitResponse(
        'Too many requests. Please wait a moment.',
        limit,
        remaining,
        reset
      );
    }

    // Convert history to expected format
    const history: ConversationMessage[] = conversationHistory.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      destinations: msg.destinations,
      context: msg.context,
    }));

    // Process with Travel Intelligence Engine
    const result = await travelIntelligenceEngine.processMessage(
      message.trim(),
      history,
      userId,
      existingContext as TravelContext
    );

    // Log interaction for analytics (best-effort)
    try {
      const supabase = await createServerClient();
      await supabase.from('user_interactions').insert({
        interaction_type: 'travel_intelligence',
        user_id: userId || null,
        destination_id: null,
        metadata: {
          message,
          mode: result.mode,
          context: result.context,
          destinationCount: result.destinations.length,
          source: 'api/travel-intelligence',
        },
      });
    } catch {
      // Silent fail - analytics shouldn't break the response
    }

    // Streaming response
    if (useStreaming) {
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send mode and context
            controller.enqueue(
              encoder.encode(
                createSSEMessage({
                  type: 'context',
                  mode: result.mode,
                  context: result.context,
                })
              )
            );

            // Send destinations
            controller.enqueue(
              encoder.encode(
                createSSEMessage({
                  type: 'destinations',
                  destinations: result.destinations,
                })
              )
            );

            // Stream response in chunks (simulate streaming for now)
            const words = result.response.split(' ');
            let accumulated = '';
            for (let i = 0; i < words.length; i++) {
              accumulated += (i > 0 ? ' ' : '') + words[i];
              if (i % 3 === 0 || i === words.length - 1) {
                controller.enqueue(
                  encoder.encode(
                    createSSEMessage({
                      type: 'chunk',
                      content: words.slice(Math.max(0, i - 2), i + 1).join(' ') + ' ',
                    })
                  )
                );
                // Small delay to simulate streaming
                await new Promise((resolve) => setTimeout(resolve, 20));
              }
            }

            // Send completion with full data
            controller.enqueue(
              encoder.encode(
                createSSEMessage({
                  type: 'complete',
                  response: result.response,
                  destinations: result.destinations,
                  mode: result.mode,
                  context: result.context,
                  suggestions: result.suggestions,
                  insights: result.insights,
                })
              )
            );

            controller.close();
          } catch (error: any) {
            controller.enqueue(
              encoder.encode(
                createSSEMessage({
                  type: 'error',
                  error: 'Failed to process request',
                  details: error.message,
                })
              )
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Regular JSON response
    return NextResponse.json({
      response: result.response,
      destinations: result.destinations,
      mode: result.mode,
      context: result.context,
      suggestions: result.suggestions,
      insights: result.insights,
    });
  } catch (error: any) {
    console.error('[Travel Intelligence API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        response: "I'm having trouble right now. Please try again.",
        destinations: [],
        mode: 'discover',
        context: {},
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check and info
 */
export async function GET() {
  return NextResponse.json({
    service: 'Travel Intelligence',
    version: '2.0',
    modes: ['discover', 'plan', 'compare', 'insight', 'recommend', 'navigate'],
    capabilities: [
      'Curated destination recommendations',
      'Contextual conversation memory',
      'Multi-turn dialogue understanding',
      'Occasion and mood-based filtering',
      'Neighborhood and timing awareness',
    ],
  });
}
