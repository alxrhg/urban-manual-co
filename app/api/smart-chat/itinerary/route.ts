/**
 * Itinerary Intelligence API
 *
 * Build intelligent day itineraries with logical flow
 * and convert them to actual trips
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { smartConversationEngine, ItineraryPlan } from '@/services/intelligence/smart-conversation-engine';
import { unifiedIntelligenceCore } from '@/services/intelligence/unified-intelligence-core';

// ============================================
// BUILD ITINERARY
// ============================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const supabase = await createServerClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;

    const body = await request.json();
    const {
      city,
      duration = 'day',
      neighborhood,
      sessionId,
    } = body;

    if (!city) {
      return NextResponse.json({
        success: false,
        error: 'City is required',
      }, { status: 400 });
    }

    // Get session context
    const session = await smartConversationEngine.getOrCreateSession(sessionId, userId);

    // Get intelligence context if logged in
    let intelligenceContext = null;
    if (userId) {
      try {
        const result = await unifiedIntelligenceCore.processIntelligentQuery(
          `itinerary in ${city}`,
          userId,
          session.id,
          { currentCity: city }
        );
        intelligenceContext = result.context;
      } catch (error) {
        console.error('Error getting intelligence context:', error);
      }
    }

    // Build itinerary
    const itinerary = await smartConversationEngine.buildItinerary(
      city,
      duration,
      session,
      intelligenceContext,
      neighborhood
    );

    if (itinerary.slots.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No destinations found for ${city}${neighborhood ? ` (${neighborhood})` : ''}`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        itinerary,
        summary: {
          city,
          neighborhood,
          duration,
          totalStops: itinerary.slots.length,
          totalDuration: `${Math.round(itinerary.totalDuration / 60)}h ${itinerary.totalDuration % 60}m`,
          walkingTime: `${itinerary.walkingTime} min`,
        },
        // Include readable format
        formatted: formatItinerary(itinerary),
      },
    });
  } catch (error: any) {
    console.error('[Itinerary] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to build itinerary',
    }, { status: 500 });
  }
});

// ============================================
// CONVERT TO TRIP
// ============================================

export const PUT = withErrorHandling(async (request: NextRequest) => {
  try {
    const supabase = await createServerClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required to save trip',
      }, { status: 401 });
    }

    const body = await request.json();
    const { itinerary, tripName, date } = body;

    if (!itinerary || !itinerary.slots) {
      return NextResponse.json({
        success: false,
        error: 'Itinerary data is required',
      }, { status: 400 });
    }

    // Convert to trip
    const result = await smartConversationEngine.convertItineraryToTrip(
      itinerary,
      authSession.user.id,
      tripName,
      date
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create trip',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        tripId: result.tripId,
        message: `Trip "${tripName || itinerary.city + ' Trip'}" created successfully`,
      },
    });
  } catch (error: any) {
    console.error('[Itinerary → Trip] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to convert itinerary to trip',
    }, { status: 500 });
  }
});

// ============================================
// HELPERS
// ============================================

function formatItinerary(itinerary: ItineraryPlan): string[] {
  const lines: string[] = [];

  for (let i = 0; i < itinerary.slots.length; i++) {
    const slot = itinerary.slots[i];

    // Add walking time from previous
    if (slot.walkingTimeFromPrevious && slot.walkingTimeFromPrevious > 0) {
      lines.push(`  ↓ ${slot.walkingTimeFromPrevious} min walk`);
    }

    // Add slot
    const dest = slot.destination;
    lines.push(
      `${slot.time} - ${slot.timeLabel}: ${dest.name}` +
      (dest.category ? ` (${dest.category})` : '') +
      (slot.reasoning.primaryReason ? ` • ${slot.reasoning.primaryReason}` : '')
    );
  }

  return lines;
}
