import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  createSuccessResponse,
  createValidationError,
  createUnauthorizedError,
  createNotFoundError,
} from '@/lib/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Generate a random share slug
 */
function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if sharing columns exist in trips table
 */
async function checkSharingColumnsExist(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trips')
      .select('visibility')
      .limit(1);

    if (error && error.message?.includes('does not exist')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/trips/[id]/share
 * Get current sharing status for a trip
 */
export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;

  if (!tripId) {
    throw createValidationError('Trip ID is required');
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Check if sharing columns exist
  const columnsExist = await checkSharingColumnsExist(supabase);

  // Build select query based on what columns exist
  const selectColumns = columnsExist
    ? 'id, user_id, visibility, share_slug, shared_at'
    : 'id, user_id';

  // Check if user owns the trip or is a collaborator
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(selectColumns)
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    // If error is about missing column, try without those columns
    if (tripError?.message?.includes('does not exist')) {
      const { data: basicTrip, error: basicError } = await supabase
        .from('trips')
        .select('id, user_id')
        .eq('id', tripId)
        .single();

      if (basicError || !basicTrip) {
        throw createNotFoundError('Trip');
      }

      const isOwner = basicTrip.user_id === user.id;
      if (!isOwner) {
        throw createNotFoundError('Trip');
      }

      return createSuccessResponse({
        tripId,
        visibility: 'private',
        shareSlug: null,
        sharedAt: null,
        collaboratorCount: 0,
        isOwner,
        migrationRequired: true,
      });
    }
    throw createNotFoundError('Trip');
  }

  const isOwner = trip.user_id === user.id;

  if (!isOwner) {
    throw createNotFoundError('Trip');
  }

  // Return defaults if columns don't exist
  if (!columnsExist) {
    return createSuccessResponse({
      tripId,
      visibility: 'private',
      shareSlug: null,
      sharedAt: null,
      collaboratorCount: 0,
      isOwner,
      migrationRequired: true,
    });
  }

  // Count collaborators (only if table exists)
  let collaboratorCount = 0;
  try {
    const { count } = await supabase
      .from('trip_collaborators')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .eq('status', 'accepted');
    collaboratorCount = count || 0;
  } catch {
    // Table doesn't exist, that's okay
  }

  return createSuccessResponse({
    tripId,
    visibility: trip.visibility || 'private',
    shareSlug: trip.share_slug || null,
    sharedAt: trip.shared_at || null,
    collaboratorCount,
    isOwner,
  });
});

/**
 * POST /api/trips/[id]/share
 * Generate a public share link for a trip
 */
export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;

  if (!tripId) {
    throw createValidationError('Trip ID is required');
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Check if user owns the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id, share_slug')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  // Generate a new share slug if one doesn't exist
  let shareSlug = trip.share_slug;
  if (!shareSlug) {
    // Generate unique slug with retry
    let attempts = 0;
    while (attempts < 5) {
      const slug = generateShareSlug();
      const { data: existing } = await supabase
        .from('trips')
        .select('id')
        .eq('share_slug', slug)
        .single();

      if (!existing) {
        shareSlug = slug;
        break;
      }
      attempts++;
    }

    if (!shareSlug) {
      throw new Error('Failed to generate unique share slug');
    }
  }

  // Update the trip with the share slug and make it public
  const { data: updatedTrip, error: updateError } = await supabase
    .from('trips')
    .update({
      share_slug: shareSlug,
      visibility: 'public',
      shared_at: new Date().toISOString(),
    })
    .eq('id', tripId)
    .select('id, visibility, share_slug, shared_at')
    .single();

  if (updateError) throw updateError;

  return createSuccessResponse({
    trip: updatedTrip,
    shareUrl: `/trips/shared/${shareSlug}`,
    message: 'Share link created',
  });
});

/**
 * DELETE /api/trips/[id]/share
 * Revoke public share link
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;

  if (!tripId) {
    throw createValidationError('Trip ID is required');
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Check if user owns the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  // Check if there are still collaborators
  const { count: collaboratorCount } = await supabase
    .from('trip_collaborators')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId)
    .eq('status', 'accepted');

  // Revoke the share link
  const { error: updateError } = await supabase
    .from('trips')
    .update({
      share_slug: null,
      visibility: (collaboratorCount || 0) > 0 ? 'shared' : 'private',
    })
    .eq('id', tripId);

  if (updateError) throw updateError;

  return createSuccessResponse({
    message: 'Share link revoked',
  });
});

/**
 * PATCH /api/trips/[id]/share
 * Update sharing visibility settings
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;

  if (!tripId) {
    throw createValidationError('Trip ID is required');
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Parse request body
  const body = await request.json();
  const { visibility } = body;

  if (!visibility || !['private', 'shared', 'public'].includes(visibility)) {
    throw createValidationError('Visibility must be "private", "shared", or "public"');
  }

  // Check if user owns the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  // Update visibility
  const updates: Record<string, any> = { visibility };

  // If setting to private, clear share_slug
  if (visibility === 'private') {
    updates.share_slug = null;
    updates.shared_at = null;
  } else if (!trip) {
    updates.shared_at = new Date().toISOString();
  }

  const { data: updatedTrip, error: updateError } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .select('id, visibility, share_slug, shared_at')
    .single();

  if (updateError) throw updateError;

  return createSuccessResponse({
    trip: updatedTrip,
    message: `Trip visibility set to ${visibility}`,
  });
});
