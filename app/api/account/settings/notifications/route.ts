import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  withErrorHandling,
  createUnauthorizedError,
  handleSupabaseError,
} from '@/lib/errors';
import type { NotificationSettings } from '@/contexts/UserContext';

const DEFAULT_SETTINGS: NotificationSettings = {
  emailUpdates: true,
  productAnnouncements: true,
  travelAlerts: true,
  communityHighlights: false,
};

function mergeNotificationSettings(profile: Record<string, any> | null): NotificationSettings {
  if (!profile) {
    return DEFAULT_SETTINGS;
  }

  const jsonSettings = (profile.notification_settings as Partial<NotificationSettings>) || {};
  return {
    emailUpdates:
      jsonSettings.emailUpdates ??
      (typeof profile.email_notifications === 'boolean' ? profile.email_notifications : DEFAULT_SETTINGS.emailUpdates),
    productAnnouncements: jsonSettings.productAnnouncements ?? DEFAULT_SETTINGS.productAnnouncements,
    travelAlerts: jsonSettings.travelAlerts ?? DEFAULT_SETTINGS.travelAlerts,
    communityHighlights: jsonSettings.communityHighlights ?? DEFAULT_SETTINGS.communityHighlights,
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
    .select('notification_settings, email_notifications')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw handleSupabaseError(error);
  }

  const settings = mergeNotificationSettings(profile);
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

  const body = (await request.json()) as Partial<NotificationSettings>;
  const nextSettings: NotificationSettings = {
    emailUpdates: body.emailUpdates ?? DEFAULT_SETTINGS.emailUpdates,
    productAnnouncements: body.productAnnouncements ?? DEFAULT_SETTINGS.productAnnouncements,
    travelAlerts: body.travelAlerts ?? DEFAULT_SETTINGS.travelAlerts,
    communityHighlights: body.communityHighlights ?? DEFAULT_SETTINGS.communityHighlights,
  };

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        notification_settings: nextSettings,
        email_notifications: nextSettings.emailUpdates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    throw handleSupabaseError(error);
  }

  return NextResponse.json({ success: true, settings: nextSettings });
});
