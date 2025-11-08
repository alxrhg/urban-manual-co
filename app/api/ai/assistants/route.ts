/**
 * OpenAI Assistants API endpoint
 * Manage conversation threads and chat with assistants
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateAssistant, getOrCreateThread, chatWithAssistant } from '@/lib/openai/assistants';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { message, userId, threadId: existingThreadId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    // Get or create assistant
    const assistant = await getOrCreateAssistant();
    if (!assistant) {
      return NextResponse.json(
        { error: 'Failed to initialize assistant' },
        { status: 500 }
      );
    }

    // Get or create thread
    let threadId = existingThreadId;
    if (!threadId && userId) {
      threadId = await getOrCreateThread(userId);
    } else if (!threadId) {
      // Create anonymous thread
      const supabase = createServerClient();
      const tempUserId = `anon_${Date.now()}`;
      threadId = await getOrCreateThread(tempUserId);
    }

    if (!threadId) {
      return NextResponse.json(
        { error: 'Failed to create thread' },
        { status: 500 }
      );
    }

    // Chat with assistant
    const result = await chatWithAssistant(threadId, message, userId);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to get response from assistant' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: result.response,
      threadId,
      toolCalls: result.toolCalls || []
    });
  } catch (error: any) {
    console.error('[Assistants API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}

