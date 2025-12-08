/**
 * Travel Intelligence Action API
 *
 * Executes autonomous actions suggested by the AI:
 * - Save places
 * - Add to trips
 * - Mark as visited
 * - Create itineraries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling } from '@/lib/errors';
import { unifiedIntelligenceCore, AutonomousAction } from '@/services/intelligence/unified-intelligence-core';

interface ActionRequest {
  action: AutonomousAction;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body: ActionRequest = await request.json();
  const { action } = body;

  if (!action || !action.type) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 });
  }

  // Execute the action
  const result = await unifiedIntelligenceCore.executeAction(action, session.user.id);

  return NextResponse.json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});
