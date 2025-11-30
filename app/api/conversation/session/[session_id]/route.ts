/**
 * Conversation API by Session ID
 * Handles conversation retrieval by session ID (UUID)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getConversationMessages } from '../../utils/contextHandler';
import { withErrorHandling } from '@/lib/errors';

/**
 * GET: Retrieve conversation history by session ID
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ session_id: string }> }
) => {
  try {
    const params = await context.params;
    const { session_id } = params || {};

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get session by ID
    const { data: session, error: sessionError } = await supabase
      .from('conversation_sessions')
      .select('id, context, context_summary, session_token, last_activity, user_id')
      .eq('id', session_id)
      .maybeSingle();

    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get conversation messages
    const messages = await getConversationMessages(session.id, 20);

    return NextResponse.json({
      messages,
      context: session.context || {},
      context_summary: session.context_summary,
      session_id: session.id,
      session_token: session.session_token,
      last_activity: session.last_activity,
      user_id: session.user_id,
    });
  } catch (error: any) {
    console.error('Error fetching conversation by session ID:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
});

