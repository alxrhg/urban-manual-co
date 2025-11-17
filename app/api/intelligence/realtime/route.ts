/**
 * Real-Time Intelligence API
 * Get real-time adjustments for destinations
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRealTimeAdjustments } from '@/services/intelligence/realtime';

export async function POST(request: NextRequest) {
  try {
    const { destinationIds, dates } = await request.json();

    if (!destinationIds || !Array.isArray(destinationIds) || destinationIds.length === 0) {
      return NextResponse.json(
        { error: 'destinationIds array is required' },
        { status: 400 }
      );
    }

    if (!dates || !dates.start || !dates.end) {
      return NextResponse.json(
        { error: 'dates.start and dates.end are required' },
        { status: 400 }
      );
    }

    const adjustments = await generateRealTimeAdjustments(
      destinationIds,
      {
        start: new Date(dates.start),
        end: new Date(dates.end),
      }
    );

    return NextResponse.json({ adjustments });
  } catch (error: any) {
    console.error('Error generating real-time adjustments:', error);
    return NextResponse.json(
      { error: 'Failed to generate real-time adjustments', details: error.message },
      { status: 500 }
    );
  }
}

