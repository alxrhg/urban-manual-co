/**
 * Memory Profile API
 * Get aggregated user memory profile with preferences extracted from memories
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createUnauthorizedError } from '@/lib/errors';
import { mem0Service, isMem0Available } from '@/lib/ai/mem0';

/**
 * GET /api/memory/profile
 * Get the authenticated user's memory profile
 * Returns aggregated preferences and recent context extracted from memories
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  if (!isMem0Available()) {
    return NextResponse.json(
      { error: 'Memory service not configured' },
      { status: 503 }
    );
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw createUnauthorizedError('Authentication required');
  }

  const profile = await mem0Service.getUserMemoryProfile(user.id);

  if (!profile) {
    return NextResponse.json({
      profile: null,
      message: 'No memories found for user',
    });
  }

  return NextResponse.json({
    profile: {
      userId: profile.userId,
      memoryCount: profile.memories.length,
      preferences: profile.preferences,
      recentContext: profile.recentContext,
      lastUpdated: profile.lastUpdated,
    },
    // Include summary if available
    summary: profile.summary,
  });
});
