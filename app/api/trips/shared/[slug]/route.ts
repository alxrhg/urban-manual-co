import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/trips/shared/[slug]
 * Fetch a publicly shared trip by its share slug
 */
export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json({ error: 'Share slug is required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Fetch trip by share_slug with visibility = 'public'
  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_slug', slug)
    .eq('visibility', 'public')
    .single();

  if (error || !trip) {
    return NextResponse.json(
      { error: 'Trip not found or not publicly shared' },
      { status: 404 }
    );
  }

  // Fetch itinerary items
  const { data: items, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', trip.id)
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

  // Fetch trip owner profile for display
  const { data: ownerProfile } = await supabase
    .from('user_profiles')
    .select('username, display_name, avatar_url')
    .eq('user_id', trip.user_id)
    .single();

  return NextResponse.json({
    ...trip,
    items: enrichedItems,
    owner: ownerProfile || null,
    access: {
      isOwner: false,
      role: 'viewer',
      canEdit: false,
      isPublic: true,
    },
  });
});
