/**
 * OpenAI Assistants API endpoint
 * Manage conversation threads and chat with assistants
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateAssistant,
  getOrCreateThread,
  chatWithAssistant,
  getAssistantPreferences,
  updateAssistantPreferences,
  AssistantPreferences
} from '@/lib/openai/assistants';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling } from '@/lib/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
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

  // Get or create thread (with database persistence)
  let threadId = existingThreadId;
  if (!threadId && userId) {
    threadId = await getOrCreateThread(userId);
  } else if (!threadId) {
    // Create anonymous thread (not persisted)
    threadId = await getOrCreateThread(`anon_${Date.now()}`);
  }

  if (!threadId) {
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    );
  }

  // Chat with assistant (uses preferences if userId provided)
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
});

/**
 * GET /api/ai/assistants/preferences
 * Get user's assistant preferences
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  const preferences = await getAssistantPreferences(userId);

  return NextResponse.json({
    preferences: preferences || {}
  });
});

/**
 * PUT /api/ai/assistants/preferences
 * Update user's assistant preferences
 */
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const { userId, preferences } = await request.json();

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  if (!preferences || typeof preferences !== 'object') {
    return NextResponse.json(
      { error: 'preferences object is required' },
      { status: 400 }
    );
  }

  const success = await updateAssistantPreferences(userId, preferences as Partial<AssistantPreferences>);

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Preferences updated'
  });
});

