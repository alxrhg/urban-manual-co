import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { multiDayTripPlanningService } from '@/services/intelligence/multi-day-planning';

interface GenerateRequestBody {
  mode?: 'generate' | 'regenerate' | 'refine';
  pacing?: 'relaxed' | 'balanced' | 'packed';
  budgetPreference?: 'budget' | 'mid' | 'luxury';
  themes?: string[];
  customPrompt?: string;
  dayNumber?: number;
}

type DestinationRow = {
  id: number;
  slug?: string | null;
  name?: string | null;
  city?: string | null;
  category?: string | null;
  primary_photo_url?: string | null;
  photo_url?: string | null;
  photos_json?: string | null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as GenerateRequestBody | null;
    const {
      mode = 'generate',
      pacing,
      budgetPreference,
      themes,
      customPrompt,
      dayNumber,
    } = body || {};

    const tripId = params.tripId;
    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    // Verify trip ownership and load trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id, destination, start_date, end_date')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: tripError?.code === 'PGRST116' ? 403 : 404 }
      );
    }

    if (trip.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const city = trip.destination;
    const startDate = trip.start_date;
    const endDate = trip.end_date;

    if (!city || !startDate || !endDate) {
      return NextResponse.json(
        {
          error:
            'Trip must include a destination, start date, and end date before requesting an AI itinerary.',
        },
        { status: 400 }
      );
    }

    const preferences: {
      categories?: string[];
      budget?: number;
      style?: string;
    } = {};

    if (themes && themes.length > 0) {
      preferences.categories = themes;
    }

    let stylePreference: string | undefined;
    if (typeof pacing === 'string') {
      stylePreference = pacing;
    }

    if (customPrompt?.trim()) {
      stylePreference = stylePreference
        ? `${stylePreference}; ${customPrompt.trim()}`
        : customPrompt.trim();
    }

    if (stylePreference) {
      preferences.style = stylePreference;
    }

    if (typeof budgetPreference === 'string') {
      const budgetMap: Record<string, number> = {
        budget: 75,
        mid: 150,
        luxury: 350,
      };
      preferences.budget = budgetMap[budgetPreference] ?? undefined;
    }

    const plan = await multiDayTripPlanningService.generateMultiDayPlan(
      city,
      new Date(startDate),
      new Date(endDate),
      Object.keys(preferences).length > 0 ? preferences : undefined,
      user.id
    );

    if (!plan) {
      return NextResponse.json(
        { error: 'Unable to generate an itinerary at this time. Please try again later.' },
        { status: 503 }
      );
    }

    const destinationIds = Array.from(
      new Set(
        plan.days
          .flatMap((day) => day.items.map((item) => item.destinationId))
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id))
      )
    );

    let destinations: DestinationRow[] = [];
    if (destinationIds.length > 0) {
      const { data: destinationData, error: destinationsError } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, primary_photo_url, photo_url, photos_json')
        .in('id', destinationIds);

      if (destinationsError) {
        return NextResponse.json(
          { error: 'Failed to hydrate itinerary details', details: destinationsError.message },
          { status: 500 }
        );
      }

      destinations = destinationData || [];
    }

    const destinationLookup = new Map<number, DestinationRow>();
    destinations.forEach((destination) => {
      destinationLookup.set(destination.id, destination);
    });

    const totalBudget = plan.optimization.totalEstimatedCost;

    const reasoningParts: string[] = [];
    if (pacing) {
      reasoningParts.push(
        pacing === 'packed'
          ? 'emphasizing a high-energy schedule'
          : pacing === 'relaxed'
          ? 'keeping a relaxed pace'
          : 'balancing activity and downtime'
      );
    }

    if (themes && themes.length > 0) {
      reasoningParts.push(`highlighting ${themes.join(', ')}`);
    }

    if (budgetPreference) {
      const budgetLabel =
        budgetPreference === 'luxury'
          ? 'premium experiences'
          : budgetPreference === 'budget'
          ? 'cost-conscious picks'
          : 'a mid-range spend';
      reasoningParts.push(`with ${budgetLabel}`);
    }

    const reasoningIntro = `Generated a ${plan.durationDays}-day itinerary for ${city}.`;
    const reasoningSummary = reasoningParts.length > 0 ? ` This draft ${reasoningParts.join(', ')}.` : '';
    const reasoningOptimization = ` Optimized for ${(plan.optimization.routeEfficiency * 100).toFixed(0)}% route efficiency with an estimated total cost of $${Math.round(totalBudget)}.`;

    const confidence = Math.min(
      0.95,
      Math.max(0.55, 0.55 + plan.optimization.routeEfficiency * 0.35)
    );

    const responsePayload = {
      trip: {
        id: tripId,
        destination: city,
        startDate,
        endDate,
      },
      metadata: {
        reasoning: `${reasoningIntro}${reasoningSummary}${reasoningOptimization}`,
        confidence,
        generatedAt: new Date().toISOString(),
        mode,
        dayNumber: typeof dayNumber === 'number' ? dayNumber : undefined,
        adjustments: {
          pacing,
          budgetPreference,
          themes: themes?.length ? themes : undefined,
          customPrompt: customPrompt?.trim() ? customPrompt.trim() : undefined,
        },
        optimization: plan.optimization,
      },
      totals: {
        estimatedCost: totalBudget,
        estimatedTravelMinutes: plan.optimization.totalTravelTime,
      },
      days: plan.days.map((day) => {
        const isoDate = day.date.toISOString();
        return {
          dayNumber: day.dayNumber,
          date: isoDate,
          summary: day.items.length
            ? `Planned ${day.items.length} activities with about ${Math.round(
                day.totalTravelTime
              )} minutes of travel.`
            : 'Open day for self-guided exploration.',
          totals: {
            estimatedCost: day.estimatedCost,
            travelMinutes: day.totalTravelTime,
          },
          items: day.items.map((item, index) => {
            const destination = item.destinationId
              ? destinationLookup.get(item.destinationId)
              : undefined;
            const fallbackName = destination?.name || `Stop ${index + 1}`;
            const images = destination?.photos_json ? JSON.parse(destination.photos_json) : null;
            const primaryPhoto = destination?.primary_photo_url || destination?.photo_url;
            const galleryPhoto = Array.isArray(images) && images.length > 0 ? images[0]?.url : undefined;

            return {
              destinationId: item.destinationId,
              slug: destination?.slug || null,
              name: fallbackName,
              city: destination?.city || city,
              category: destination?.category || 'Experience',
              image: primaryPhoto || galleryPhoto || '/placeholder-image.jpg',
              startTime: item.startTime,
              endTime: item.endTime,
              durationMinutes: item.durationMinutes,
              travelTimeMinutes: item.travelTimeMinutes,
              estimatedCost: item.estimatedCost,
              notes: item.notes,
              order: item.order,
              timeOfDay: item.timeOfDay,
            };
          }),
        };
      }),
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('[Trip Generation] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
