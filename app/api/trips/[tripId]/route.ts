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

export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { tripId } = context.params;
  const { supabase, user } = await requireUser(request);

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id,title,description,destination,start_date,end_date,status,updated_at,budget,user_id')
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

  const { user_id, ...tripData } = trip;

  return NextResponse.json({ trip: tripData, items: items ?? [] });
});

export const PUT = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { tripId } = context.params;
  const { supabase, user } = await requireUser(request);
  const body = await request.json();

  const {
    title,
    destination,
    startDate,
    endDate,
    description,
    status,
    budget,
  } = body;

  if (!title || !destination || !startDate || !endDate) {
    throw createValidationError('Trip title, destination, start date, and end date are required.');
  }

  const { error: updateError, data } = await supabase
    .from('trips')
    .update({
      title: title.trim(),
      destination: destination.trim(),
      start_date: startDate,
      end_date: endDate,
      description: description ?? null,
      status: status ?? 'planning',
      budget: typeof budget === 'number' ? budget : null,
    })
    .eq('id', tripId)
    .eq('user_id', user.id)
    .select('id,title,description,destination,start_date,end_date,status,updated_at,budget')
    .maybeSingle();

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  if (!data) {
    throw createNotFoundError('Trip');
  }

  return NextResponse.json({ trip: data });
});

export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { tripId } = context.params;
  const { supabase, user } = await requireUser(request);

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (tripError) {
    throw handleSupabaseError(tripError);
  }

  if (!trip) {
    throw createNotFoundError('Trip');
  }

  const { error: deleteItemsError } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('trip_id', tripId);

  if (deleteItemsError) {
    throw handleSupabaseError(deleteItemsError);
  }

  const { error: deleteTripError } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
    .eq('user_id', user.id);

  if (deleteTripError) {
    throw handleSupabaseError(deleteTripError);
  }

  return NextResponse.json({ success: true });
});
