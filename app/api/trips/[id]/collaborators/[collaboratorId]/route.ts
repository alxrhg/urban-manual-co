import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  createSuccessResponse,
  createValidationError,
  createUnauthorizedError,
  createNotFoundError,
} from '@/lib/errors';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ id: string; collaboratorId: string }>;
}

/**
 * PATCH /api/trips/[id]/collaborators/[collaboratorId]
 * Update a collaborator's role
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId, collaboratorId } = await context.params;

  if (!tripId || !collaboratorId) {
    throw createValidationError('Trip ID and Collaborator ID are required');
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

  // Parse request body
  const body = await request.json();
  const { role } = body;

  if (!role || !['editor', 'viewer'].includes(role)) {
    throw createValidationError('Role must be "editor" or "viewer"');
  }

  // Update the collaborator's role
  const { data: collaborator, error: updateError } = await supabase
    .from('trip_collaborators')
    .update({ role })
    .eq('id', collaboratorId)
    .eq('trip_id', tripId)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      throw createNotFoundError('Collaborator');
    }
    throw updateError;
  }

  return createSuccessResponse({
    collaborator,
    message: 'Role updated successfully',
  });
});

/**
 * DELETE /api/trips/[id]/collaborators/[collaboratorId]
 * Remove a collaborator from a trip
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId, collaboratorId } = await context.params;

  if (!tripId || !collaboratorId) {
    throw createValidationError('Trip ID and Collaborator ID are required');
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Fetch the collaborator to check ownership
  const { data: collaborator, error: collabError } = await supabase
    .from('trip_collaborators')
    .select('id, trip_id, user_id, email')
    .eq('id', collaboratorId)
    .eq('trip_id', tripId)
    .single();

  if (collabError || !collaborator) {
    throw createNotFoundError('Collaborator');
  }

  // Check if user owns the trip
  const { data: trip } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .single();

  const isOwner = trip?.user_id === user.id;
  const isSelf = collaborator.user_id === user.id;

  // Allow deletion if user is the trip owner OR removing themselves
  if (!isOwner && !isSelf) {
    throw new CustomError(
      ErrorCode.FORBIDDEN,
      'You do not have permission to remove this collaborator',
      403
    );
  }

  // Delete the collaborator
  const { error: deleteError } = await supabase
    .from('trip_collaborators')
    .delete()
    .eq('id', collaboratorId);

  if (deleteError) throw deleteError;

  // Check if there are any remaining collaborators
  const { count } = await supabase
    .from('trip_collaborators')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  // If no more collaborators, revert visibility to private
  if (count === 0) {
    await supabase
      .from('trips')
      .update({
        visibility: 'private',
        shared_at: null,
      })
      .eq('id', tripId)
      .eq('visibility', 'shared');
  }

  return createSuccessResponse({
    message: isSelf ? 'You have left the trip' : 'Collaborator removed successfully',
  });
});
