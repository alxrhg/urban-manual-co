import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  createSuccessResponse,
  createUnauthorizedError,
} from '@/lib/errors';

/**
 * GET /api/trips/invitations
 * List all pending trip invitations for the current user
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Find invitations by user_id or email
  const { data: invitations, error } = await supabase
    .from('trip_collaborators')
    .select(`
      id,
      trip_id,
      email,
      role,
      status,
      invited_at,
      invited_by
    `)
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });

  if (error) throw error;

  // Get trip details for each invitation
  const tripIds = (invitations || []).map(inv => inv.trip_id);
  let trips: Record<string, any> = {};

  if (tripIds.length > 0) {
    const { data: tripData } = await supabase
      .from('trips')
      .select('id, title, destination, start_date, end_date, cover_image, user_id')
      .in('id', tripIds);

    if (tripData) {
      trips = tripData.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  // Get inviter profiles
  const inviterIds = (invitations || [])
    .filter(inv => inv.invited_by)
    .map(inv => inv.invited_by);

  let inviters: Record<string, any> = {};
  if (inviterIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, username, display_name, avatar_url')
      .in('user_id', inviterIds);

    if (profiles) {
      inviters = profiles.reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  // Enrich invitations with trip and inviter data
  const enrichedInvitations = (invitations || []).map(inv => ({
    ...inv,
    trip: trips[inv.trip_id] || null,
    inviter: inv.invited_by ? inviters[inv.invited_by] || null : null,
  }));

  return createSuccessResponse({
    invitations: enrichedInvitations,
  });
});
