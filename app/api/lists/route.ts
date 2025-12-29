/**
 * Public lists API
 * GET /api/lists - Get public lists
 * POST /api/lists - Create a new list
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { CreateListInput } from '@/types/features';

export const GET = withOptionalAuth(async (request: NextRequest, { user }) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  const featured = searchParams.get('featured') === 'true';
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'newest';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = await createServerClient();

  let query = supabase
    .from('public_lists')
    .select(`
      id,
      title,
      description,
      cover_image,
      emoji,
      is_public,
      is_featured,
      likes_count,
      views_count,
      created_at,
      updated_at,
      user:user_profiles!user_id(id, display_name, username, avatar_url)
    `);

  // Always show only public lists (unless viewing own)
  if (userId && user?.id === userId) {
    query = query.eq('user_id', userId);
  } else if (userId) {
    query = query.eq('user_id', userId).eq('is_public', true);
  } else {
    query = query.eq('is_public', true);
  }

  if (featured) {
    query = query.eq('is_featured', true);
  }

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  // Sorting
  switch (sort) {
    case 'popular':
      query = query.order('likes_count', { ascending: false });
      break;
    case 'views':
      query = query.order('views_count', { ascending: false });
      break;
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: lists, error } = await query;

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to fetch lists', 500);
  }

  // Get item counts
  const listIds = lists?.map((l) => l.id) || [];

  if (listIds.length > 0) {
    const { data: itemCounts } = await supabase
      .from('public_list_items')
      .select('list_id')
      .in('list_id', listIds);

    const countMap = new Map<string, number>();
    itemCounts?.forEach((item) => {
      countMap.set(item.list_id, (countMap.get(item.list_id) || 0) + 1);
    });

    // Check which lists user has liked
    let likedSet = new Set<string>();
    if (user) {
      const { data: likes } = await supabase
        .from('list_likes')
        .select('list_id')
        .eq('user_id', user.id)
        .in('list_id', listIds);

      likedSet = new Set(likes?.map((l) => l.list_id) || []);
    }

    const enrichedLists = lists?.map((list) => ({
      ...list,
      item_count: countMap.get(list.id) || 0,
      is_liked: likedSet.has(list.id),
    }));

    return NextResponse.json({ lists: enrichedLists });
  }

  return NextResponse.json({ lists: lists || [] });
});

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body: CreateListInput = await request.json();
  const { title, description, cover_image, emoji, is_public } = body;

  if (!title || title.trim().length === 0) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'Title is required', 400);
  }

  const supabase = await createServerClient();

  const { data: list, error } = await supabase
    .from('public_lists')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description,
      cover_image,
      emoji: emoji || '📍',
      is_public: is_public ?? true,
    })
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to create list', 500);
  }

  // Check achievements
  await supabase.rpc('check_achievements', { p_user_id: user.id });

  return NextResponse.json({ list }, { status: 201 });
});
