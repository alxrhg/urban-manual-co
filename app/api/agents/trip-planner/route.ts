/**
 * AI Trip Planner Agent API
 * Endpoint for AI-powered trip planning with automatic tool calling
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTripPlannerAgent, TripPlannerInput } from '@/lib/agents/trip-planner-agent';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for complex planning

/**
 * POST /api/agents/trip-planner
 * Plan a trip using AI with automatic tool calling
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  const { prompt, tripId, context } = body as {
    prompt?: string;
    tripId?: string;
    context?: TripPlannerInput['existingContext'];
  };

  if (!prompt || typeof prompt !== 'string') {
    throw createValidationError('Prompt is required');
  }

  // Get user from session if authenticated
  let userId: string | undefined;
  let userName: string | undefined;

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
      userName = user.user_metadata?.full_name || user.email?.split('@')[0];
    }
  } catch {
    // Continue without authentication
  }

  // Create and execute the agent
  const agent = createTripPlannerAgent();
  const result = await agent.execute({
    prompt,
    userId,
    userName,
    tripId,
    existingContext: context,
  });

  return NextResponse.json(result);
});

/**
 * GET /api/agents/trip-planner
 * Get information about the trip planner agent capabilities
 */
export async function GET() {
  return NextResponse.json({
    name: 'Trip Planner Agent',
    description: 'AI-powered trip planning with automatic tool calling',
    capabilities: [
      'Search for flights between airports',
      'Find hotels with availability and pricing',
      'Get weather forecasts for destinations',
      'Discover activities and experiences',
      'Get curated recommendations from Urban Manual',
      'Search for ground transportation',
    ],
    tools: [
      {
        name: 'searchFlights',
        description: 'Search for flights between two airports',
      },
      {
        name: 'getFlightDetails',
        description: 'Get detailed flight information',
      },
      {
        name: 'searchHotels',
        description: 'Search for hotels in a location',
      },
      {
        name: 'getHotelDetails',
        description: 'Get detailed hotel information',
      },
      {
        name: 'getWeather',
        description: 'Get weather forecast for a location',
      },
      {
        name: 'searchActivities',
        description: 'Search for activities and experiences',
      },
      {
        name: 'getRecommendations',
        description: 'Get curated local recommendations',
      },
      {
        name: 'searchTransportation',
        description: 'Search for ground transportation',
      },
    ],
    usage: {
      endpoint: 'POST /api/agents/trip-planner',
      body: {
        prompt: 'string (required) - What the user wants to plan',
        tripId: 'string (optional) - Existing trip ID for context',
        context: {
          destinations: 'string[] (optional) - Known destinations',
          dates: '{ start: string, end: string } (optional) - Travel dates',
          travelers: 'number (optional) - Number of travelers',
          budget: 'number (optional) - Budget in USD',
          preferences: 'string[] (optional) - Travel preferences',
        },
      },
    },
  });
}
