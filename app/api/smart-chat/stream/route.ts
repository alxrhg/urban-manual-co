/**
 * Streaming Smart Chat API
 *
 * Server-Sent Events (SSE) endpoint for real-time streaming responses.
 * Provides word-by-word text streaming and progressive destination loading.
 */

import { NextRequest } from 'next/server';
import { smartConversationEngine, StreamChunk } from '@/services/intelligence/smart-conversation-engine';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { withOptionalAuth, OptionalAuthContext, createValidationError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withOptionalAuth(async (request: NextRequest, { user }: OptionalAuthContext) => {
  const userId = user?.id;

  // Parse request
  const body = await request.json();
  const {
    message,
    sessionId,
    includeProactiveActions = true,
    maxDestinations = 10,
  } = body;

  // Rate limiting
  const identifier = getIdentifier(request, userId);
  const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please wait a moment.',
        limit,
        remaining,
        reset,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  // Validate message
  if (!message || message.trim().length < 2) {
    throw createValidationError('Message too short');
  }

  // Create readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Process message with streaming
        const generator = smartConversationEngine.processMessageStreaming(
          sessionId || null,
          userId,
          message.trim(),
          {
            includeProactiveActions,
            maxDestinations,
          }
        );

        // Stream each chunk
        for await (const chunk of generator) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        // Send done event
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error: any) {
        console.error('[Smart Chat Stream] Error:', error);
        const errorChunk: StreamChunk = {
          type: 'complete',
          data: {
            error: error.message || 'Failed to process message',
            success: false,
          },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
