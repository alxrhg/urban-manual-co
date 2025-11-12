import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  withErrorHandling,
  createUnauthorizedError,
  handleSupabaseError,
} from '@/lib/errors';
import type { PrivacySettings } from '@/contexts/UserContext';

const DEFAULT_SETTINGS: PrivacySettings = {
  isPublic: true,
  privacyMode: false,
  allowTracking: true,
  showActivity: true,
};

function mergePrivacySettings(profile: Record<string, any> | null): PrivacySettings {
  if (!profile) return DEFAULT_SETTINGS;
  const jsonSettings = (profile.privacy_settings as Partial<PrivacySettings>) || {};
  return {
    isPublic: jsonSettings.isPublic ?? (typeof profile.is_public === 'boolean' ? profile.is_public : DEFAULT_SETTINGS.isPublic),
    privacyMode:
      jsonSettings.privacyMode ?? (typeof profile.privacy_mode === 'boolean' ? profile.privacy_mode : DEFAULT_SETTINGS.privacyMode),
    allowTracking:
      jsonSettings.allowTracking ?? (typeof profile.allow_tracking === 'boolean' ? profile.allow_tracking : DEFAULT_SETTINGS.allowTracking),
    showActivity:
      jsonSettings.showActivity ?? (typeof profile.show_activity === 'boolean' ? profile.show_activity : DEFAULT_SETTINGS.showActivity),
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

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('privacy_settings, is_public, privacy_mode, allow_tracking, show_activity')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw handleSupabaseError(error);
  }

  const settings = mergePrivacySettings(profile);
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

  const body = (await request.json()) as Partial<PrivacySettings>;
  const nextSettings: PrivacySettings = {
    isPublic: body.isPublic ?? DEFAULT_SETTINGS.isPublic,
    privacyMode: body.privacyMode ?? DEFAULT_SETTINGS.privacyMode,
    allowTracking: body.allowTracking ?? DEFAULT_SETTINGS.allowTracking,
    showActivity: body.showActivity ?? DEFAULT_SETTINGS.showActivity,
  };

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        privacy_settings: nextSettings,
        is_public: nextSettings.isPublic,
        privacy_mode: nextSettings.privacyMode,
        allow_tracking: nextSettings.allowTracking,
        show_activity: nextSettings.showActivity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    throw handleSupabaseError(error);
  }

  return NextResponse.json({ success: true, settings: nextSettings });
});
