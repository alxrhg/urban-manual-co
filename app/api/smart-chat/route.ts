/**
 * Smart Chat API
 *
 * Intelligent conversation endpoint that provides:
 * - Persistent sessions (continues across page reloads)
 * - Cross-session learning (remembers past conversations)
 * - Real-time behavior integration
 * - Proactive suggestions and actions
 * - Trip-aware responses
 * - Taste fingerprint personalization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { smartConversationEngine, BehaviorSignal } from '@/services/intelligence/smart-conversation-engine';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
  createRateLimitResponse,
} from '@/lib/rate-limit';
import {
  SmartChatRequestSchema,
  createValidationErrorResponse,
} from '@/lib/schemas/intelligence';

// ============================================
// MAIN CHAT ENDPOINT
// ============================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    // Get user session
    const supabase = await createServerClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;

    // Validate request body with Zod
    const rawBody = await request.json();
    const parseResult = SmartChatRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(createValidationErrorResponse(parseResult.error), { status: 400 });
    }

    const { message, sessionId, includeProactiveActions, maxDestinations } = parseResult.data;

    // Rate limiting
    const identifier = getIdentifier(request, userId);
    const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return createRateLimitResponse(
        'Too many requests. Please wait a moment.',
        limit,
        remaining,
        reset
      );
    }

    // Process message through smart conversation engine
    const response = await smartConversationEngine.processMessage(
      sessionId || null,
      userId,
      message.trim(),
      {
        includeProactiveActions,
        maxDestinations,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        content: response.content,
        destinations: response.destinations,
        suggestions: response.suggestions,
        contextualHints: response.contextualHints,
        proactiveActions: response.proactiveActions,
        tripPlan: response.tripPlan,
        conversationId: response.conversationId,
        turnNumber: response.turnNumber,
        intent: response.intent,
        confidence: response.confidence,
      },
    });
  } catch (error: any) {
    console.error('[Smart Chat] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process message',
      content: 'Sorry, I encountered an error. Please try again.',
      destinations: [],
    }, { status: 500 });
  }
});

// ============================================
// GET - Continue/Load Session
// ============================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID required',
      }, { status: 400 });
    }

    // Get user session
    const supabase = await createServerClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;

    // Continue conversation
    const result = await smartConversationEngine.continueConversation(
      sessionId,
      userId
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.session.id,
        messages: result.session.messages,
        context: result.session.context,
        welcomeBack: result.welcomeBack,
        suggestions: result.suggestions,
        lastActive: result.session.lastActive,
      },
    });
  } catch (error: any) {
    console.error('[Smart Chat] Error loading session:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to load session',
    }, { status: 500 });
  }
});
