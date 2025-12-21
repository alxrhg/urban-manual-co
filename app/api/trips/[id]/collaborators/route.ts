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
 * Check if the trip_collaborators table exists
 */
async function checkCollaboratorsTableExists(supabase: any): Promise<boolean> {
  try {
    // Try a simple query - if table doesn't exist, it will throw
    const { error } = await supabase
      .from('trip_collaborators')
      .select('id')
      .limit(1);

    // Check for table not found error
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/trips/[id]/collaborators
 * List all collaborators for a trip
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

  // Check if user has access to this trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  // Check access: owner or accepted collaborator
  const isOwner = trip.user_id === user.id;

  if (!isOwner) {
    throw createNotFoundError('Trip');
  }

  // Check if collaborators table exists
  const tableExists = await checkCollaboratorsTableExists(supabase);

  if (!tableExists) {
    // Return empty collaborators if table doesn't exist yet
    return createSuccessResponse({
      collaborators: [],
      isOwner,
      tripId,
      migrationRequired: true,
    });
  }

  // Fetch collaborators with user profile info
  const { data: collaborators, error: collabError } = await supabase
    .from('trip_collaborators')
    .select(`
      id,
      trip_id,
      user_id,
      email,
      role,
      status,
      invited_at,
      accepted_at
    `)
    .eq('trip_id', tripId)
    .order('invited_at', { ascending: true });

  if (collabError) {
    // If error is about missing table/column, return empty
    if (collabError.code === '42P01' || collabError.message?.includes('does not exist')) {
      return createSuccessResponse({
        collaborators: [],
        isOwner,
        tripId,
        migrationRequired: true,
      });
    }
    throw collabError;
  }

  // Get user profiles for accepted collaborators
  const userIds = (collaborators || [])
    .filter(c => c.user_id)
    .map(c => c.user_id);

  let userProfiles: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, username, display_name, avatar_url')
      .in('user_id', userIds);

    if (profiles) {
      userProfiles = profiles.reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  // Enrich collaborators with profile data
  const enrichedCollaborators = (collaborators || []).map(c => ({
    ...c,
    profile: c.user_id ? userProfiles[c.user_id] || null : null,
  }));

  return createSuccessResponse({
    collaborators: enrichedCollaborators,
    isOwner,
    tripId,
  });
});

/**
 * POST /api/trips/[id]/collaborators
 * Invite a user to collaborate on a trip
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

  // Parse request body
  const body = await request.json();
  const { email, role = 'viewer' } = body;

  if (!email || typeof email !== 'string') {
    throw createValidationError('Email is required');
  }

  if (!['editor', 'viewer'].includes(role)) {
    throw createValidationError('Role must be "editor" or "viewer"');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError('Invalid email format');
  }

  // Check if user owns the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, user_id, title')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  // Check if user is trying to invite themselves
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    throw createValidationError('You cannot invite yourself');
  }

  // Check if the email is already a collaborator
  const { data: existingCollab } = await supabase
    .from('trip_collaborators')
    .select('id, status')
    .eq('trip_id', tripId)
    .eq('email', email.toLowerCase())
    .single();

  if (existingCollab) {
    throw createValidationError(
      existingCollab.status === 'pending'
        ? 'An invitation has already been sent to this email'
        : 'This user is already a collaborator'
    );
  }

  // Note: We don't look up the user by email here since user_profiles may not have email
  // The invitation is created with just the email, and the user_id is set when they accept
  const invitedUserId: string | null = null;

  // Create the collaboration invitation
  const { data: collaborator, error: insertError } = await supabase
    .from('trip_collaborators')
    .insert({
      trip_id: tripId,
      user_id: invitedUserId || null,
      email: email.toLowerCase(),
      role,
      status: 'pending',
      invited_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      throw createValidationError('This user is already invited');
    }
    throw insertError;
  }

  // Update trip visibility to 'shared' if it was private
  await supabase
    .from('trips')
    .update({
      visibility: 'shared',
      shared_at: new Date().toISOString(),
    })
    .eq('id', tripId)
    .eq('visibility', 'private');

  return createSuccessResponse({
    collaborator,
    message: `Invitation sent to ${email}`,
  }, null, 201);
});
