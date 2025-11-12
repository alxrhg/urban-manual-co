import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  withErrorHandling,
  createUnauthorizedError,
  handleSupabaseError,
} from '@/lib/errors';
import type { ActivityLogEntry } from '@/contexts/UserContext';

function normalizeActivity(row: any): ActivityLogEntry {
  return {
    id: row.id,
    type: row.type,
    created_at: row.created_at,
    description: row.content || row.description || null,
    destination_slug: row.destination_slug ?? null,
    metadata: row.metadata ?? null,
  };
}

export const GET = withErrorHandling(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const [activitiesResult, sessionsResult] = await Promise.all([
    supabase
      .from('activities')
      .select('id, type, destination_slug, content, created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('user_sessions')
      .select('id, session_id, started_at, ended_at, location_city, location_country, device_type, last_activity')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(10),
  ]);

  if (activitiesResult.error) {
    throw handleSupabaseError(activitiesResult.error);
  }
  if (sessionsResult.error) {
    throw handleSupabaseError(sessionsResult.error);
  }

  const activityEntries = (activitiesResult.data || []).map(normalizeActivity);
  const sessionEntries: ActivityLogEntry[] = (sessionsResult.data || []).map(session => ({
    id: `session-${session.id}`,
    type: session.ended_at ? 'session_ended' : 'session_started',
    created_at: session.ended_at ?? session.started_at,
    description: session.ended_at
      ? 'Signed out on a device'
      : 'Signed in on a new device',
    destination_slug: null,
    metadata: {
      session_id: session.session_id,
      device_type: session.device_type,
      location_city: session.location_city,
      location_country: session.location_country,
      last_activity: session.last_activity,
    },
  }));

  const combined = [...activityEntries, ...sessionEntries].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ activity: combined.slice(0, 30) });
});
