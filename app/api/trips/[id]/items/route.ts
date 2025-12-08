import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/items
 * Get all itinerary items for a trip
 */
export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;

  if (!tripId) {
    return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify trip ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  // Fetch items
  const { data: items, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('day', { ascending: true })
    .order('order_index', { ascending: true });

  if (error) {
    throw error;
  }

  return NextResponse.json({ items: items || [] });
});

/**
 * POST /api/trips/[id]/items
 * Add a new item to the trip itinerary
 */
export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;

  if (!tripId) {
    return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify trip ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const body = await request.json();
  const { destination_id, destination_slug, day_number, time, title, notes } = body;

  // Get current max order_index for this day
  const { data: existingItems } = await supabase
    .from('itinerary_items')
    .select('order_index')
    .eq('trip_id', tripId)
    .eq('day', day_number)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrderIndex = existingItems && existingItems.length > 0
    ? existingItems[0].order_index + 1
    : 0;

  // If we have destination_id, look up the slug
  let slug = destination_slug;
  if (destination_id && !slug) {
    const { data: dest } = await supabase
      .from('destinations')
      .select('slug')
      .eq('id', destination_id)
      .single();

    if (dest) {
      slug = dest.slug;
    }
  }

  // Create the item
  const { data: item, error } = await supabase
    .from('itinerary_items')
    .insert({
      trip_id: tripId,
      destination_slug: slug || null,
      day: day_number,
      order_index: nextOrderIndex,
      time: time || null,
      title: title || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating itinerary item:', error);
    throw error;
  }

  // Revalidate the trip page
  revalidatePath(`/trips/${tripId}`);

  return NextResponse.json({ success: true, item });
});

/**
 * DELETE /api/trips/[id]/items
 * Delete an item from the trip itinerary (item id in query params)
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const itemId = request.nextUrl.searchParams.get('itemId');

  if (!tripId || !itemId) {
    return NextResponse.json({ error: 'Trip ID and Item ID are required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify trip ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  // Delete the item
  const { error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('id', itemId)
    .eq('trip_id', tripId);

  if (error) {
    throw error;
  }

  // Revalidate the trip page
  revalidatePath(`/trips/${tripId}`);

  return NextResponse.json({ success: true });
});

/**
 * PATCH /api/trips/[id]/items
 * Update an itinerary item
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;

  if (!tripId) {
    return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify trip ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const body = await request.json();
  const { itemId, updates } = body;

  if (!itemId) {
    return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
  }

  // Build updates object
  const allowedFields = ['day', 'order_index', 'time', 'title', 'notes', 'destination_slug'];
  const safeUpdates: Record<string, any> = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: item, error } = await supabase
    .from('itinerary_items')
    .update(safeUpdates)
    .eq('id', itemId)
    .eq('trip_id', tripId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Revalidate the trip page
  revalidatePath(`/trips/${tripId}`);

  return NextResponse.json({ success: true, item });
});
