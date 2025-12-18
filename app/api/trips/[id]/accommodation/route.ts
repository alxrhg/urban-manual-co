import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/trips/[id]/accommodation
 * Set the accommodation for a trip
 *
 * This endpoint is specifically designed for AI-native trip planning.
 * It accepts a destination slug and automatically enriches the trip
 * with accommodation details (coordinates, neighborhood, etc.)
 */
export const PUT = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
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
  const {
    destinationSlug,
    // Allow manual entry for hotels not in our database
    manualName,
    manualCoordinates,
    manualNeighborhood,
    checkinTime = '15:00',
    checkoutTime = '11:00'
  } = body;

  let updates: Record<string, any> = {
    accommodation_checkin: checkinTime,
    accommodation_checkout: checkoutTime,
  };

  // If a destination slug is provided, look up the full details
  if (destinationSlug) {
    const { data: destination, error: destError } = await supabase
      .from('destinations')
      .select('id, slug, name, latitude, longitude, neighborhood, city')
      .eq('slug', destinationSlug)
      .single();

    if (destError || !destination) {
      return NextResponse.json({
        error: 'Destination not found',
        message: `No destination found with slug: ${destinationSlug}`
      }, { status: 404 });
    }

    updates = {
      ...updates,
      accommodation_destination_id: destination.id,
      accommodation_slug: destination.slug,
      accommodation_name: destination.name,
      accommodation_neighborhood: destination.neighborhood || destination.city,
      accommodation_coordinates: destination.latitude && destination.longitude
        ? { lat: destination.latitude, lng: destination.longitude }
        : null,
    };
  } else if (manualName) {
    // Manual entry for hotels not in our database
    updates = {
      ...updates,
      accommodation_destination_id: null,
      accommodation_slug: null,
      accommodation_name: manualName,
      accommodation_neighborhood: manualNeighborhood || null,
      accommodation_coordinates: manualCoordinates || null,
    };
  } else {
    return NextResponse.json({
      error: 'Either destinationSlug or manualName is required'
    }, { status: 400 });
  }

  // Update the trip
  const { data: updatedTrip, error: updateError } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  // Revalidate cache
  revalidatePath(`/trips/${tripId}`);

  return NextResponse.json({
    success: true,
    accommodation: {
      destination_id: updatedTrip.accommodation_destination_id,
      slug: updatedTrip.accommodation_slug,
      name: updatedTrip.accommodation_name,
      coordinates: updatedTrip.accommodation_coordinates,
      neighborhood: updatedTrip.accommodation_neighborhood,
      checkin: updatedTrip.accommodation_checkin,
      checkout: updatedTrip.accommodation_checkout,
    }
  });
});

/**
 * DELETE /api/trips/[id]/accommodation
 * Remove accommodation from a trip
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
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

  // Clear accommodation fields
  const { error: updateError } = await supabase
    .from('trips')
    .update({
      accommodation_destination_id: null,
      accommodation_slug: null,
      accommodation_name: null,
      accommodation_coordinates: null,
      accommodation_neighborhood: null,
      accommodation_checkin: null,
      accommodation_checkout: null,
    })
    .eq('id', tripId);

  if (updateError) {
    throw updateError;
  }

  // Revalidate cache
  revalidatePath(`/trips/${tripId}`);

  return NextResponse.json({ success: true });
});

/**
 * GET /api/trips/[id]/accommodation
 * Get accommodation details for a trip
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

  // Get trip with accommodation details
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(`
      accommodation_destination_id,
      accommodation_slug,
      accommodation_name,
      accommodation_coordinates,
      accommodation_neighborhood,
      accommodation_checkin,
      accommodation_checkout
    `)
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  // If there's an accommodation slug, get full destination details
  let destinationDetails = null;
  if (trip.accommodation_slug) {
    const { data: dest } = await supabase
      .from('destinations')
      .select('slug, name, city, neighborhood, category, image, rating, price_level, latitude, longitude')
      .eq('slug', trip.accommodation_slug)
      .single();

    destinationDetails = dest;
  }

  return NextResponse.json({
    accommodation: trip.accommodation_name ? {
      destination_id: trip.accommodation_destination_id,
      slug: trip.accommodation_slug,
      name: trip.accommodation_name,
      coordinates: trip.accommodation_coordinates,
      neighborhood: trip.accommodation_neighborhood,
      checkin: trip.accommodation_checkin,
      checkout: trip.accommodation_checkout,
      destination: destinationDetails,
    } : null
  });
});
