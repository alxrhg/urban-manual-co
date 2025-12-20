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
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/trips/invitations/[id]
 * Accept or decline a trip invitation
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: invitationId } = await context.params;

  if (!invitationId) {
    throw createValidationError('Invitation ID is required');
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Parse request body
  const body = await request.json();
  const { action } = body;

  if (!action || !['accept', 'decline'].includes(action)) {
    throw createValidationError('Action must be "accept" or "decline"');
  }

  // Fetch the invitation
  const { data: invitation, error: invError } = await supabase
    .from('trip_collaborators')
    .select('id, trip_id, email, user_id, status')
    .eq('id', invitationId)
    .single();

  if (invError || !invitation) {
    throw createNotFoundError('Invitation');
  }

  // Check if the invitation belongs to the current user
  const isForUser = invitation.user_id === user.id ||
    invitation.email.toLowerCase() === user.email?.toLowerCase();

  if (!isForUser) {
    throw new CustomError(
      ErrorCode.FORBIDDEN,
      'This invitation is not for you',
      403
    );
  }

  if (invitation.status !== 'pending') {
    throw createValidationError('This invitation has already been processed');
  }

  if (action === 'accept') {
    // Accept the invitation
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('trip_collaborators')
      .update({
        status: 'accepted',
        user_id: user.id, // Link to user if not already
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Fetch the trip details
    const { data: trip } = await supabase
      .from('trips')
      .select('id, title, destination, start_date, end_date')
      .eq('id', invitation.trip_id)
      .single();

    return createSuccessResponse({
      invitation: updatedInvitation,
      trip,
      message: 'You have joined the trip',
    });
  } else {
    // Decline the invitation
    const { error: updateError } = await supabase
      .from('trip_collaborators')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (updateError) throw updateError;

    return createSuccessResponse({
      message: 'Invitation declined',
    });
  }
});

/**
 * DELETE /api/trips/invitations/[id]
 * Delete/dismiss a declined invitation
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: invitationId } = await context.params;

  if (!invitationId) {
    throw createValidationError('Invitation ID is required');
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Fetch the invitation to verify ownership
  const { data: invitation, error: invError } = await supabase
    .from('trip_collaborators')
    .select('id, email, user_id')
    .eq('id', invitationId)
    .single();

  if (invError || !invitation) {
    throw createNotFoundError('Invitation');
  }

  // Check if the invitation belongs to the current user
  const isForUser = invitation.user_id === user.id ||
    invitation.email.toLowerCase() === user.email?.toLowerCase();

  if (!isForUser) {
    throw new CustomError(
      ErrorCode.FORBIDDEN,
      'This invitation is not for you',
      403
    );
  }

  // Delete the invitation
  const { error: deleteError } = await supabase
    .from('trip_collaborators')
    .delete()
    .eq('id', invitationId);

  if (deleteError) throw deleteError;

  return createSuccessResponse({
    message: 'Invitation removed',
  });
});
