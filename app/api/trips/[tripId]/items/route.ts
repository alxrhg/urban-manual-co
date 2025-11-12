import { NextRequest, NextResponse } from 'next/server';
import {
  createNotFoundError,
  createValidationError,
  handleSupabaseError,
  withErrorHandling,
} from '@/lib/errors';
import { requireUser } from '@/app/api/_utils/supabase';

type RouteContext = {
  params: { tripId: string };
};

type ItemPayload = {
  id?: string;
  destination_slug?: string | null;
  day: number;
  order_index: number;
  time?: string | null;
  title: string;
  description?: string | null;
  notes?: unknown;
};

export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { tripId } = context.params;
  const { supabase, user } = await requireUser(request);

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id,user_id')
    .eq('id', tripId)
    .maybeSingle();

  if (tripError) {
    throw handleSupabaseError(tripError);
  }

  if (!trip || trip.user_id !== user.id) {
    throw createNotFoundError('Trip');
  }

  const { data: items, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('id,trip_id,destination_slug,day,order_index,time,title,description,notes')
    .eq('trip_id', tripId)
    .order('day', { ascending: true })
    .order('order_index', { ascending: true });

  if (itemsError) {
    throw handleSupabaseError(itemsError);
  }

  return NextResponse.json({ items: items ?? [] });
});

export const PUT = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { tripId } = context.params;
  const { supabase, user } = await requireUser(request);
  const body = await request.json();

  const items: ItemPayload[] = Array.isArray(body?.items) ? body.items : undefined;

  if (!items) {
    throw createValidationError('A list of itinerary items is required.');
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id,user_id')
    .eq('id', tripId)
    .maybeSingle();

  if (tripError) {
    throw handleSupabaseError(tripError);
  }

  if (!trip || trip.user_id !== user.id) {
    throw createNotFoundError('Trip');
  }

  const { error: deleteError } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('trip_id', tripId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  if (items.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const formattedItems = items.map((item) => ({
    trip_id: tripId,
    destination_slug: item.destination_slug ?? null,
    day: item.day,
    order_index: item.order_index,
    time: item.time ?? null,
    title: item.title,
    description: item.description ?? null,
    notes:
      typeof item.notes === 'string'
        ? item.notes
        : item.notes === null || item.notes === undefined
        ? null
        : JSON.stringify(item.notes),
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('itinerary_items')
    .insert(formattedItems)
    .select('id,trip_id,destination_slug,day,order_index,time,title,description,notes');

  if (insertError) {
    throw handleSupabaseError(insertError);
  }

  return NextResponse.json({ items: inserted ?? [] });
});

export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { tripId } = context.params;
  const { supabase, user } = await requireUser(request);
  const body = await request.json();

  const { title, description, destinationSlug, time, notes } = body ?? {};
  let { day, orderIndex } = body ?? {};

  if (!title) {
    throw createValidationError('Title is required to add an itinerary item.');
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id,user_id')
    .eq('id', tripId)
    .maybeSingle();

  if (tripError) {
    throw handleSupabaseError(tripError);
  }

  if (!trip || trip.user_id !== user.id) {
    throw createNotFoundError('Trip');
  }

  if (day === undefined || orderIndex === undefined) {
    const { data: existing, error: existingError } = await supabase
      .from('itinerary_items')
      .select('day,order_index')
      .eq('trip_id', tripId)
      .order('day', { ascending: false })
      .order('order_index', { ascending: false })
      .limit(1);

    if (existingError) {
      throw handleSupabaseError(existingError);
    }

    if (existing && existing.length > 0) {
      day = existing[0].day;
      orderIndex = existing[0].order_index + 1;
    } else {
      day = 1;
      orderIndex = 0;
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('itinerary_items')
    .insert({
      trip_id: tripId,
      destination_slug: destinationSlug ?? null,
      day,
      order_index: orderIndex,
      time: time ?? null,
      title,
      description: description ?? null,
      notes:
        typeof notes === 'string'
          ? notes
          : notes === null || notes === undefined
          ? null
          : JSON.stringify(notes),
    })
    .select('id,trip_id,destination_slug,day,order_index,time,title,description,notes')
    .maybeSingle();

  if (insertError) {
    throw handleSupabaseError(insertError);
  }

  return NextResponse.json({ item: inserted }, { status: 201 });
});
