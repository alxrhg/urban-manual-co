/**
 * Fallback Conversation API Route
 * Handles requests to /api/conversation without user_id parameter
 * Delegates to the guest conversation endpoint handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  getOrCreateSession,
  getConversationMessages,
  saveMessage,
  updateContext,
  summarizeContext,
  getContextSuggestions,
} from './conversation/utils/contextHandler';
import { extractIntent } from '@/app/api/intent/schema';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';

function normalizeUserId(userId?: string | null) {
  return ['anonymous', 'guest'].includes(userId || '') ? undefined : userId;
}

// Import the POST handler logic from the user_id route
async function handleConversationPOST(request: NextRequest, userId: string = 'guest') {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const normalizedUserId = normalizeUserId(user?.id || userId);

  // Rate limiting
  const identifier = getIdentifier(request, normalizedUserId);
  const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return createRateLimitResponse(
      'Too many conversation requests. Please wait a moment.',
      limit,
      remaining,
      reset
    );
  }

  const { message, session_token } = await request.json();

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // Get or create session
  const session = await getOrCreateSession(normalizedUserId, session_token);
  if (!session) {
    return NextResponse.json({ error: 'Failed to initialize session' }, { status: 500 });
  }

  // Get conversation history
  const messages = await getConversationMessages(session.sessionId, 20);

  // Extract intent from new message
  let userContext: any = {};
  if (normalizedUserId && supabase) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('city, country, preferences')
        .eq('id', normalizedUserId)
        .single();
      if (profile) {
        userContext = {
          city: profile.city,
          country: profile.country,
          preferences: profile.preferences,
        };
      }
    } catch (e) {
      // Ignore profile fetch errors
    }
  }

  const intent = await extractIntent(message, userContext);

  // Call the actual conversation handler from the user_id route
  // For now, return a simple response indicating the route should include user_id
  return NextResponse.json(
    {
      error: 'User ID required',
      message: 'Please use /api/conversation/{user_id} or /api/conversation/guest',
    },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  // Redirect to guest endpoint by creating a new request with guest user_id
  // This is a simple fallback - clients should use /api/conversation/guest or /api/conversation/{user_id}
  return NextResponse.json(
    {
      error: 'User ID required in path',
      message: 'Please use /api/conversation/{user_id} or /api/conversation/guest',
      suggestion: 'If you are a guest user, use /api/conversation/guest',
    },
    { status: 404 }
  );
}

export async function GET(request: NextRequest) {
  // Return error indicating user_id is required
  return NextResponse.json(
    {
      error: 'User ID required in path',
      message: 'Please use /api/conversation/{user_id} or /api/conversation/guest',
      suggestion: 'If you are a guest user, use /api/conversation/guest',
    },
    { status: 404 }
  );
}

