/**
 * Smart Chat API
 *
 * Intelligent conversation endpoint that provides:
 * - Persistent sessions (continues across page reloads)
 * - Cross-session learning (remembers past conversations)
 * - Real-time behavior integration
 * - Proactive suggestions and actions
 * - Trip-aware responses
 * - Taste fingerprint personalization
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { smartConversationEngine, BehaviorSignal } from '@/services/intelligence/smart-conversation-engine';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
  createRateLimitResponse,
} from '@/lib/rate-limit';
import type { TripContextForAI, TripAccommodation, ItineraryItemForAI, ScheduleGapForAI } from '@/types/trip';

// ============================================
// MAIN CHAT ENDPOINT
// ============================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    // Get user session
    const supabase = await createServerClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;

    // Parse request
    const body = await request.json();
    const {
      message,
      sessionId,
      includeProactiveActions = true,
      maxDestinations = 10,
      // NEW: Trip context for AI-native trip planning
      tripContext: rawTripContext,
    } = body;

    // Enrich trip context if provided
    let enrichedTripContext: TripContextForAI | undefined;
    if (rawTripContext?.tripId) {
      enrichedTripContext = await enrichTripContext(supabase, rawTripContext, userId);
    }

    // Rate limiting
    const identifier = getIdentifier(request, userId);
    const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return createRateLimitResponse(
        'Too many requests. Please wait a moment.',
        limit,
        remaining,
        reset
      );
    }

    // Validate message
    if (!message || message.trim().length < 2) {
      return NextResponse.json({
        error: 'Message too short',
        message: 'Please provide a longer message.',
      }, { status: 400 });
    }

    // Process message through smart conversation engine
    const response = await smartConversationEngine.processMessage(
      sessionId || null,
      userId,
      message.trim(),
      {
        includeProactiveActions,
        maxDestinations,
        // NEW: Pass enriched trip context
        tripContext: enrichedTripContext,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        content: response.content,
        destinations: response.destinations,
        suggestions: response.suggestions,
        contextualHints: response.contextualHints,
        proactiveActions: response.proactiveActions,
        tripPlan: response.tripPlan,
        conversationId: response.conversationId,
        turnNumber: response.turnNumber,
        intent: response.intent,
        confidence: response.confidence,
        // NEW: Trip-aware response fields
        executableActions: response.executableActions,
        tripAwareness: response.tripAwareness,
      },
    });
  } catch (error: any) {
    console.error('[Smart Chat] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process message',
      content: 'Sorry, I encountered an error. Please try again.',
      destinations: [],
    }, { status: 500 });
  }
});

// ============================================
// GET - Continue/Load Session
// ============================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID required',
      }, { status: 400 });
    }

    // Get user session
    const supabase = await createServerClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;

    // Continue conversation
    const result = await smartConversationEngine.continueConversation(
      sessionId,
      userId
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.session.id,
        messages: result.session.messages,
        context: result.session.context,
        welcomeBack: result.welcomeBack,
        suggestions: result.suggestions,
        lastActive: result.session.lastActive,
      },
    });
  } catch (error: any) {
    console.error('[Smart Chat] Error loading session:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to load session',
    }, { status: 500 });
  }
});

// ============================================
// HELPER: Enrich Trip Context
// ============================================

/**
 * Enriches the raw trip context from the client with full details from the database.
 * This includes:
 * - Full accommodation details (coordinates, neighborhood)
 * - Complete itinerary items with destination details
 * - Calculated schedule gaps
 */
async function enrichTripContext(
  supabase: any,
  rawContext: Partial<TripContextForAI>,
  userId?: string
): Promise<TripContextForAI | undefined> {
  try {
    const tripId = rawContext.tripId;
    if (!tripId) return undefined;

    // Fetch the trip with accommodation details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        id,
        title,
        destination,
        start_date,
        end_date,
        traveler_count,
        trip_style,
        accommodation_destination_id,
        accommodation_slug,
        accommodation_name,
        accommodation_coordinates,
        accommodation_neighborhood,
        accommodation_checkin,
        accommodation_checkout
      `)
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      console.warn('[Smart Chat] Could not fetch trip for context:', tripError);
      return undefined;
    }

    // Fetch itinerary items
    const { data: items, error: itemsError } = await supabase
      .from('itinerary_items')
      .select('id, day, time, order_index, title, destination_slug, notes')
      .eq('trip_id', tripId)
      .order('day', { ascending: true })
      .order('order_index', { ascending: true });

    if (itemsError) {
      console.warn('[Smart Chat] Could not fetch itinerary items:', itemsError);
    }

    // Get destination details for items
    const slugs = (items || [])
      .map((item: any) => item.destination_slug)
      .filter((s: string | null): s is string => Boolean(s));

    let destinationMap: Record<string, any> = {};
    if (slugs.length > 0) {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('slug, name, category, latitude, longitude')
        .in('slug', slugs);

      if (destinations) {
        destinationMap = destinations.reduce((acc: Record<string, any>, d: any) => {
          acc[d.slug] = d;
          return acc;
        }, {});
      }
    }

    // Build itinerary items for AI
    const itineraryForAI: ItineraryItemForAI[] = (items || []).map((item: any) => {
      const dest = item.destination_slug ? destinationMap[item.destination_slug] : null;
      // Parse notes to get duration
      let duration = 60; // default
      if (item.notes) {
        try {
          const notesData = JSON.parse(item.notes);
          duration = notesData.duration || 60;
        } catch { /* ignore */ }
      }

      return {
        id: item.id,
        day: item.day,
        timeSlot: item.time || '',
        destinationSlug: item.destination_slug || '',
        destinationName: dest?.name || item.title || '',
        category: dest?.category || 'activity',
        duration,
        coordinates: dest?.latitude && dest?.longitude
          ? { latitude: dest.latitude, longitude: dest.longitude }
          : undefined,
      };
    });

    // Calculate schedule gaps
    const scheduleGaps = calculateScheduleGaps(trip, itineraryForAI);

    // Build accommodation object
    let accommodation: TripAccommodation | undefined;
    if (trip.accommodation_name) {
      accommodation = {
        destinationId: trip.accommodation_destination_id,
        slug: trip.accommodation_slug || '',
        name: trip.accommodation_name,
        coordinates: trip.accommodation_coordinates
          ? { latitude: trip.accommodation_coordinates.lat, longitude: trip.accommodation_coordinates.lng }
          : { latitude: 0, longitude: 0 },
        neighborhood: trip.accommodation_neighborhood,
        checkinTime: trip.accommodation_checkin || '15:00',
        checkoutTime: trip.accommodation_checkout || '11:00',
      };
    }

    // Parse destinations from the destination field
    let destinations: string[] = [];
    if (trip.destination) {
      try {
        if (trip.destination.startsWith('[')) {
          destinations = JSON.parse(trip.destination);
        } else {
          destinations = [trip.destination];
        }
      } catch {
        destinations = [trip.destination];
      }
    }

    return {
      tripId: trip.id,
      title: trip.title,
      city: destinations[0] || '',
      destinations,
      dates: {
        start: trip.start_date || '',
        end: trip.end_date || '',
      },
      currentDay: rawContext.currentDay,
      accommodation,
      itinerary: itineraryForAI,
      scheduleGaps,
      travelers: trip.traveler_count || 1,
      tripStyle: trip.trip_style,
    };
  } catch (error) {
    console.error('[Smart Chat] Error enriching trip context:', error);
    return undefined;
  }
}

/**
 * Calculate schedule gaps for AI recommendations
 */
function calculateScheduleGaps(
  trip: any,
  itinerary: ItineraryItemForAI[]
): ScheduleGapForAI[] {
  const gaps: ScheduleGapForAI[] = [];

  if (!trip.start_date || !trip.end_date) return gaps;

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Standard time slots
  const slots = [
    { slot: 'breakfast' as const, startTime: '08:00', endTime: '10:00' },
    { slot: 'morning' as const, startTime: '10:00', endTime: '12:00' },
    { slot: 'lunch' as const, startTime: '12:00', endTime: '14:00' },
    { slot: 'afternoon' as const, startTime: '14:00', endTime: '18:00' },
    { slot: 'dinner' as const, startTime: '18:00', endTime: '21:00' },
    { slot: 'evening' as const, startTime: '21:00', endTime: '23:00' },
  ];

  for (let day = 1; day <= dayCount; day++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + day - 1);
    const dateStr = dayDate.toISOString().split('T')[0];

    const dayItems = itinerary.filter(item => item.day === day);

    for (const { slot, startTime, endTime } of slots) {
      // Check if there's an item that overlaps with this slot
      const hasItem = dayItems.some(item => {
        if (!item.timeSlot) return false;
        const itemHour = parseInt(item.timeSlot.split(':')[0], 10);
        const slotStartHour = parseInt(startTime.split(':')[0], 10);
        const slotEndHour = parseInt(endTime.split(':')[0], 10);
        return itemHour >= slotStartHour && itemHour < slotEndHour;
      });

      if (!hasItem) {
        const startHour = parseInt(startTime.split(':')[0], 10);
        const endHour = parseInt(endTime.split(':')[0], 10);
        gaps.push({
          day,
          date: dateStr,
          slot,
          startTime,
          endTime,
          durationMinutes: (endHour - startHour) * 60,
        });
      }
    }
  }

  return gaps;
}
