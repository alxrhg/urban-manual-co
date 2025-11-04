import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * POST /api/conversation/clear
 *
 * Clear conversation history (delete all messages for a session)
 *
 * Body:
 * - sessionId: UUID of session to clear
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId required' },
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

    // Delete all messages for this session
    const { error } = await supabase
      .from('conversation_messages')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('[Clear Conversation] Error:', error);
      return NextResponse.json(
        { error: 'Failed to clear conversation' },
        { status: 500 }
      );
    }

    // Reset context
    await supabase
      .from('conversation_sessions')
      .update({
        context: {},
        context_summary: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      message: 'Conversation cleared',
    });
  } catch (error: any) {
    console.error('[Clear Conversation] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear conversation' },
      { status: 500 }
    );
  }
}
