/**
 * Streaming SearchSession API Route
 *
 * SSE endpoint for real-time search responses.
 * Progressively streams intent, destinations, and narrative.
 */

import { NextRequest } from 'next/server';
import { searchSessionEngine } from '@/services/search-session';
import type {
  PresentationMode,
  TurnInput,
  SearchSessionStreamChunk,
} from '@/types/search-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      userId,
      mode = 'chat',
      input,
      config,
    } = body;

    if (!input?.query) {
      return new Response(
        JSON.stringify({ error: 'Missing input query' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const turnId = `turn-${Date.now()}`;

        const sendChunk = (chunk: SearchSessionStreamChunk) => {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          // Get or create session
          const { session, isNew } = await searchSessionEngine.getOrCreateSession(
            sessionId || null,
            userId,
            mode as PresentationMode
          );

          // Send session info
          sendChunk({
            type: 'intent',
            data: {
              sessionId: session.id,
              isNew,
              turnId,
            },
            turnId,
          });

          // Build turn input
          const turnInput: TurnInput = {
            query: input.query,
            type: input.type || 'text',
            action: input.action,
            filters: input.filters,
          };

          // Process the turn
          const output = await searchSessionEngine.processTurn(
            session,
            turnInput,
            {
              ...config,
              showReasoning: mode === 'chat',
            }
          );

          // Stream destinations progressively
          if (output.destinations.length > 0) {
            // Send first batch immediately
            sendChunk({
              type: 'destinations',
              data: {
                destinations: output.destinations.slice(0, 3),
                hasMore: output.destinations.length > 3,
              },
              turnId,
            });

            // Stream remaining destinations
            if (output.destinations.length > 3) {
              await new Promise(resolve => setTimeout(resolve, 100));
              sendChunk({
                type: 'destinations',
                data: {
                  destinations: output.destinations.slice(3),
                  hasMore: false,
                },
                turnId,
              });
            }
          }

          // Stream narrative for chat mode
          if (output.presentation.type === 'chat') {
            const narrative = output.presentation.narrative;
            // Stream word by word for chat feel
            const words = narrative.split(' ');
            let buffer = '';

            for (let i = 0; i < words.length; i += 5) {
              buffer = words.slice(0, i + 5).join(' ');
              sendChunk({
                type: 'narrative',
                data: {
                  text: buffer,
                  isComplete: i + 5 >= words.length,
                },
                turnId,
              });

              if (i + 5 < words.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }
          }

          // Send suggestions
          if (output.suggestions.length > 0) {
            sendChunk({
              type: 'suggestions',
              data: {
                suggestions: output.suggestions,
              },
              turnId,
            });
          }

          // Send complete signal
          sendChunk({
            type: 'complete',
            data: {
              turnNumber: session.turns.length,
              metadata: output.metadata,
              tripPlan: output.tripPlan,
              presentation: output.presentation,
              context: session.context,
            },
            turnId,
          });

        } catch (error) {
          console.error('[SearchSession Stream] Error:', error);
          sendChunk({
            type: 'error',
            data: {
              message: (error as Error).message,
            },
            turnId,
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[SearchSession Stream] Setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to setup stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
