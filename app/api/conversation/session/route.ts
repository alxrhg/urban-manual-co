import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession } from '../utils/contextHandler';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * GET /api/conversation/session
 *
 * Get session info (or create new session)
 *
 * Query params:
 * - userId: User ID (for authenticated users)
 * - sessionId: Existing session ID
 * - sessionToken: Token for anonymous users
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const sessionToken = searchParams.get('sessionToken');

    const session = await getOrCreateSession(userId || undefined, sessionToken || undefined);

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Get message count
    const supabase = createServiceRoleClient();
    let messageCount = 0;

    if (supabase) {
      const { count } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.sessionId);

      messageCount = count || 0;
    }

    return NextResponse.json({
      sessionId: session.sessionId,
      sessionToken: sessionToken || null,
      context: session.context,
      messageCount,
    });
  } catch (error: any) {
    console.error('[Conversation Session] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get session' },
      { status: 500 }
    );
  }
}
