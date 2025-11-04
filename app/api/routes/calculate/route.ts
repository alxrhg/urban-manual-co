/**
 * API Route: Calculate route between destinations
 * POST /api/routes/calculate
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateRoute } from '@/lib/enrichment/routes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, mode = 'walking', waypoints } = body;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      );
    }

    const route = await calculateRoute(origin, destination, mode, waypoints);

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(route);
  } catch (error: any) {
    console.error('Error calculating route:', error);
    return NextResponse.json(
      { error: 'Failed to calculate route' },
      { status: 500 }
    );
  }
}

