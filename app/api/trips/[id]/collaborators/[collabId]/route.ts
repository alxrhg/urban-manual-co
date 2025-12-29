/**
 * Single collaborator management
 * PUT /api/trips/[id]/collaborators/[collabId] - Update role
 * DELETE /api/trips/[id]/collaborators/[collabId] - Remove collaborator
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ id: string; collabId: string }>;
}

export const PUT = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id, collabId } = await context.params;
  const body = await request.json();
  const { role } = body;

  if (!role || !['editor', 'viewer'].includes(role)) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'Role must be "editor" or "viewer"', 400);
  }

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
    throw new CustomError(ErrorCode.FORBIDDEN, 'Only the trip owner can manage collaborators', 403);
  }

  const { data: collaborator, error } = await supabase
    .from('trip_collaborators')
    .update({ role })
    .eq('id', collabId)
    .eq('trip_id', id)
    .select()
    .single();

  if (error || !collaborator) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Collaborator not found', 404);
  }

  return NextResponse.json({ collaborator });
});

export const DELETE = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id, collabId } = await context.params;
  const supabase = await createServerClient();

  // Get trip and collaborator info
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
  }

  const { data: collab } = await supabase
    .from('trip_collaborators')
    .select('user_id')
    .eq('id', collabId)
    .eq('trip_id', id)
    .single();

  if (!collab) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Collaborator not found', 404);
  }

  // Can remove if owner OR if removing self
  const isOwner = trip.user_id === user.id;
  const isSelf = collab.user_id === user.id;

  if (!isOwner && !isSelf) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'Access denied', 403);
  }

  const { error } = await supabase
    .from('trip_collaborators')
    .delete()
    .eq('id', collabId);

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to remove collaborator', 500);
  }

  return NextResponse.json({ success: true });
});
