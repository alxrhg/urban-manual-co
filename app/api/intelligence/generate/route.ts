/**
 * Travel Intelligence API
 * Generate travel intelligence - this is the product, not a feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateTravelIntelligence, type TravelIntelligenceInput } from '@/services/intelligence/engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input: TravelIntelligenceInput = {
      destination: body.destination,
      dates: {
        start: new Date(body.dates.start),
        end: new Date(body.dates.end),
      },
      preferences: {
        architectural_interests: body.preferences?.architectural_interests || [],
        travel_style: body.preferences?.travel_style || 'balanced',
        budget_range: body.preferences?.budget_range || 'moderate',
        group_size: body.preferences?.group_size || 1,
        special_requirements: body.preferences?.special_requirements || [],
      },
    };

    // Validate input
    if (!input.destination || !input.dates.start || !input.dates.end) {
      return NextResponse.json(
        { error: 'Missing required fields: destination, dates.start, dates.end' },
        { status: 400 }
      );
    }

    // Generate intelligence
    const intelligence = await generateTravelIntelligence(input);

    return NextResponse.json(intelligence);
  } catch (error: any) {
    console.error('Error generating travel intelligence:', error);
    return NextResponse.json(
      { error: 'Failed to generate travel intelligence', details: error.message },
      { status: 500 }
    );
  }
}

