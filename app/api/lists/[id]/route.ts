/**
 * Single list API
 * GET /api/lists/[id] - Get list with items
 * PUT /api/lists/[id] - Update list
 * DELETE /api/lists/[id] - Delete list
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { UpdateListInput } from '@/types/features';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withOptionalAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;
  const supabase = await createServerClient();

  const { data: list, error } = await supabase
    .from('public_lists')
    .select(`
      *,
      user:user_profiles!user_id(id, display_name, username, avatar_url),
      items:public_list_items(
        id,
        notes,
        order_index,
        created_at,
        destination:destinations!destination_id(
          id,
          slug,
          name,
          city,
          category,
          image,
          rating,
          micro_description
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !list) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'List not found', 404);
  }

  // Check access
  const isOwner = user?.id === list.user_id;
  if (!list.is_public && !isOwner) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'This list is private', 403);
  }

  // Increment view count (if not owner)
  if (!isOwner) {
    await supabase
      .from('public_lists')
      .update({ views_count: (list.views_count || 0) + 1 })
      .eq('id', id);
  }

  // Check if user has liked
  let isLiked = false;
  if (user) {
    const { data: like } = await supabase
      .from('list_likes')
      .select('id')
      .eq('list_id', id)
      .eq('user_id', user.id)
      .single();

    isLiked = !!like;
  }

  // Sort items by order_index
  const sortedItems = list.items?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

  return NextResponse.json({
    list: {
      ...list,
      items: sortedItems,
      is_liked: isLiked,
      is_owner: isOwner,
    },
  });
});

export const PUT = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;
  const body: UpdateListInput = await request.json();

  const supabase = await createServerClient();

  // Check ownership
  const { data: list } = await supabase
    .from('public_lists')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!list) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'List not found', 404);
  }

  if (list.user_id !== user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'You can only edit your own lists', 403);
  }

  const { data: updatedList, error } = await supabase
    .from('public_lists')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to update list', 500);
  }

  return NextResponse.json({ list: updatedList });
});

export const DELETE = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;

  const supabase = await createServerClient();

  // Check ownership
  const { data: list } = await supabase
    .from('public_lists')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!list) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'List not found', 404);
  }

  if (list.user_id !== user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'You can only delete your own lists', 403);
  }

  const { error } = await supabase.from('public_lists').delete().eq('id', id);

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to delete list', 500);
  }

  return NextResponse.json({ success: true });
});
