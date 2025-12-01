import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { extendedConversationMemoryService } from '@/services/intelligence/conversation-memory';
import { withErrorHandling, createValidationError } from '@/lib/errors';

/**
 * GET /api/intelligence/conversation-memory/:sessionId
 * Get extended conversation memory with summarization
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) => {
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
    throw createValidationError('Conversation not found');
  }

  return NextResponse.json(memory);
});

