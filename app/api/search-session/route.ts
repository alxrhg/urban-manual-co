/**
 * Unified SearchSession API Route
 *
 * Single endpoint for both guided search and chat modes.
 * Same brain, different presentation.
 *
 * POST /api/search-session - Process a search turn
 * GET /api/search-session?sessionId=xxx - Load existing session
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchSessionEngine } from '@/services/search-session';
import type {
  SearchSessionRequest,
  SearchSessionResponse,
  PresentationMode,
  TurnInput,
  BehaviorSignal,
} from '@/types/search-session';

// ============================================
// POST - Process a search turn
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      sessionId,
      userId,
      mode = 'guided',
      input,
      config,
      includeProactiveActions = true,
    } = body as SearchSessionRequest;

    // Validate input
    if (!input?.query && !input?.action) {
      return NextResponse.json(
        { error: 'Missing input query or action' },
        { status: 400 }
      );
    }

    // Validate mode
    if (mode && !['guided', 'chat'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "guided" or "chat"' },
        { status: 400 }
      );
    }

    // Get or create session
    const { session, isNew } = await searchSessionEngine.getOrCreateSession(
      sessionId || null,
      userId,
      mode as PresentationMode
    );

    // Build turn input
    const turnInput: TurnInput = {
      query: input.query || '',
      type: input.type || 'text',
      action: input.action,
      filters: input.filters,
    };

    // Process the turn
    const turnOutput = await searchSessionEngine.processTurn(
      session,
      turnInput,
      {
        ...config,
        showReasoning: mode === 'chat',
      }
    );

    // Build response
    const response: SearchSessionResponse = {
      sessionId: session.id,
      turn: turnOutput,
      turnNumber: session.turns.length,
      context: session.context,
      isNewSession: isNew,
    };

    return NextResponse.json(response, {
      headers: {
        'X-Session-Id': session.id,
        'X-Turn-Number': String(session.turns.length),
        'X-Processing-Time': String(Date.now() - startTime),
      },
    });
  } catch (error) {
    console.error('[SearchSession API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process search', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Load existing session
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId') || undefined;
    const mode = (searchParams.get('mode') || 'guided') as PresentationMode;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }

    // Get session
    const { session, isNew } = await searchSessionEngine.getOrCreateSession(
      sessionId,
      userId,
      mode
    );

    if (isNew) {
      return NextResponse.json(
        { error: 'Session not found', sessionId },
        { status: 404 }
      );
    }

    // Return session summary
    return NextResponse.json({
      sessionId: session.id,
      mode: session.mode,
      turnCount: session.turns.length,
      context: session.context,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      // Include last turn output for resuming
      lastTurn: session.turns.length > 0 ? session.turns[session.turns.length - 1] : null,
    });
  } catch (error) {
    console.error('[SearchSession API] Load error:', error);
    return NextResponse.json(
      { error: 'Failed to load session', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH - Update session (mode switch, behavior tracking)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId, action, data } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    // Get session
    const { session, isNew } = await searchSessionEngine.getOrCreateSession(
      sessionId,
      userId
    );

    if (isNew) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'switch_mode': {
        const newMode = data?.mode as PresentationMode;
        if (!newMode || !['guided', 'chat'].includes(newMode)) {
          return NextResponse.json(
            { error: 'Invalid mode' },
            { status: 400 }
          );
        }
        searchSessionEngine.switchMode(session, newMode);
        return NextResponse.json({
          success: true,
          sessionId: session.id,
          mode: session.mode,
        });
      }

      case 'track_behavior': {
        const signals = data?.signals as BehaviorSignal[];
        if (!signals || !Array.isArray(signals)) {
          return NextResponse.json(
            { error: 'Invalid behavior signals' },
            { status: 400 }
          );
        }
        await searchSessionEngine.trackBehavior(session, signals);
        return NextResponse.json({
          success: true,
          tracked: signals.length,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SearchSession API] Patch error:', error);
    return NextResponse.json(
      { error: 'Failed to update session', details: (error as Error).message },
      { status: 500 }
    );
  }
}
