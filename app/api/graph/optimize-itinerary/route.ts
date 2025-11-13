import { NextRequest, NextResponse } from 'next/server';
import {
  validateItineraryOptimizationRequest,
  validateItineraryOptimizationResponse,
} from '@/lib/contracts/itinerary-contract';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/graph/optimize-itinerary
 * Optimize a multi-day itinerary using graph and geographic data
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const validation = validateItineraryOptimizationRequest(payload);

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid itinerary optimization payload', details: validation.errors },
        { status: 400 }
      );
    }

    const { destination_ids, max_days = 3 } = validation.data;

    const response = await fetch(`${ML_SERVICE_URL}/api/graph/optimize-itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination_ids, max_days }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'ML service error' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to optimize itinerary' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const responseValidation = validateItineraryOptimizationResponse(data);

    if (!responseValidation.valid) {
      console.error('ML service returned invalid itinerary payload', responseValidation.errors);
      return NextResponse.json(
        { error: 'ML service response failed contract validation', details: responseValidation.errors },
        { status: 502 }
      );
    }

    return NextResponse.json(responseValidation.data);
  } catch (error) {
    console.error('Error in graph optimize-itinerary:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

