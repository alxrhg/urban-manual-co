import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';

/**
 * GET /api/trips
 * Fetch all trips for the authenticated user (owned and shared)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status'); // 'planning', 'upcoming', 'completed'
  const filter = searchParams.get('filter'); // 'owned', 'shared', 'all' (default)
  const limit = parseInt(searchParams.get('limit') || '50');

  // Fetch owned trips
  let ownedTrips: any[] = [];
  if (filter !== 'shared') {
    let query = supabase
      .from('trips')
      .select(`
        id,
        title,
        destination,
        start_date,
        end_date,
        status,
        cover_image,
        visibility,
        created_at,
        updated_at,
        user_id
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    ownedTrips = (data || []).map(t => ({ ...t, access: { isOwner: true, role: 'owner', canEdit: true } }));
  }

  // Fetch shared trips (where user is a collaborator)
  let sharedTrips: any[] = [];
  if (filter !== 'owned') {
    // First get the collaboration entries
    const { data: collabs } = await supabase
      .from('trip_collaborators')
      .select('trip_id, role')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (collabs && collabs.length > 0) {
      const sharedTripIds = collabs.map(c => c.trip_id);
      const roleMap = new Map(collabs.map(c => [c.trip_id, c.role]));

      let query = supabase
        .from('trips')
        .select(`
          id,
          title,
          destination,
          start_date,
          end_date,
          status,
          cover_image,
          visibility,
          created_at,
          updated_at,
          user_id
        `)
        .in('id', sharedTripIds)
        .order('updated_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      sharedTrips = (data || []).map(t => ({
        ...t,
        access: {
          isOwner: false,
          role: roleMap.get(t.id),
          canEdit: roleMap.get(t.id) === 'editor',
        },
      }));
    }
  }

  // Merge and sort by updated_at
  const allTrips = [...ownedTrips, ...sharedTrips]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);

  // Also fetch itinerary item counts for each trip
  const tripIds = allTrips.map(t => t.id);
  const { data: itemCounts } = await supabase
    .from('itinerary_items')
    .select('trip_id')
    .in('trip_id', tripIds);

  const countMap = new Map<string, number>();
  itemCounts?.forEach(item => {
    countMap.set(item.trip_id, (countMap.get(item.trip_id) || 0) + 1);
  });

  // Fetch collaborator counts for each trip
  const { data: collabCounts } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .in('trip_id', tripIds)
    .eq('status', 'accepted');

  const collabCountMap = new Map<string, number>();
  collabCounts?.forEach(collab => {
    collabCountMap.set(collab.trip_id, (collabCountMap.get(collab.trip_id) || 0) + 1);
  });

  const tripsWithCounts = allTrips.map(trip => ({
    ...trip,
    itemCount: countMap.get(trip.id) || 0,
    collaboratorCount: collabCountMap.get(trip.id) || 0,
  }));

  return NextResponse.json({ trips: tripsWithCounts });
});

/**
 * POST /api/trips
 * Create a new trip
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, destination, start_date, end_date, items } = body;

  if (!title || !destination) {
    return NextResponse.json(
      { error: 'Title and destination are required' },
      { status: 400 }
    );
  }

  // Create the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      title,
      destination,
      start_date,
      end_date,
      status: 'planning',
    })
    .select()
    .single();

  if (tripError) {
    throw tripError;
  }

  // Create itinerary items if provided
  if (items && items.length > 0) {
    const itineraryItems = items.map((item: {
      destination_slug: string;
      day: number;
      order_index: number;
      time?: string;
      title: string;
      notes?: string;
    }) => ({
      trip_id: trip.id,
      destination_slug: item.destination_slug,
      day: item.day,
      order_index: item.order_index,
      time: item.time,
      title: item.title,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('itinerary_items')
      .insert(itineraryItems);

    if (itemsError) {
      console.error('Error creating itinerary items:', itemsError);
      // Don't fail the whole request, trip was created
    }
  }

  return NextResponse.json({ id: trip.id, trip });
});
