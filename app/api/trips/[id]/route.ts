import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';
import type { UpdateTrip } from '@/types/trip';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]
 * Fetch a single trip by ID
 */
export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ trip });
});

/**
 * PATCH /api/trips/[id]
 * Update a trip and revalidate cache
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate request body
  const body = await request.json();
  const updates: UpdateTrip = {};

  // Only include allowed fields
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.destination !== undefined) updates.destination = body.destination;
  if (body.start_date !== undefined) updates.start_date = body.start_date;
  if (body.end_date !== undefined) updates.end_date = body.end_date;
  if (body.status !== undefined) updates.status = body.status;
  if (body.is_public !== undefined) updates.is_public = body.is_public;
  if (body.cover_image !== undefined) updates.cover_image = body.cover_image;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Update trip in database
  const { data: trip, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    throw error;
  }

  // Instantly refresh cache with on-demand revalidation
  revalidatePath(`/trips/${id}`);
  revalidatePath('/trips');
  revalidateTag('trips-list');

  return NextResponse.json({ success: true, trip });
});

/**
 * DELETE /api/trips/[id]
 * Delete a trip and revalidate cache
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delete associated itinerary items first
  await supabase
    .from('itinerary_items')
    .delete()
    .eq('trip_id', id);

  // Delete the trip
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }

  // Instantly refresh cache
  revalidatePath(`/trips/${id}`);
  revalidatePath('/trips');
  revalidateTag('trips-list');

  return NextResponse.json({ success: true });
});
