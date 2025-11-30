/**
 * Real-Time Intelligence API
 * Get real-time adjustments for destinations
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRealTimeAdjustments } from '@/services/intelligence/realtime';
import { withErrorHandling, createValidationError } from '@/lib/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { destinationIds, dates } = await request.json();

  if (!destinationIds || !Array.isArray(destinationIds) || destinationIds.length === 0) {
    throw createValidationError('destinationIds array is required');
  }

  if (!dates || !dates.start || !dates.end) {
    throw createValidationError('dates.start and dates.end are required');
  }

  const adjustments = await generateRealTimeAdjustments(
    destinationIds,
    {
      start: new Date(dates.start),
      end: new Date(dates.end),
    }
  );

  return NextResponse.json({ adjustments });
});

