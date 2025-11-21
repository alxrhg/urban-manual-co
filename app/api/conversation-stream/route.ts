/**
 * Fallback Conversation Stream API Route
 * Handles requests to /api/conversation-stream without user_id parameter
 */

import { NextRequest } from 'next/server';

const encoder = new TextEncoder();

function createSSEMessage(data: { type: string; [key: string]: any }): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  // Return error indicating user_id is required
  return new Response(
    encoder.encode(createSSEMessage({
      type: 'error',
      error: 'User ID required in path',
      message: 'Please use /api/conversation-stream/{user_id} or /api/conversation-stream/guest',
      suggestion: 'If you are a guest user, use /api/conversation-stream/guest',
    })),
    {
      status: 404,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
}

