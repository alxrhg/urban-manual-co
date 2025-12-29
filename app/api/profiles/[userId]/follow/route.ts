/**
 * Follow/unfollow user API
 * POST /api/profiles/[userId]/follow - Follow user
 * DELETE /api/profiles/[userId]/follow - Unfollow user
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export const POST = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { userId } = await context.params;

  if (userId === user.id) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'You cannot follow yourself', 400);
  }

  const supabase = await createServerClient();

  // Check if user exists and is public
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, is_public')
    .eq('id', userId)
    .single();

  if (!profile) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'User not found', 404);
  }

  if (!profile.is_public) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'Cannot follow private profiles', 403);
  }

  // Check if already following
  const { data: existingFollow } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', userId)
    .single();

  if (existingFollow) {
    return NextResponse.json({ message: 'Already following', is_following: true });
  }

  // Create follow relationship
  const { error } = await supabase.from('user_follows').insert({
    follower_id: user.id,
    following_id: userId,
  });

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to follow user', 500);
  }

  // Check achievements
  await supabase.rpc('check_achievements', { p_user_id: user.id });
  await supabase.rpc('check_achievements', { p_user_id: userId });

  return NextResponse.json({ success: true, is_following: true }, { status: 201 });
});

export const DELETE = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { userId } = await context.params;

  const supabase = await createServerClient();

  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', userId);

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to unfollow user', 500);
  }

  return NextResponse.json({ success: true, is_following: false });
});
