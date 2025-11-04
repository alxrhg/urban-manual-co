import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession, getConversationMessages } from '../utils/contextHandler';

/**
 * GET /api/conversation/history
 *
 * Load conversation history for a session
 *
 * Query params:
 * - sessionId: UUID of existing session
 * - sessionToken: Token for anonymous users
 * - limit: Max messages to return (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const sessionToken = searchParams.get('sessionToken');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!sessionId && !sessionToken) {
      return NextResponse.json(
        { error: 'Either sessionId or sessionToken required' },
        { status: 400 }
      );
    }

    // Get or create session
    let actualSessionId = sessionId;

    if (!actualSessionId && sessionToken) {
      const session = await getOrCreateSession(undefined, sessionToken);
      if (!session) {
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        );
      }
      actualSessionId = session.sessionId;
    }

    if (!actualSessionId) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      );
    }

    // Load messages
    const messages = await getConversationMessages(actualSessionId, limit);

    return NextResponse.json({
      sessionId: actualSessionId,
      messages,
      count: messages.length,
    });
  } catch (error: any) {
    console.error('[Conversation History] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load history' },
      { status: 500 }
    );
  }
}
