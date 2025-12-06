/**
 * Account Sessions API
 * View and manage active sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { withErrorHandling, createUnauthorizedError, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async () => {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Note: Supabase doesn't provide a native way to list all sessions
  // We can only provide info about the current session
  // For full session management, you'd need to implement custom session tracking

  return NextResponse.json({
    currentSession: session
      ? {
          accessToken: session.access_token.slice(0, 10) + '...',
          expiresAt: session.expires_at,
          createdAt: session.user?.created_at,
        }
      : null,
    user: {
      lastSignIn: user.last_sign_in_at,
      createdAt: user.created_at,
    },
  });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'sign_out_all': {
      // Sign out from all sessions
      // Note: This requires admin API in Supabase
      const serviceRole = await createServiceRoleClient();

      // Sign out user from all sessions using admin API
      const { error } = await serviceRole.auth.admin.signOut(user.id, 'global');

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Signed out from all devices. Please sign in again.',
      });
    }

    case 'refresh_session': {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Session refreshed',
        expiresAt: data.session?.expires_at,
      });
    }

    default:
      throw createValidationError('Invalid action');
  }
});
