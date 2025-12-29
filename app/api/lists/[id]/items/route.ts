/**
 * List items API
 * POST /api/lists/[id]/items - Add item to list
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { AddListItemInput } from '@/types/features';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: listId } = await context.params;
  const body: AddListItemInput = await request.json();
  const { destination_id, notes } = body;

  if (!destination_id) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'destination_id is required', 400);
  }

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
    throw new CustomError(ErrorCode.FORBIDDEN, 'You can only add items to your own lists', 403);
  }

  // Check if destination exists
  const { data: destination } = await supabase
    .from('destinations')
    .select('id')
    .eq('id', destination_id)
    .single();

  if (!destination) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Destination not found', 404);
  }

  // Check if already in list
  const { data: existingItem } = await supabase
    .from('public_list_items')
    .select('id')
    .eq('list_id', listId)
    .eq('destination_id', destination_id)
    .single();

  if (existingItem) {
    throw new CustomError(ErrorCode.DUPLICATE_RESOURCE, 'Destination already in list', 409);
  }

  // Get max order_index
  const { data: maxOrderItem } = await supabase
    .from('public_list_items')
    .select('order_index')
    .eq('list_id', listId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const newOrderIndex = (maxOrderItem?.order_index ?? -1) + 1;

  // Add item
  const { data: item, error } = await supabase
    .from('public_list_items')
    .insert({
      list_id: listId,
      destination_id,
      notes,
      order_index: newOrderIndex,
    })
    .select(`
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
        image
      )
    `)
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to add item to list', 500);
  }

  return NextResponse.json({ item }, { status: 201 });
});
