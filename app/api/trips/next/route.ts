import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors/api-handler';

/**
 * GET /api/trips/next
 * Fetch the user's next upcoming trip with itinerary items
 *
 * Returns the next trip that starts on or after today, sorted by start_date.
 * Includes up to 10 itinerary items sorted by day and time.
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Return null trip if not authenticated (don't error - panel just won't show)
  if (authError || !user) {
    return NextResponse.json({ trip: null });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get next upcoming trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(
      `
      id,
      title,
      destination,
      start_date,
      end_date,
      status,
      cover_image
    `
    )
    .eq('user_id', user.id)
    .or(`status.eq.planning,status.eq.upcoming`)
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tripError) {
    console.error('Error fetching next trip:', tripError);
    return NextResponse.json({ trip: null });
  }

  if (!trip) {
    return NextResponse.json({ trip: null });
  }

  // Fetch itinerary items for this trip
  const { data: items, error: itemsError } = await supabase
    .from('itinerary_items')
    .select(
      `
      id,
      day,
      time,
      title,
      destination_slug,
      notes
    `
    )
    .eq('trip_id', trip.id)
    .order('day', { ascending: true })
    .order('order_index', { ascending: true })
    .limit(10);

  if (itemsError) {
    console.error('Error fetching itinerary items:', itemsError);
  }

  // Fetch destination details for items with destination_slug
  const slugs = (items || [])
    .filter((item) => item.destination_slug)
    .map((item) => item.destination_slug);

  let destinationsMap: Record<
    string,
    {
      id: number;
      name: string;
      slug: string;
      hero_image_url: string | null;
      category: string | null;
    }
  > = {};

  if (slugs.length > 0) {
    const { data: destinations } = await supabase
      .from('destinations')
      .select('id, name, slug, hero_image_url, category')
      .in('slug', slugs);

    if (destinations) {
      destinationsMap = destinations.reduce(
        (acc, dest) => {
          acc[dest.slug] = dest;
          return acc;
        },
        {} as typeof destinationsMap
      );
    }
  }

  // Transform items to include destination details
  const transformedItems = (items || []).map((item) => {
    const destination = item.destination_slug
      ? destinationsMap[item.destination_slug]
      : null;

    return {
      id: item.id,
      day_number: item.day,
      scheduled_time: item.time,
      destination: destination
        ? {
            id: destination.id,
            name: destination.name,
            slug: destination.slug,
            hero_image_url: destination.hero_image_url,
            category: destination.category,
          }
        : {
            id: 0,
            name: item.title,
            slug: item.destination_slug || '',
            hero_image_url: null,
            category: null,
          },
    };
  });

  return NextResponse.json({
    trip: {
      id: trip.id,
      name: trip.title,
      start_date: trip.start_date,
      end_date: trip.end_date,
      items: transformedItems,
    },
  });
});
