import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  withErrorHandling,
  createUnauthorizedError,
  handleSupabaseError,
} from '@/lib/errors';
import type { ConnectedServicesSettings } from '@/contexts/UserContext';

const DEFAULT_SETTINGS: ConnectedServicesSettings = {
  google: false,
  apple: false,
  instagram: false,
  calendarSync: false,
};

export const GET = withErrorHandling(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('connected_services')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw handleSupabaseError(error);
  }

  const settings: ConnectedServicesSettings = {
    ...DEFAULT_SETTINGS,
    ...(profile?.connected_services as Partial<ConnectedServicesSettings> | null ?? {}),
  };

  return NextResponse.json({ settings });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const body = (await request.json()) as Partial<ConnectedServicesSettings>;
  const settings: ConnectedServicesSettings = {
    google: body.google ?? DEFAULT_SETTINGS.google,
    apple: body.apple ?? DEFAULT_SETTINGS.apple,
    instagram: body.instagram ?? DEFAULT_SETTINGS.instagram,
    calendarSync: body.calendarSync ?? DEFAULT_SETTINGS.calendarSync,
  };

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        connected_services: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    throw handleSupabaseError(error);
  }

  return NextResponse.json({ success: true, settings });
});
