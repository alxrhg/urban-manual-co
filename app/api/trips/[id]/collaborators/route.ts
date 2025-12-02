import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  createUnauthorizedError,
  createNotFoundError,
  createValidationError,
  handleSupabaseError,
} from '@/lib/errors';
import type { TripCollaborator } from '@/types/trip';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/collaborators
 * Get all collaborators for a trip
 */
export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Verify user has access to the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

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

  // Get collaborators with user info
  const serviceClient = await createServiceRoleClient();
  const { data: collaborators, error: collabError } = await serviceClient
    .from('trip_collaborators')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (collabError) {
    throw handleSupabaseError(collabError);
  }

  // Get user profiles for collaborators
  const userIds = collaborators?.map(c => c.user_id).filter(Boolean) || [];
  let userProfiles: Record<string, any> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from('user_preferences')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    if (profiles) {
      userProfiles = profiles.reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  // Merge profiles with collaborators
  const enrichedCollaborators = (collaborators || []).map(c => ({
    ...c,
    user: userProfiles[c.user_id] || null,
  }));

  // Get pending invites
  const { data: invites, error: invitesError } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    collaborators: enrichedCollaborators,
    invites: invites || [],
    isOwner,
  });
});

/**
 * POST /api/trips/[id]/collaborators
 * Invite a collaborator to a trip
 */
export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const body = await request.json();
  const { email, role = 'editor' } = body;

  if (!email || !email.trim()) {
    throw createValidationError('Email is required');
  }

  if (!['editor', 'viewer'].includes(role)) {
    throw createValidationError('Role must be editor or viewer');
  }

  // Verify user owns the trip (only owners can invite)
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id, title')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  if (trip.user_id !== user.id) {
    throw createUnauthorizedError('Only trip owners can invite collaborators');
  }

  // Check if user is trying to invite themselves
  const serviceClient = await createServiceRoleClient();
  const { data: currentUserEmail } = await serviceClient.auth.admin.getUserById(user.id);
  if (currentUserEmail?.user?.email?.toLowerCase() === email.toLowerCase()) {
    throw createValidationError('You cannot invite yourself');
  }

  // Check if user with this email exists
  const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
  const invitedUser = existingUsers?.users?.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (invitedUser) {
    // Check if already a collaborator
    const { data: existingCollab } = await supabase
      .from('trip_collaborators')
      .select('id, status')
      .eq('trip_id', tripId)
      .eq('user_id', invitedUser.id)
      .single();

    if (existingCollab) {
      if (existingCollab.status === 'accepted') {
        throw createValidationError('This user is already a collaborator');
      }
      // Update existing invite
      const { data: updatedCollab, error: updateError } = await supabase
        .from('trip_collaborators')
        .update({
          role,
          status: 'pending',
          invited_email: email.toLowerCase(),
        })
        .eq('id', existingCollab.id)
        .select()
        .single();

      if (updateError) {
        throw handleSupabaseError(updateError);
      }

      return NextResponse.json({ collaborator: updatedCollab });
    }

    // Create collaborator record for existing user
    const { data: collaborator, error: collabError } = await supabase
      .from('trip_collaborators')
      .insert({
        trip_id: tripId,
        user_id: invitedUser.id,
        role,
        invited_by: user.id,
        invited_email: email.toLowerCase(),
        status: 'pending',
      })
      .select()
      .single();

    if (collabError) {
      throw handleSupabaseError(collabError);
    }

    // TODO: Send email notification to invited user

    return NextResponse.json({ collaborator }, { status: 201 });
  }

  // User doesn't exist - create an invite token
  const inviteToken = crypto.randomUUID().replace(/-/g, '');

  // Check if invite already exists
  const { data: existingInvite } = await supabase
    .from('trip_invites')
    .select('id')
    .eq('trip_id', tripId)
    .eq('email', email.toLowerCase())
    .single();

  if (existingInvite) {
    // Update existing invite
    const { data: updatedInvite, error: updateError } = await supabase
      .from('trip_invites')
      .update({
        role,
        invite_token: inviteToken,
      })
      .eq('id', existingInvite.id)
      .select()
      .single();

    if (updateError) {
      throw handleSupabaseError(updateError);
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'}/trips/invite/${inviteToken}`;

    return NextResponse.json({
      invite: updatedInvite,
      inviteUrl,
    });
  }

  // Create new invite
  const { data: invite, error: inviteError } = await supabase
    .from('trip_invites')
    .insert({
      trip_id: tripId,
      email: email.toLowerCase(),
      role,
      invite_token: inviteToken,
      invited_by: user.id,
    })
    .select()
    .single();

  if (inviteError) {
    throw handleSupabaseError(inviteError);
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'}/trips/invite/${inviteToken}`;

  // TODO: Send invite email with inviteUrl

  return NextResponse.json({ invite, inviteUrl }, { status: 201 });
});

/**
 * PATCH /api/trips/[id]/collaborators
 * Update a collaborator's role or respond to an invitation
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const body = await request.json();
  const { collaboratorId, action, role } = body;

  if (!collaboratorId) {
    throw createValidationError('Collaborator ID is required');
  }

  // Get the collaboration record
  const { data: collab, error: collabError } = await supabase
    .from('trip_collaborators')
    .select('*, trips!inner(user_id)')
    .eq('id', collaboratorId)
    .eq('trip_id', tripId)
    .single();

  if (collabError || !collab) {
    throw createNotFoundError('Collaborator');
  }

  const isOwner = collab.trips.user_id === user.id;
  const isSelf = collab.user_id === user.id;

  // Handle accept/decline actions (only by the invited user)
  if (action === 'accept' || action === 'decline') {
    if (!isSelf) {
      throw createUnauthorizedError('Only the invited user can accept or decline');
    }

    const { data: updated, error: updateError } = await supabase
      .from('trip_collaborators')
      .update({
        status: action === 'accept' ? 'accepted' : 'declined',
        accepted_at: action === 'accept' ? new Date().toISOString() : null,
      })
      .eq('id', collaboratorId)
      .select()
      .single();

    if (updateError) {
      throw handleSupabaseError(updateError);
    }

    return NextResponse.json({ collaborator: updated });
  }

  // Handle role change (only by owner)
  if (role) {
    if (!isOwner) {
      throw createUnauthorizedError('Only trip owners can change roles');
    }

    if (!['editor', 'viewer'].includes(role)) {
      throw createValidationError('Role must be editor or viewer');
    }

    const { data: updated, error: updateError } = await supabase
      .from('trip_collaborators')
      .update({ role })
      .eq('id', collaboratorId)
      .select()
      .single();

    if (updateError) {
      throw handleSupabaseError(updateError);
    }

    return NextResponse.json({ collaborator: updated });
  }

  throw createValidationError('No valid action or role provided');
});

/**
 * DELETE /api/trips/[id]/collaborators
 * Remove a collaborator or cancel an invite
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const { searchParams } = new URL(request.url);
  const collaboratorId = searchParams.get('collaboratorId');
  const inviteId = searchParams.get('inviteId');

  if (!collaboratorId && !inviteId) {
    throw createValidationError('Collaborator ID or Invite ID is required');
  }

  // Verify trip ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  const isOwner = trip.user_id === user.id;

  if (collaboratorId) {
    // Get collaborator to check permissions
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('id, user_id')
      .eq('id', collaboratorId)
      .eq('trip_id', tripId)
      .single();

    if (!collab) {
      throw createNotFoundError('Collaborator');
    }

    // Allow owner to remove anyone, or allow user to remove themselves
    if (!isOwner && collab.user_id !== user.id) {
      throw createUnauthorizedError('You can only remove yourself from this trip');
    }

    const { error: deleteError } = await supabase
      .from('trip_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (deleteError) {
      throw handleSupabaseError(deleteError);
    }
  }

  if (inviteId) {
    // Only owner can cancel invites
    if (!isOwner) {
      throw createUnauthorizedError('Only trip owners can cancel invites');
    }

    const { error: deleteError } = await supabase
      .from('trip_invites')
      .delete()
      .eq('id', inviteId)
      .eq('trip_id', tripId);

    if (deleteError) {
      throw handleSupabaseError(deleteError);
    }
  }

  return NextResponse.json({ success: true });
});
