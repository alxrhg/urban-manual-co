/**
 * Trip budget API
 * GET /api/trips/[id]/budget - Get budget with items
 * POST /api/trips/[id]/budget - Create/update budget
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { CreateBudgetInput, CreateBudgetItemInput } from '@/types/features';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: tripId } = await context.params;

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

  const isOwner = trip.user_id === user.id;
  if (!isOwner) {
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!collab) {
      throw new CustomError(ErrorCode.FORBIDDEN, 'Access denied', 403);
    }
  }

  // Get budget
  const { data: budget } = await supabase
    .from('trip_budgets')
    .select('*')
    .eq('trip_id', tripId)
    .single();

  // Get budget items
  const { data: items } = await supabase
    .from('budget_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('day')
    .order('created_at');

  // Calculate totals
  const totalEstimated = items?.reduce((sum, item) => sum + (item.estimated_cost || 0), 0) || 0;
  const totalActual = items?.reduce((sum, item) => sum + (item.actual_cost || 0), 0) || 0;
  const remaining = budget?.total_budget ? budget.total_budget - totalActual : null;

  // Group by category
  const byCategory: Record<string, { estimated: number; actual: number }> = {};
  items?.forEach((item) => {
    if (!byCategory[item.category]) {
      byCategory[item.category] = { estimated: 0, actual: 0 };
    }
    byCategory[item.category].estimated += item.estimated_cost || 0;
    byCategory[item.category].actual += item.actual_cost || 0;
  });

  // Group by day
  const byDay: Record<number, { estimated: number; actual: number }> = {};
  items?.forEach((item) => {
    if (item.day !== null && item.day !== undefined) {
      if (!byDay[item.day]) {
        byDay[item.day] = { estimated: 0, actual: 0 };
      }
      byDay[item.day].estimated += item.estimated_cost || 0;
      byDay[item.day].actual += item.actual_cost || 0;
    }
  });

  return NextResponse.json({
    budget: budget || null,
    items: items || [],
    summary: {
      total_estimated: totalEstimated,
      total_actual: totalActual,
      remaining,
      by_category: byCategory,
      by_day: byDay,
    },
  });
});

export const POST = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const body: CreateBudgetInput = await request.json();

  const supabase = await createServerClient();

  // Check ownership
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  if (!trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
  }

  if (trip.user_id !== user.id) {
    // Check if editor
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!collab || collab.role !== 'editor') {
      throw new CustomError(ErrorCode.FORBIDDEN, 'You cannot edit this budget', 403);
    }
  }

  // Upsert budget
  const { data: budget, error } = await supabase
    .from('trip_budgets')
    .upsert(
      {
        trip_id: tripId,
        total_budget: body.total_budget,
        currency: body.currency || 'USD',
        daily_budget: body.daily_budget,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'trip_id' }
    )
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to save budget', 500);
  }

  return NextResponse.json({ budget });
});
