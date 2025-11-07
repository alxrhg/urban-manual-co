import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlags, getABTestVariant, getABTestAssignment } from '@/lib/discovery-engine/feature-flags';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/discovery/ab-test/assignment
 * Get A/B test assignments for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const assignments = getABTestAssignment(user.id);
    const flags = getFeatureFlags();

    return NextResponse.json({
      userId: user.id,
      assignments,
      enabledTests: flags.abTests.filter((t) => t.enabled).map((t) => t.name),
    });
  } catch (error: any) {
    console.error('A/B test assignment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get A/B test assignments',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/discovery/ab-test/track
 * Track A/B test event (e.g., conversion, engagement)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testName, variant, eventType, metadata } = body;

    if (!testName || !variant || !eventType) {
      return NextResponse.json(
        { error: 'testName, variant, and eventType are required' },
        { status: 400 }
      );
    }

    // In a production system, you would store this in a database
    // For now, we'll just log it
    console.log('A/B test event:', {
      testName,
      variant,
      eventType,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // TODO: Store in analytics database
    // await storeABTestEvent({ testName, variant, eventType, metadata });

    return NextResponse.json({
      success: true,
      message: 'A/B test event tracked',
    });
  } catch (error: any) {
    console.error('A/B test tracking error:', error);
    return NextResponse.json(
      {
        error: 'Failed to track A/B test event',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

