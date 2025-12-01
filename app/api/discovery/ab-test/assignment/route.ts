import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlags, getABTestVariant, getABTestAssignment } from '@/lib/discovery-engine/feature-flags';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling } from '@/lib/errors';

/**
 * GET /api/discovery/ab-test/assignment
 * Get A/B test assignments for the current user
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
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
});

/**
 * POST /api/discovery/ab-test/track
 * Track A/B test event (e.g., conversion, engagement)
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { testName, variant, eventType, metadata } = body;

  if (!testName || !variant || !eventType) {
    return NextResponse.json(
      { error: 'testName, variant, and eventType are required' },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'User authentication required' },
      { status: 401 }
    );
  }

  const eventRecord = {
    user_id: user.id,
    test_name: testName,
    variant,
    event_type: eventType,
    metadata: metadata && typeof metadata === 'object' ? metadata : null,
  };

  console.log('A/B test event:', {
    ...eventRecord,
    timestamp: new Date().toISOString(),
  });

  const { error: insertError } = await supabase
    .from('ab_test_events')
    .insert(eventRecord);

  if (insertError) {
    throw insertError;
  }

  return NextResponse.json({
    success: true,
    message: 'A/B test event tracked',
  });
});

