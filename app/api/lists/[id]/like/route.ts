/**
 * List like API
 * POST /api/lists/[id]/like - Like a list
 * DELETE /api/lists/[id]/like - Unlike a list
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: listId } = await context.params;

  const supabase = await createServerClient();

  // Check if list exists and is public
  const { data: list } = await supabase
    .from('public_lists')
    .select('id, user_id, is_public, likes_count')
    .eq('id', listId)
    .single();

  if (!list) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'List not found', 404);
  }

  if (!list.is_public && list.user_id !== user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'Cannot like private lists', 403);
  }

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('list_likes')
    .select('id')
    .eq('list_id', listId)
    .eq('user_id', user.id)
    .single();

  if (existingLike) {
    return NextResponse.json({ message: 'Already liked', is_liked: true, likes_count: list.likes_count });
  }

  // Add like
  const { error } = await supabase.from('list_likes').insert({
    list_id: listId,
    user_id: user.id,
  });

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to like list', 500);
  }

  // Update likes count
  const newCount = (list.likes_count || 0) + 1;
  await supabase
    .from('public_lists')
    .update({ likes_count: newCount })
    .eq('id', listId);

  return NextResponse.json({ success: true, is_liked: true, likes_count: newCount }, { status: 201 });
});

export const DELETE = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: listId } = await context.params;

  const supabase = await createServerClient();

  // Get current likes count
  const { data: list } = await supabase
    .from('public_lists')
    .select('likes_count')
    .eq('id', listId)
    .single();

  if (!list) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'List not found', 404);
  }

  // Remove like
  const { error } = await supabase
    .from('list_likes')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', user.id);

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to unlike list', 500);
  }

  // Update likes count
  const newCount = Math.max((list.likes_count || 0) - 1, 0);
  await supabase
    .from('public_lists')
    .update({ likes_count: newCount })
    .eq('id', listId);

  return NextResponse.json({ success: true, is_liked: false, likes_count: newCount });
});
