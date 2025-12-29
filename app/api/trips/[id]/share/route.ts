/**
 * Trip sharing API
 * GET /api/trips/[id]/share - Get sharing settings
 * PUT /api/trips/[id]/share - Update sharing settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { ShareTripInput } from '@/types/features';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;
  const supabase = await createServerClient();

  // Check if user owns the trip or is a collaborator
  const { data: trip } = await supabase
    .from('trips')
    .select('id, user_id, is_public, public_url, share_settings')
    .eq('id', id)
    .single();

  if (!trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
  }

  // Check access
  const isOwner = trip.user_id === user.id;
  if (!isOwner) {
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('role')
      .eq('trip_id', id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!collab) {
      throw new CustomError(ErrorCode.FORBIDDEN, 'Access denied', 403);
    }
  }

  // Get collaborators
  const { data: collaborators } = await supabase
    .from('trip_collaborators')
    .select(`
      id,
      email,
      role,
      status,
      invited_at,
      accepted_at,
      user:user_profiles!user_id(display_name, avatar_url)
    `)
    .eq('trip_id', id);

  const shareUrl = trip.is_public && trip.public_url
    ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'}/trips/shared/${trip.public_url}`
    : null;

  return NextResponse.json({
    is_public: trip.is_public,
    public_url: trip.public_url,
    share_url: shareUrl,
    share_settings: trip.share_settings || { allowComments: true, allowCopy: true },
    collaborators: collaborators || [],
    is_owner: isOwner,
  });
});

export const PUT = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;
  const body: ShareTripInput = await request.json();
  const { is_public, allow_comments, allow_copy } = body;

  const supabase = await createServerClient();

  // Check ownership
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
  }

  if (trip.user_id !== user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'Only the trip owner can change sharing settings', 403);
  }

  // Update sharing settings
  const shareSettings = {
    allowComments: allow_comments ?? true,
    allowCopy: allow_copy ?? true,
  };

  const { data: updatedTrip, error } = await supabase
    .from('trips')
    .update({
      is_public,
      share_settings: shareSettings,
    })
    .eq('id', id)
    .select('id, is_public, public_url, share_settings')
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to update sharing settings', 500);
  }

  const shareUrl = updatedTrip.is_public && updatedTrip.public_url
    ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'}/trips/shared/${updatedTrip.public_url}`
    : null;

  return NextResponse.json({
    is_public: updatedTrip.is_public,
    public_url: updatedTrip.public_url,
    share_url: shareUrl,
    share_settings: updatedTrip.share_settings,
  });
});
