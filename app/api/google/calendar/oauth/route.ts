import { NextRequest, NextResponse } from 'next/server';
import { resolveSupabaseClient } from '@/app/api/_utils/supabase';

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
];

export async function POST(request: NextRequest) {
  const supabase = resolveSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client not configured' }, { status: 500 });
  }

  let body: { tripId?: number } = {};

  try {
    body = (await request.json()) as { tripId?: number };
  } catch (error) {
    // Ignore malformed JSON and treat as empty body
  }

  const origin = request.nextUrl.origin;
  const redirectTo = `${origin}/auth/callback`;
  const queryParams: Record<string, string> = {
    access_type: 'offline',
    prompt: 'consent',
  };

  if (body.tripId) {
    queryParams.state = JSON.stringify({ tripId: body.tripId, source: 'planner' });
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: CALENDAR_SCOPES.join(' '),
      queryParams,
    },
  });

  if (error || !data?.url) {
    console.error('[planner] failed to initiate Google Calendar OAuth', error);
    return NextResponse.json({ error: 'Unable to start Google Calendar sync' }, { status: 500 });
  }

  return NextResponse.json({ url: data.url });
}
