/**
 * Single list item API
 * PUT /api/lists/[id]/items/[itemId] - Update item
 * DELETE /api/lists/[id]/items/[itemId] - Remove item
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

export const PUT = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: listId, itemId } = await context.params;
  const body = await request.json();
  const { notes, order_index } = body;

  const supabase = await createServerClient();

  // Check ownership
  const { data: list } = await supabase
    .from('public_lists')
    .select('user_id')
    .eq('id', listId)
    .single();

  if (!list) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'List not found', 404);
  }

  if (list.user_id !== user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'You can only edit items in your own lists', 403);
  }

  const updateData: Record<string, any> = {};
  if (notes !== undefined) updateData.notes = notes;
  if (order_index !== undefined) updateData.order_index = order_index;

  const { data: item, error } = await supabase
    .from('public_list_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('list_id', listId)
    .select()
    .single();

  if (error || !item) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Item not found', 404);
  }

  return NextResponse.json({ item });
});

export const DELETE = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: listId, itemId } = await context.params;

  const supabase = await createServerClient();

  // Check ownership
  const { data: list } = await supabase
    .from('public_lists')
    .select('user_id')
    .eq('id', listId)
    .single();

  if (!list) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'List not found', 404);
  }

  if (list.user_id !== user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'You can only remove items from your own lists', 403);
  }

  const { error } = await supabase
    .from('public_list_items')
    .delete()
    .eq('id', itemId)
    .eq('list_id', listId);

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to remove item', 500);
  }

  return NextResponse.json({ success: true });
});
