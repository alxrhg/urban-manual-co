/**
 * Behavior Tracking API
 *
 * Track user interactions to improve conversation intelligence:
 * - Clicks on destinations
 * - Saves/bookmarks
 * - Implicit rejections (scroll past)
 * - Dwell time
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';
import { smartConversationEngine, BehaviorSignal } from '@/services/intelligence/smart-conversation-engine';

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      sessionId,
      type,
      destinationSlug,
      context,
    } = body;

    // Validate required fields
    if (!sessionId || !type || !destinationSlug) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: sessionId, type, destinationSlug',
      }, { status: 400 });
    }

    // Validate signal type
    const validTypes = ['click', 'save', 'reject', 'hover', 'scroll_past', 'dwell'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      }, { status: 400 });
    }

    // Build behavior signal
    const signal: BehaviorSignal = {
      type,
      destinationSlug,
      timestamp: new Date(),
      context: context || {},
    };

    // Track behavior
    await smartConversationEngine.trackBehavior(sessionId, signal);

    return NextResponse.json({
      success: true,
      message: 'Behavior tracked',
    });
  } catch (error: any) {
    console.error('[Behavior Tracking] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to track behavior',
    }, { status: 500 });
  }
});

/**
 * Batch behavior tracking
 */
export const PUT = withErrorHandling(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { sessionId, signals } = body;

    if (!sessionId || !Array.isArray(signals)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: sessionId, signals (array)',
      }, { status: 400 });
    }

    // Track all signals
    for (const signal of signals) {
      if (signal.type && signal.destinationSlug) {
        await smartConversationEngine.trackBehavior(sessionId, {
          type: signal.type,
          destinationSlug: signal.destinationSlug,
          timestamp: new Date(signal.timestamp || Date.now()),
          context: signal.context || {},
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Tracked ${signals.length} behaviors`,
    });
  } catch (error: any) {
    console.error('[Behavior Tracking] Batch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to track behaviors',
    }, { status: 500 });
  }
});
