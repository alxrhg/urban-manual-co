import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';

interface PersistItineraryItem {
  day: number;
  order: number;
  name: string;
  slug?: string | null;
  time?: string | null;
  category?: string | null;
  notes?: string | null;
  cost?: number | null;
  duration?: number | null;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  image?: string | null;
  city?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface PersistItineraryRequest {
  items: PersistItineraryItem[];
  metadata?: {
    reasoning?: string;
    confidence?: number;
    adjustments?: Record<string, unknown>;
    generatedAt?: string;
  } | null;
}

async function ensureTripOwnership(
  supabase: SupabaseClient,
  tripId: string,
  userId: string
) {
  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .single();

  if (error || !trip) {
    return { status: 404, message: 'Trip not found' } as const;
  }

  if (trip.user_id !== userId) {
    return { status: 403, message: 'Forbidden' } as const;
  }

  return { status: 200 } as const;
}

export async function GET(
  _request: NextRequest,
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

    const tripId = params.tripId;
    const ownership = await ensureTripOwnership(supabase, tripId, user.id);
    if (ownership.status !== 200) {
      return NextResponse.json({ error: ownership.message }, { status: ownership.status });
    }

    const { data: items, error } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('day', { ascending: true })
      .order('order_index', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch itinerary items', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error('[Trip Items] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

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

    const tripId = params.tripId;
    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    const ownership = await ensureTripOwnership(supabase, tripId, user.id);
    if (ownership.status !== 200) {
      return NextResponse.json({ error: ownership.message }, { status: ownership.status });
    }

    const body = (await request.json()) as PersistItineraryRequest | null;
    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Request body must include an items array.' },
        { status: 400 }
      );
    }

    const preparedItems = body.items.map((item) => {
      const notesData: Record<string, unknown> = {
        raw: item.notes || '',
        cost: item.cost ?? undefined,
        duration: item.duration ?? undefined,
        mealType: item.mealType ?? undefined,
        image: item.image ?? undefined,
        city: item.city ?? undefined,
        category: item.category ?? undefined,
      };

      if (body.metadata) {
        notesData.ai = {
          reasoning: body.metadata.reasoning,
          confidence: body.metadata.confidence,
          adjustments: body.metadata.adjustments,
          generatedAt: body.metadata.generatedAt,
        };
      }

      if (item.metadata && Object.keys(item.metadata).length > 0) {
        notesData.metadata = item.metadata;
      }

      return {
        trip_id: tripId,
        destination_slug: item.slug || null,
        day: item.day,
        order_index: item.order,
        time: item.time || null,
        title: item.name,
        description: item.category || '',
        notes: JSON.stringify(notesData),
      };
    });

    const { error: deleteError } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('trip_id', tripId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to reset itinerary items', details: deleteError.message },
        { status: 500 }
      );
    }

    if (preparedItems.length > 0) {
      const { error: insertError } = await supabase
        .from('itinerary_items')
        .insert(preparedItems);

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to persist itinerary items', details: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, count: preparedItems.length });
  } catch (error) {
    console.error('[Trip Items] POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
