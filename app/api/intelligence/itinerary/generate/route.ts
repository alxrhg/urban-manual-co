import { NextRequest, NextResponse } from 'next/server';
import { itineraryIntelligenceService } from '@/services/intelligence/itinerary';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { city, duration_days, preferences, save } = body;

    if (!city || !duration_days) {
      return NextResponse.json(
        { error: 'city and duration_days are required' },
        { status: 400 }
      );
    }

    const itinerary = await itineraryIntelligenceService.generateItinerary(
      city,
      duration_days,
      preferences,
      user?.id
    );

    if (!itinerary) {
      return NextResponse.json(
        { error: 'Unable to generate itinerary. No destinations found.' },
        { status: 404 }
      );
    }

    // Save if requested
    let savedId = null;
    if (save && user) {
      savedId = await itineraryIntelligenceService.saveItinerary(itinerary, user.id);
    }

    return NextResponse.json({
      itinerary,
      saved_id: savedId,
    });
  } catch (error: any) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      { error: 'Failed to generate itinerary', details: error.message },
      { status: 500 }
    );
  }
}

