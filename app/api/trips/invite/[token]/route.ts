import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  createUnauthorizedError,
  createNotFoundError,
  createValidationError,
  handleSupabaseError,
} from '@/lib/errors';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/trips/invite/[token]
 * Get invite details (for showing the accept/decline UI)
 */
export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { token } = await context.params;
  const serviceClient = await createServiceRoleClient();

  // Find the invite
  const { data: invite, error: inviteError } = await serviceClient
    .from('trip_invites')
    .select('*')
    .eq('invite_token', token)
    .single();

  if (inviteError || !invite) {
    throw createNotFoundError('Invite');
  }

  // Get the trip details
  const { data: trip, error: tripError } = await serviceClient
    .from('trips')
    .select('id, title, destination, cover_image, user_id')
    .eq('id', invite.trip_id)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  // Get inviter info
  const { data: inviterProfile } = await serviceClient
    .from('user_preferences')
    .select('display_name, avatar_url')
    .eq('user_id', invite.invited_by)
    .single();

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      created_at: invite.created_at,
    },
    trip: {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      cover_image: trip.cover_image,
    },
    inviter: inviterProfile || null,
  });
});

/**
 * POST /api/trips/invite/[token]
 * Accept an invite (requires authentication)
 */
export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { token } = await context.params;
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError('You must be logged in to accept an invite');
  }

  const serviceClient = await createServiceRoleClient();

  // Find the invite
  const { data: invite, error: inviteError } = await serviceClient
    .from('trip_invites')
    .select('*')
    .eq('invite_token', token)
    .single();

  if (inviteError || !invite) {
    throw createNotFoundError('Invite');
  }

  // Verify email matches (optional - could allow any authenticated user)
  const { data: userData } = await serviceClient.auth.admin.getUserById(user.id);
  const userEmail = userData?.user?.email?.toLowerCase();

  if (userEmail && invite.email.toLowerCase() !== userEmail) {
    throw createValidationError(
      `This invite was sent to ${invite.email}. You are logged in as ${userEmail}.`
    );
  }

  // Check if user is already a collaborator
  const { data: existingCollab } = await supabase
    .from('trip_collaborators')
    .select('id, status')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', user.id)
    .single();

  if (existingCollab) {
    if (existingCollab.status === 'accepted') {
      // Already accepted - delete invite and return
      await serviceClient
        .from('trip_invites')
        .delete()
        .eq('id', invite.id);

      return NextResponse.json({
        message: 'You are already a collaborator on this trip',
        tripId: invite.trip_id,
      });
    }

    // Update existing record
    const { data: updatedCollab, error: updateError } = await supabase
      .from('trip_collaborators')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        role: invite.role,
      })
      .eq('id', existingCollab.id)
      .select()
      .single();

    if (updateError) {
      throw handleSupabaseError(updateError);
    }

    // Delete the invite
    await serviceClient
      .from('trip_invites')
      .delete()
      .eq('id', invite.id);

    return NextResponse.json({
      collaborator: updatedCollab,
      tripId: invite.trip_id,
    });
  }

  // Create new collaborator record
  const { data: collaborator, error: collabError } = await supabase
    .from('trip_collaborators')
    .insert({
      trip_id: invite.trip_id,
      user_id: user.id,
      role: invite.role,
      invited_by: invite.invited_by,
      invited_email: invite.email,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (collabError) {
    throw handleSupabaseError(collabError);
  }

  // Delete the invite
  await serviceClient
    .from('trip_invites')
    .delete()
    .eq('id', invite.id);

  return NextResponse.json({
    collaborator,
    tripId: invite.trip_id,
  }, { status: 201 });
});

/**
 * DELETE /api/trips/invite/[token]
 * Decline an invite
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { token } = await context.params;
  const serviceClient = await createServiceRoleClient();

  // Find and delete the invite
  const { data: invite, error: inviteError } = await serviceClient
    .from('trip_invites')
    .select('id')
    .eq('invite_token', token)
    .single();

  if (inviteError || !invite) {
    throw createNotFoundError('Invite');
  }

  const { error: deleteError } = await serviceClient
    .from('trip_invites')
    .delete()
    .eq('id', invite.id);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  return NextResponse.json({ success: true });
});
