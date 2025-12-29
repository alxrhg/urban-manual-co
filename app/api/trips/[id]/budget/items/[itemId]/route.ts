/**
 * Single budget item API
 * PUT /api/trips/[id]/budget/items/[itemId] - Update item
 * DELETE /api/trips/[id]/budget/items/[itemId] - Delete item
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

export const PUT = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: tripId, itemId } = await context.params;
  const body = await request.json();

  const supabase = await createServerClient();

  // Check access
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  if (!trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
  }

  if (trip.user_id !== user.id) {
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!collab || collab.role !== 'editor') {
      throw new CustomError(ErrorCode.FORBIDDEN, 'You cannot edit this budget item', 403);
    }
  }

  const updateData: Record<string, any> = {};
  if (body.category !== undefined) updateData.category = body.category;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.estimated_cost !== undefined) updateData.estimated_cost = body.estimated_cost;
  if (body.actual_cost !== undefined) updateData.actual_cost = body.actual_cost;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.is_paid !== undefined) updateData.is_paid = body.is_paid;
  if (body.day !== undefined) updateData.day = body.day;
  updateData.updated_at = new Date().toISOString();

  const { data: item, error } = await supabase
    .from('budget_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('trip_id', tripId)
    .select()
    .single();

  if (error || !item) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Budget item not found', 404);
  }

  return NextResponse.json({ item });
});

export const DELETE = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: tripId, itemId } = await context.params;

  const supabase = await createServerClient();

  // Check access
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  if (!trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
  }

  if (trip.user_id !== user.id) {
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!collab || collab.role !== 'editor') {
      throw new CustomError(ErrorCode.FORBIDDEN, 'You cannot delete this budget item', 403);
    }
  }

  const { error } = await supabase
    .from('budget_items')
    .delete()
    .eq('id', itemId)
    .eq('trip_id', tripId);

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to delete budget item', 500);
  }

  return NextResponse.json({ success: true });
});
