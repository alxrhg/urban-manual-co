/**
 * Public trip view API
 * GET /api/trips/shared/[publicUrl] - Get public trip details
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ publicUrl: string }>;
}

export const GET = withOptionalAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { publicUrl } = await context.params;
  const supabase = await createServerClient();

  // Find trip by public URL
  const { data: trip, error } = await supabase
    .from('trips')
    .select(`
      id,
      title,
      description,
      destination,
      start_date,
      end_date,
      cover_image,
      share_settings,
      user_id,
      created_at,
      owner:user_profiles!user_id(id, display_name, username, avatar_url)
    `)
    .eq('public_url', publicUrl)
    .eq('is_public', true)
    .single();

  if (error || !trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found or not public', 404);
  }

  // Get itinerary items
  const { data: items } = await supabase
    .from('itinerary_items')
    .select(`
      id,
      day,
      order_index,
      time,
      title,
      description,
      notes,
      destination_slug,
      destination:destinations!destination_slug(
        slug,
        name,
        city,
        category,
        image,
        latitude,
        longitude,
        rating
      )
    `)
    .eq('trip_id', trip.id)
    .order('day')
    .order('order_index');

  // Group items by day
  const days: Record<number, typeof items> = {};
  items?.forEach((item) => {
    if (!days[item.day]) {
      days[item.day] = [];
    }
    days[item.day].push(item);
  });

  // Check if current user can copy
  const canCopy = trip.share_settings?.allowCopy !== false;
  const canComment = trip.share_settings?.allowComments !== false;
  const isOwner = user?.id === trip.user_id;

  return NextResponse.json({
    trip: {
      ...trip,
      days,
      item_count: items?.length || 0,
    },
    permissions: {
      can_copy: canCopy,
      can_comment: canComment,
      is_owner: isOwner,
    },
  });
});
