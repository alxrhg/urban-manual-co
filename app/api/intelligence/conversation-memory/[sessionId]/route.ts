import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { extendedConversationMemoryService } from '@/services/intelligence/conversation-memory';
import { intelligenceLimiter, memoryIntelligenceLimiter, withRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/intelligence/conversation-memory/:sessionId
 * Get extended conversation memory with summarization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  return withRateLimit({
    request,
    limiter: intelligenceLimiter,
    fallbackLimiter: memoryIntelligenceLimiter,
    message: 'Intelligence API usage is limited to 30 requests per minute.',
    handler: async () => {
      try {
        const resolvedParams = await params;
        const sessionId = resolvedParams.sessionId;
        const searchParams = request.nextUrl.searchParams;
        const maxMessages = parseInt(searchParams.get('maxMessages') || '50', 10);

        const memory = await extendedConversationMemoryService.getConversationHistory(
          sessionId,
          maxMessages,
          true
        );

        if (!memory) {
          return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        return NextResponse.json(memory);
      } catch (error: any) {
        console.error('Error getting conversation memory:', error);
        return NextResponse.json(
          { error: 'Internal server error', details: error.message },
          { status: 500 }
        );
      }
    },
  });
}

