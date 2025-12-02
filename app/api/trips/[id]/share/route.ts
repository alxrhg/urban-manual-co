import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  createUnauthorizedError,
  createNotFoundError,
  handleSupabaseError,
} from '@/lib/errors';
import type { TripShare } from '@/types/trip';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/share
 * Get the share link for a trip (if it exists)
 */
export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Verify user owns or collaborates on the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  // Check if user is owner or collaborator
  const isOwner = trip.user_id === user.id;
  if (!isOwner) {
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!collab) {
      throw createUnauthorizedError('You do not have access to this trip');
    }
  }

  // Get share link
  const { data: share, error: shareError } = await supabase
    .from('trip_shares')
    .select('*')
    .eq('trip_id', tripId)
    .single();

  if (shareError && shareError.code !== 'PGRST116') {
    throw handleSupabaseError(shareError);
  }

  const shareUrl = share
    ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'}/trips/shared/${share.share_token}`
    : null;

  return NextResponse.json({
    share: share || null,
    shareUrl,
  });
});

/**
 * POST /api/trips/[id]/share
 * Create a share link for a trip
 */
export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Verify user owns the trip (only owners can create share links)
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  if (trip.user_id !== user.id) {
    throw createUnauthorizedError('Only trip owners can create share links');
  }

  // Check if share link already exists
  const { data: existingShare } = await supabase
    .from('trip_shares')
    .select('*')
    .eq('trip_id', tripId)
    .single();

  if (existingShare) {
    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'}/trips/shared/${existingShare.share_token}`;
    return NextResponse.json({ share: existingShare, shareUrl });
  }

  // Generate share token
  const { data: tokenData } = await supabase.rpc('generate_share_token');
  const shareToken = tokenData || crypto.randomUUID().replace(/-/g, '');

  // Create share link
  const { data: share, error: shareError } = await supabase
    .from('trip_shares')
    .insert({
      trip_id: tripId,
      share_token: shareToken,
      created_by: user.id,
      access_level: 'view',
    })
    .select()
    .single();

  if (shareError) {
    throw handleSupabaseError(shareError);
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'}/trips/shared/${share.share_token}`;

  return NextResponse.json({ share, shareUrl }, { status: 201 });
});

/**
 * DELETE /api/trips/[id]/share
 * Delete the share link for a trip
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Verify user owns the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  if (trip.user_id !== user.id) {
    throw createUnauthorizedError('Only trip owners can delete share links');
  }

  // Delete share link
  const { error: deleteError } = await supabase
    .from('trip_shares')
    .delete()
    .eq('trip_id', tripId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  return NextResponse.json({ success: true });
});
