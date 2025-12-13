/**
 * Multi-City Planning API
 *
 * Build intelligent multi-city itineraries with transit suggestions.
 * Example: "Planning a Tokyo and Kyoto trip"
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { smartConversationEngine, MultiCityPlan } from '@/services/intelligence/smart-conversation-engine';
import { unifiedIntelligenceCore } from '@/services/intelligence/unified-intelligence-core';
import {
  MultiCityPlanRequestSchema,
  createValidationErrorResponse,
} from '@/lib/schemas/intelligence';

// ============================================
// BUILD MULTI-CITY ITINERARY
// ============================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const supabase = await createServerClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;

    // Validate request body with Zod
    const rawBody = await request.json();
    const parseResult = MultiCityPlanRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(createValidationErrorResponse(parseResult.error), { status: 400 });
    }

    const { cities, daysPerCity, sessionId } = parseResult.data;

    // Get session context
    const session = await smartConversationEngine.getOrCreateSession(sessionId, userId);

    // Get intelligence context if logged in
    let intelligenceContext = null;
    if (userId) {
      try {
        const result = await unifiedIntelligenceCore.processIntelligentQuery(
          `multi-city trip: ${cities.join(', ')}`,
          userId,
          session.id,
          { currentCity: cities[0] }
        );
        intelligenceContext = result.context;
      } catch (error) {
        console.error('Error getting intelligence context:', error);
      }
    }

    // Build multi-city itinerary
    const multiCityPlan = await smartConversationEngine.buildMultiCityItinerary(
      cities,
      session,
      intelligenceContext,
      daysPerCity
    );

    return NextResponse.json({
      success: true,
      data: {
        plan: multiCityPlan,
        summary: {
          cities: multiCityPlan.route,
          totalDays: multiCityPlan.totalDays,
          totalStops: multiCityPlan.cities.reduce((sum, c) => sum + c.itinerary.slots.length, 0),
        },
        // Include formatted overview
        overview: formatMultiCityOverview(multiCityPlan),
      },
    });
  } catch (error: any) {
    console.error('[Multi-City] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to build multi-city itinerary',
    }, { status: 500 });
  }
});

// ============================================
// HELPERS
// ============================================

function formatMultiCityOverview(plan: MultiCityPlan): string[] {
  const lines: string[] = [];

  lines.push(`🗺️ ${plan.route.join(' → ')} (${plan.totalDays} days)`);
  lines.push('');

  for (let i = 0; i < plan.cities.length; i++) {
    const cityPlan = plan.cities[i];
    lines.push(`📍 ${cityPlan.city} (${cityPlan.days} day${cityPlan.days > 1 ? 's' : ''})`);

    // Top highlights
    if (cityPlan.highlights.length > 0) {
      lines.push(`   Highlights: ${cityPlan.highlights.slice(0, 3).join(', ')}`);
    }

    // Transit to next city
    if (cityPlan.transitTo) {
      const transit = plan.suggestedTransit.find(t => t.from === cityPlan.city);
      if (transit) {
        lines.push(`   🚄 To ${transit.to}: ${transit.mode} (${transit.duration})`);
        if (transit.tip) {
          lines.push(`      💡 ${transit.tip}`);
        }
      }
    }

    lines.push('');
  }

  return lines;
}
