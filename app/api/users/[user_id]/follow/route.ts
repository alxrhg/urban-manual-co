import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth, AuthContext, createSuccessResponse, createValidationError } from '@/lib/errors';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

export const POST = withAuth(async (
  request: NextRequest,
  { user }: AuthContext,
  context: { params: Promise<{ user_id: string }> }
) => {
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many follow actions. Please wait a moment.',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { user_id: targetUserId } = await context.params;

  if (user.id === targetUserId) {
    throw createValidationError('Cannot follow yourself');
  }

  const supabase = await createServerClient();

  // Create follow relationship
  const { error } = await supabase
    .from('user_follows')
    .insert({
      follower_id: user.id,
      following_id: targetUserId
    });

  if (error) {
    // Check if already following
    if (error.code === '23505') {
      throw createValidationError('Already following this user');
    }
    throw error;
  }

  return createSuccessResponse({ message: 'User followed successfully' });
});

export const DELETE = withAuth(async (
  request: NextRequest,
  { user }: AuthContext,
  context: { params: Promise<{ user_id: string }> }
) => {
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many follow actions. Please wait a moment.',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { user_id: targetUserId } = await context.params;
  const supabase = await createServerClient();

  // Delete follow relationship
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId);

  if (error) throw error;

  return createSuccessResponse({ message: 'User unfollowed successfully' });
});
