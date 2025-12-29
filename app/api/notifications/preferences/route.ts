/**
 * Notification preferences API
 * GET /api/notifications/preferences - Get preferences
 * PUT /api/notifications/preferences - Update preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { UpdateNotificationPreferencesInput } from '@/types/features';

export const GET = withAuth(async (request: NextRequest, { user }) => {
  const supabase = await createServerClient();

  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to fetch preferences', 500);
  }

  // Return defaults if not found
  const defaultPrefs = {
    user_id: user.id,
    email_digest: 'weekly',
    new_in_city: true,
    review_on_saved: true,
    trip_reminder: true,
    collaborator_activity: true,
    new_followers: true,
    list_likes: true,
    achievement_earned: true,
    marketing: false,
  };

  return NextResponse.json({ preferences: preferences || defaultPrefs });
});

export const PUT = withAuth(async (request: NextRequest, { user }) => {
  const body: UpdateNotificationPreferencesInput = await request.json();

  // Validate email_digest
  if (body.email_digest && !['never', 'daily', 'weekly', 'monthly'].includes(body.email_digest)) {
    throw new CustomError(
      ErrorCode.VALIDATION_ERROR,
      'email_digest must be never, daily, weekly, or monthly',
      400
    );
  }

  const supabase = await createServerClient();

  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        ...body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to update preferences', 500);
  }

  return NextResponse.json({ preferences });
});
