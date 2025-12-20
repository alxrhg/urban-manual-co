import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';
import type { UpdateTrip } from '@/types/trip';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]
 * Fetch a single trip by ID with its itinerary items
 * Supports access for trip owners and collaborators
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

  // Fetch trip - first try as owner
  let trip;
  let error;
  let isOwner = false;
  let collaboratorRole: string | null = null;

  const { data: ownedTrip, error: ownedError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (ownedTrip) {
    trip = ownedTrip;
    isOwner = true;
  } else {
    // Check if user is a collaborator
    const { data: collab, error: collabError } = await supabase
      .from('trip_collaborators')
      .select('role, status')
      .eq('trip_id', id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (collab) {
      // Fetch trip as collaborator
      const { data: sharedTrip, error: sharedError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();

      if (sharedTrip) {
        trip = sharedTrip;
        collaboratorRole = collab.role;
      } else {
        error = sharedError;
      }
    } else {
      error = ownedError;
    }
  }

  if (error || !trip) {
    if (error?.code === 'PGRST116' || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    throw error;
  }

  // Fetch itinerary items
  const { data: items, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', id)
    .order('day', { ascending: true })
    .order('order_index', { ascending: true });

  if (itemsError) {
    console.error('Error fetching itinerary items:', itemsError);
  }

  // Fetch destination details for items with slugs
  const slugs = (items || [])
    .map((item) => item.destination_slug)
    .filter((s): s is string => Boolean(s));

  let destinations: Record<string, any> = {};
  if (slugs.length > 0) {
    const { data: destData } = await supabase
      .from('destinations')
      .select('slug, name, city, neighborhood, category, description, image, image_thumbnail, latitude, longitude, rating, price_level')
      .in('slug', slugs);

    if (destData) {
      destinations = destData.reduce((acc, d) => {
        acc[d.slug] = d;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  // Enrich items with destination data
  const enrichedItems = (items || []).map((item) => ({
    ...item,
    destination: item.destination_slug ? destinations[item.destination_slug] : null,
  }));

  return NextResponse.json({
    ...trip,
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    items: enrichedItems,
    updated_at: trip.updated_at,
    // Access info for UI
    access: {
      isOwner,
      role: isOwner ? 'owner' : collaboratorRole,
      canEdit: isOwner || collaboratorRole === 'editor',
    },
  });
});

/**
 * PATCH /api/trips/[id]
 * Update a trip and revalidate cache
 * Supports updates by trip owners and editors
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

  // Check if user is owner or editor
  const { data: ownedTrip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  const isOwner = !!ownedTrip;

  if (!isOwner) {
    // Check if user is an editor
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('role')
      .eq('trip_id', id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .in('role', ['owner', 'editor'])
      .single();

    if (!collab) {
      return NextResponse.json({ error: 'Trip not found or no edit access' }, { status: 404 });
    }
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

  // Update trip in database (owner check removed since we verified access above)
  const { data: trip, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
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

  return NextResponse.json({ success: true });
});
