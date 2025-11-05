/**
 * API Route: Track User Signal
 * POST /api/feed/track
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalTrackingService, SignalType, SIGNAL_WEIGHTS } from '@/services/feed/signal-tracking';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      destination_id,
      signal_type,
      position_in_feed,
      session_id,
      dwell_seconds,
      previous_card_id,
      metadata,
    } = body;

    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!destination_id || !signal_type) {
      return NextResponse.json(
        { error: 'Missing required fields: destination_id, signal_type' },
        { status: 400 }
      );
    }

    // Validate signal type
    if (!Object.keys(SIGNAL_WEIGHTS).includes(signal_type)) {
      return NextResponse.json(
        { error: `Invalid signal_type. Must be one of: ${Object.keys(SIGNAL_WEIGHTS).join(', ')}` },
        { status: 400 }
      );
    }

    // Get device type from user agent
    const userAgent = request.headers.get('user-agent') || '';
    const device = signalTrackingService.getDeviceType(userAgent);

    // Get signal value
    const signalValue = SIGNAL_WEIGHTS[signal_type as SignalType];

    // Track the signal
    const success = await signalTrackingService.trackSignal({
      user_id: user.id,
      destination_id: parseInt(destination_id),
      signal_type: signal_type as SignalType,
      signal_value: signalValue,
      context: {
        position_in_feed,
        session_id,
        time_of_day: new Date().getHours(),
        device,
        previous_card_id,
        dwell_seconds,
        metadata,
      },
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to track signal' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signal_type,
      signal_value: signalValue,
    });

  } catch (error: any) {
    console.error('Error in /api/feed/track:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Batch tracking endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { signals } = body;

    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate
    if (!Array.isArray(signals) || signals.length === 0) {
      return NextResponse.json(
        { error: 'signals must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get device type
    const userAgent = request.headers.get('user-agent') || '';
    const device = signalTrackingService.getDeviceType(userAgent);

    // Prepare signals
    const preparedSignals = signals.map(signal => ({
      user_id: user.id,
      destination_id: parseInt(signal.destination_id),
      signal_type: signal.signal_type as SignalType,
      signal_value: SIGNAL_WEIGHTS[signal.signal_type as SignalType],
      context: {
        position_in_feed: signal.position_in_feed,
        session_id: signal.session_id,
        time_of_day: new Date().getHours(),
        device,
        previous_card_id: signal.previous_card_id,
        dwell_seconds: signal.dwell_seconds,
        metadata: signal.metadata,
      },
    }));

    // Track batch
    const success = await signalTrackingService.trackSignalsBatch(preparedSignals);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to track signals' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: preparedSignals.length,
    });

  } catch (error: any) {
    console.error('Error in /api/feed/track (batch):', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
