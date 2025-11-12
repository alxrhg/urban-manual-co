import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  createPlannerRuntimePayload,
  extractPreferenceSeeds,
} from '@/lib/personalization/preferences';

const PLANNER_RUNTIME_URL = process.env.PLANNER_RUNTIME_URL || process.env.PLANNER_API_URL;

type PlannerAction = 'generate' | 'accept' | 'edit';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action: PlannerAction = body.action ?? 'generate';

    if (action === 'accept' || action === 'edit') {
      const eventType = action === 'accept' ? 'itinerary_accepted' : 'itinerary_edited';
      const { itineraryId, changes, metadata } = body;

      const { error: logError } = await supabase.from('user_event_log').insert({
        user_id: user.id,
        event_type: eventType,
        payload: {
          itineraryId: itineraryId ?? null,
          changes: changes ?? null,
          metadata: metadata ?? null,
        },
      });

      if (logError) {
        console.error('[planner] Failed to record itinerary event', logError);
        return NextResponse.json(
          { error: 'Failed to record itinerary event' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action !== 'generate') {
      return NextResponse.json({ error: 'Unsupported planner action' }, { status: 400 });
    }

    const { data: preferenceRow, error: preferenceError } = await supabase
      .from('user_preferences')
      .select('category_scores, city_scores, favorite_categories, favorite_cities, interests')
      .eq('user_id', user.id)
      .maybeSingle();

    if (preferenceError) {
      console.warn('[planner] Failed to load preference row', preferenceError);
    }

    const preferenceSeeds = extractPreferenceSeeds(preferenceRow || null);

    if (!PLANNER_RUNTIME_URL) {
      return NextResponse.json(
        {
          error: 'Planner runtime not configured',
          preferenceVector: preferenceSeeds.vector,
          preferenceVectorSource: preferenceSeeds.source,
        },
        { status: 500 }
      );
    }

    const runtimePayload = createPlannerRuntimePayload(body, user.id, preferenceSeeds);

    const runtimeResponse = await fetch(PLANNER_RUNTIME_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runtimePayload),
    });

    if (!runtimeResponse.ok) {
      const errorText = await runtimeResponse.text();
      return NextResponse.json(
        {
          error: 'Failed to generate itinerary',
          details: errorText,
          preferenceVector: preferenceSeeds.vector,
          preferenceVectorSource: preferenceSeeds.source,
        },
        { status: runtimeResponse.status }
      );
    }

    const result = await runtimeResponse.json();

    return NextResponse.json({
      ...result,
      preferenceVector: preferenceSeeds.vector,
      preferenceVectorSource: preferenceSeeds.source,
    });
  } catch (error: any) {
    console.error('[planner] Unexpected error', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

