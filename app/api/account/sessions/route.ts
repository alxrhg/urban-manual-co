import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';
import {
  withErrorHandling,
  createUnauthorizedError,
  handleSupabaseError,
} from '@/lib/errors';
import type { SessionRecord } from '@/contexts/UserContext';

function normalizeSessionRow(row: any): SessionRecord {
  return {
    id: row.id,
    session_id: row.session_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    location_city: row.location_city,
    location_country: row.location_country,
    device_type: row.device_type,
    referrer: row.referrer,
    last_activity: row.last_activity ?? row.updated_at ?? row.started_at,
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

  const { data, error } = await supabase
    .from('user_sessions')
    .select('id, session_id, started_at, ended_at, location_city, location_country, device_type, referrer, last_activity, updated_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(25);

  if (error) {
    throw handleSupabaseError(error);
  }

  const sessions = (data || []).map(normalizeSessionRow);
  return NextResponse.json({ sessions });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session || !sessionData.session.user) {
    throw createUnauthorizedError();
  }

  const session = sessionData.session;
  const user = session.user;

  const { sessionId, scope } = (await request.json()) as { sessionId?: string; scope?: 'others' | 'global' | 'local' };

  if (scope === 'others') {
    if (session?.access_token) {
      const admin = createServiceRoleClient();
      await admin.auth.admin.signOut(session.access_token, 'others');
    } else {
      await supabase.auth.signOut({ scope: 'others' });
    }

    await supabase
      .from('user_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('ended_at', null);

    return NextResponse.json({ success: true });
  }

  if (sessionId) {
    await supabase
      .from('user_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('session_id', sessionId);

    // Attempt to revoke via auth API by clearing other sessions
    if (session?.access_token) {
      const admin = createServiceRoleClient();
      await admin.auth.admin.signOut(session.access_token, 'others');
    }
  }

  if (scope === 'global') {
    if (session?.access_token) {
      const admin = createServiceRoleClient();
      await admin.auth.admin.signOut(session.access_token, 'global');
    } else {
      await supabase.auth.signOut({ scope: 'global' });
    }
  }

  return NextResponse.json({ success: true });
});
