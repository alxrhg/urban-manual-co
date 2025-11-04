import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * POST /api/conversation/upgrade
 *
 * Upgrade anonymous session to authenticated user session
 * Called after user logs in to preserve their conversation
 *
 * Body:
 * - sessionId: UUID of session
 * - sessionToken: Token from localStorage
 * - userId: User ID to upgrade to
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, sessionToken, userId } = body;

    if (!sessionId || !sessionToken || !userId) {
      return NextResponse.json(
        { error: 'sessionId, sessionToken, and userId required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Verify session exists and matches token
    const { data: session, error: sessionError } = await supabase
      .from('conversation_sessions')
      .select('id, session_token, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.session_token !== sessionToken) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 403 }
      );
    }

    if (session.user_id) {
      // Already associated with a user
      if (session.user_id === userId) {
        return NextResponse.json({
          success: true,
          message: 'Session already associated with this user',
        });
      } else {
        return NextResponse.json(
          { error: 'Session belongs to different user' },
          { status: 409 }
        );
      }
    }

    // Upgrade session
    const { error: updateError } = await supabase
      .from('conversation_sessions')
      .update({
        user_id: userId,
        session_token: null, // Clear token since user is now authenticated
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[Upgrade Session] Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to upgrade session' },
        { status: 500 }
      );
    }

    // Update messages to associate with user
    await supabase
      .from('conversation_messages')
      .update({ user_id: userId })
      .eq('session_id', sessionId)
      .is('user_id', null);

    return NextResponse.json({
      success: true,
      message: 'Session upgraded successfully',
      sessionId,
    });
  } catch (error: any) {
    console.error('[Upgrade Session] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade session' },
      { status: 500 }
    );
  }
}
