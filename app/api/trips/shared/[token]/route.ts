import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  createNotFoundError,
  handleSupabaseError,
} from '@/lib/errors';
import type { Trip, ItineraryItem, TripAccess } from '@/types/trip';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/trips/shared/[token]
 * Access a trip via share link (view-only, no auth required)
 */
export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { token } = await context.params;
  const serviceClient = await createServiceRoleClient();

  // Find the share link
  const { data: share, error: shareError } = await serviceClient
    .from('trip_shares')
    .select('*')
    .eq('share_token', token)
    .single();

  if (shareError || !share) {
    throw createNotFoundError('Share link');
  }

  // Get the trip
  const { data: trip, error: tripError } = await serviceClient
    .from('trips')
    .select('*')
    .eq('id', share.trip_id)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  // Get itinerary items
  const { data: items, error: itemsError } = await serviceClient
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', share.trip_id)
    .order('day', { ascending: true })
    .order('order_index', { ascending: true });

  if (itemsError) {
    throw handleSupabaseError(itemsError);
  }

  // Get destination details for items with slugs
  const slugs = (items || [])
    .map((item: ItineraryItem) => item.destination_slug)
    .filter((slug: string | null): slug is string => !!slug);

  interface DestinationInfo {
    slug: string;
    name: string;
    city: string;
    category: string;
    image: string | null;
    latitude: number | null;
    longitude: number | null;
  }

  let destinations: Record<string, DestinationInfo> = {};
  if (slugs.length > 0) {
    const { data: dests } = await serviceClient
      .from('destinations')
      .select('slug, name, city, category, image, latitude, longitude')
      .in('slug', slugs);

    if (dests) {
      destinations = dests.reduce((acc: Record<string, DestinationInfo>, d: DestinationInfo) => {
        acc[d.slug] = d;
        return acc;
      }, {} as Record<string, DestinationInfo>);
    }
  }

  // Enrich items with destination data
  const enrichedItems = (items || []).map((item: ItineraryItem) => ({
    ...item,
    destination: item.destination_slug ? destinations[item.destination_slug] || null : null,
  }));

  // Get owner info (for display)
  const { data: ownerProfile } = await serviceClient
    .from('user_preferences')
    .select('display_name, avatar_url')
    .eq('user_id', trip.user_id)
    .single();

  // Check if current user (if logged in) has any access
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let access: TripAccess = {
    canView: true,
    canEdit: false,
    accessType: 'share_link',
  };

  if (user) {
    if (trip.user_id === user.id) {
      access = {
        canView: true,
        canEdit: true,
        accessType: 'owner',
        role: 'owner',
      };
    } else {
      // Check for collaborator access
      const { data: collab } = await supabase
        .from('trip_collaborators')
        .select('role')
        .eq('trip_id', share.trip_id)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (collab) {
        access = {
          canView: true,
          canEdit: collab.role === 'editor',
          accessType: 'collaborator',
          role: collab.role,
        };
      }
    }
  }

  return NextResponse.json({
    trip,
    items: enrichedItems,
    owner: ownerProfile || null,
    access,
  });
});
