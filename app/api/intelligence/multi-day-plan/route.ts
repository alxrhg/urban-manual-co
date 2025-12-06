import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { multiDayTripPlanningService } from '@/services/intelligence/multi-day-planning';
import { createValidationError } from '@/lib/errors';
import { withCreditsCheck } from '@/lib/credits';

/**
 * POST /api/intelligence/multi-day-plan
 * Generate optimized multi-day trip plan with route optimization
 */
export const POST = withCreditsCheck(
  { operation: 'multi_day_plan' },
  async (request: NextRequest, _context, credits) => {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const {
      city,
      startDate,
      endDate,
      preferences,
      userId: requestUserId,
    } = await request.json();

    if (!city || !startDate || !endDate) {
      throw createValidationError('Missing required fields: city, startDate, endDate');
    }

    const plan = await multiDayTripPlanningService.generateMultiDayPlan(
      city,
      new Date(startDate),
      new Date(endDate),
      preferences,
      requestUserId || user?.id
    );

    if (!plan) {
      throw new Error('Failed to generate trip plan');
    }

    return NextResponse.json(plan);
  }
);

