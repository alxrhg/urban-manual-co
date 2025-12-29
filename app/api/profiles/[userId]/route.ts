/**
 * Single user profile API
 * GET /api/profiles/[userId] - Get profile by ID or username
 * PUT /api/profiles/[userId] - Update own profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { UpdateProfileInput } from '@/types/features';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export const GET = withOptionalAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { userId } = await context.params;
  const supabase = await createServerClient();

  // Try to find by ID first, then by username
  let query = supabase
    .from('user_profiles')
    .select('*');

  // Check if it's a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

  if (isUUID) {
    query = query.eq('id', userId);
  } else {
    query = query.eq('username', userId);
  }

  const { data: profile, error } = await query.single();

  if (error || !profile) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Profile not found', 404);
  }

  // Check if current user can view this profile
  const isOwner = user?.id === profile.id;
  if (!profile.is_public && !isOwner) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'This profile is private', 403);
  }

  // Get stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', profile.id)
    .single();

  // Check if current user follows this profile
  let isFollowing = false;
  if (user && user.id !== profile.id) {
    const { data: follow } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .single();

    isFollowing = !!follow;
  }

  // Get achievements
  const { data: achievements } = await supabase
    .from('user_achievements')
    .select(`
      earned_at,
      achievement:achievements(*)
    `)
    .eq('user_id', profile.id)
    .order('earned_at', { ascending: false });

  // Get public lists if enabled
  let lists = null;
  if (profile.show_lists || isOwner) {
    const { data } = await supabase
      .from('public_lists')
      .select('id, title, emoji, likes_count, created_at')
      .eq('user_id', profile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10);

    lists = data;
  }

  // Get recent visited places if enabled
  let visitedPlaces = null;
  if (profile.show_visited_places || isOwner) {
    const { data } = await supabase
      .from('visited_places')
      .select(`
        visited_at,
        destination:destinations!destination_id(slug, name, city, image)
      `)
      .eq('user_id', profile.id)
      .order('visited_at', { ascending: false })
      .limit(12);

    visitedPlaces = data;
  }

  return NextResponse.json({
    profile: {
      ...profile,
      stats: stats || null,
      is_following: isFollowing,
      is_owner: isOwner,
      achievements: achievements?.map((a) => a.achievement) || [],
      lists,
      visited_places: visitedPlaces,
    },
  });
});

export const PUT = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { userId } = await context.params;
  const body: UpdateProfileInput = await request.json();

  // Can only update own profile
  if (userId !== user.id && userId !== 'me') {
    throw new CustomError(ErrorCode.FORBIDDEN, 'You can only update your own profile', 403);
  }

  const supabase = await createServerClient();

  // If username is being updated, check availability
  if (body.username) {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', body.username)
      .neq('id', user.id)
      .single();

    if (existing) {
      throw new CustomError(ErrorCode.DUPLICATE_RESOURCE, 'Username is already taken', 409);
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(body.username)) {
      throw new CustomError(
        ErrorCode.VALIDATION_ERROR,
        'Username must be 3-30 characters and contain only letters, numbers, and underscores',
        400
      );
    }
  }

  // Upsert profile (create if doesn't exist)
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: user.id,
        ...body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to update profile', 500);
  }

  return NextResponse.json({ profile });
});
