import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Graph-based sequencing API endpoints
 *
 * POST /api/graph/suggest-next - Suggest next places based on co-visitation
 * POST /api/graph/complete-day - Suggest complete day itinerary
 * POST /api/graph/optimize-itinerary - Optimize multi-day itinerary
 */

/**
 * POST /api/graph/suggest-next
 * Suggest next places based on co-visitation graph
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { destination_id, limit = 5, exclude_ids, max_distance_km = 10.0 } = body;

  if (!destination_id) {
    return NextResponse.json(
      { error: 'destination_id is required' },
      { status: 400 }
    );
  }

  const response = await fetch(`${ML_SERVICE_URL}/api/graph/suggest-next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      destination_id,
      limit,
      exclude_ids,
      max_distance_km,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'ML service error' }));
    return NextResponse.json(
      { error: error.detail || 'Failed to get suggestions' },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
});

/**
 * GET /api/graph/suggest-next?destination_id=xxx&limit=5
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const destination_id = parseInt(searchParams.get('destination_id') || '0');
  const limit = parseInt(searchParams.get('limit') || '5');
  const max_distance_km = parseFloat(searchParams.get('max_distance_km') || '10.0');

  if (!destination_id) {
    return NextResponse.json(
      { error: 'destination_id is required' },
      { status: 400 }
    );
  }

  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ destination_id, limit, max_distance_km }),
    })
  );
});

