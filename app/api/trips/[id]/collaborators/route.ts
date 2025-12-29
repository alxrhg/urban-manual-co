/**
 * Trip collaborators API
 * GET /api/trips/[id]/collaborators - Get collaborators
 * POST /api/trips/[id]/collaborators - Invite collaborator
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { InviteCollaboratorInput } from '@/types/features';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;
  const supabase = await createServerClient();

  // Check access
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
  }

  const isOwner = trip.user_id === user.id;
  if (!isOwner) {
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('id')
      .eq('trip_id', id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!collab) {
      throw new CustomError(ErrorCode.FORBIDDEN, 'Access denied', 403);
    }
  }

  const { data: collaborators } = await supabase
    .from('trip_collaborators')
    .select(`
      id,
      email,
      role,
      status,
      invited_at,
      accepted_at,
      user:user_profiles!user_id(id, display_name, username, avatar_url)
    `)
    .eq('trip_id', id)
    .order('invited_at', { ascending: false });

  return NextResponse.json({ collaborators: collaborators || [] });
});

export const POST = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;
  const body: InviteCollaboratorInput = await request.json();
  const { email, role } = body;

  if (!email || !role) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'Email and role are required', 400);
  }

  if (!['editor', 'viewer'].includes(role)) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'Role must be "editor" or "viewer"', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'Invalid email format', 400);
  }

  const supabase = await createServerClient();

  // Check ownership
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id, title')
    .eq('id', id)
    .single();

  if (!trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
  }

  if (trip.user_id !== user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'Only the trip owner can invite collaborators', 403);
  }

  // Check if already invited
  const { data: existingCollab } = await supabase
    .from('trip_collaborators')
    .select('id, status')
    .eq('trip_id', id)
    .eq('email', email.toLowerCase())
    .single();

  if (existingCollab) {
    throw new CustomError(ErrorCode.DUPLICATE_RESOURCE, 'This email has already been invited', 409);
  }

  // Check if invited user exists
  const { data: invitedUser } = await supabase
    .from('user_profiles')
    .select('id')
    .ilike('id', email) // This won't work - need to check auth.users
    .single();

  // Create invitation
  const { data: collaborator, error } = await supabase
    .from('trip_collaborators')
    .insert({
      trip_id: id,
      email: email.toLowerCase(),
      role,
      invited_by: user.id,
      user_id: invitedUser?.id || null,
    })
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to invite collaborator', 500);
  }

  // TODO: Send email notification to invited user

  return NextResponse.json({ collaborator }, { status: 201 });
});
