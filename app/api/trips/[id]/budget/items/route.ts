/**
 * Budget items API
 * POST /api/trips/[id]/budget/items - Add budget item
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { CreateBudgetItemInput } from '@/types/features';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const body: CreateBudgetItemInput = await request.json();

  if (!body.category) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'Category is required', 400);
  }

  const validCategories = ['food', 'accommodation', 'transport', 'activities', 'shopping', 'other'];
  if (!validCategories.includes(body.category)) {
    throw new CustomError(
      ErrorCode.VALIDATION_ERROR,
      `Category must be one of: ${validCategories.join(', ')}`,
      400
    );
  }

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
      throw new CustomError(ErrorCode.FORBIDDEN, 'You cannot add items to this budget', 403);
    }
  }

  const { data: item, error } = await supabase
    .from('budget_items')
    .insert({
      trip_id: tripId,
      itinerary_item_id: body.itinerary_item_id,
      category: body.category,
      description: body.description,
      estimated_cost: body.estimated_cost,
      actual_cost: body.actual_cost,
      currency: body.currency || 'USD',
      is_paid: body.is_paid || false,
      day: body.day,
    })
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to add budget item', 500);
  }

  return NextResponse.json({ item }, { status: 201 });
});
