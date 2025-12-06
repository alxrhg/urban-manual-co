/**
 * Account Security API
 * Handles password reset, email/password updates, OAuth linking, sessions, and MFA
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
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

  // Get user's identities (linked OAuth providers)
  const identities = user.identities || [];

  // Get MFA factors
  const { data: mfaData } = await supabase.auth.mfa.listFactors();

  // Check email verification status
  const emailVerified = user.email_confirmed_at != null;

  // Determine auth method
  const hasPassword = identities.some(
    (identity) => identity.provider === 'email'
  );
  const linkedProviders = identities
    .filter((identity) => identity.provider !== 'email')
    .map((identity) => ({
      id: identity.id,
      provider: identity.provider,
      created_at: identity.created_at,
      last_sign_in_at: identity.last_sign_in_at,
      identity_data: {
        email: identity.identity_data?.email,
        name: identity.identity_data?.full_name || identity.identity_data?.name,
      },
    }));

  return NextResponse.json({
    email: user.email,
    emailVerified,
    hasPassword,
    linkedProviders,
    mfa: {
      enabled: (mfaData?.totp || []).some((f) => f.status === 'verified'),
      factors: mfaData?.totp || [],
    },
    lastSignIn: user.last_sign_in_at,
    createdAt: user.created_at,
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
    case 'request_password_reset': {
      const email = user.email;
      if (!email) {
        throw createValidationError('No email associated with this account');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'}/auth/reset-password`,
      });

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Password reset email sent. Check your inbox.',
      });
    }

    case 'update_email': {
      const { newEmail } = body;

      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        throw createValidationError('Valid email address is required');
      }

      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Confirmation email sent to your new address. Please verify to complete the change.',
      });
    }

    case 'update_password': {
      const { currentPassword, newPassword } = body;

      if (!newPassword || newPassword.length < 6) {
        throw createValidationError('Password must be at least 6 characters');
      }

      // If user has a password, verify current password first
      const hasPassword = user.identities?.some(
        (identity) => identity.provider === 'email'
      );

      if (hasPassword && !currentPassword) {
        throw createValidationError('Current password is required');
      }

      // Supabase updateUser doesn't require current password verification
      // but we should verify it for security
      if (hasPassword && currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: currentPassword,
        });

        if (signInError) {
          throw createValidationError('Current password is incorrect');
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
      });
    }

    case 'link_provider': {
      const { provider } = body;

      if (!['apple', 'google'].includes(provider)) {
        throw createValidationError('Invalid provider');
      }

      // Generate the OAuth URL for linking
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'}/auth/callback?next=/account?tab=settings`,
        },
      });

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        url: data.url,
      });
    }

    case 'unlink_provider': {
      const { identityId } = body;

      if (!identityId) {
        throw createValidationError('Identity ID is required');
      }

      // Ensure user has at least one other auth method
      const identities = user.identities || [];
      const hasPassword = identities.some((i) => i.provider === 'email');
      const otherProviders = identities.filter(
        (i) => i.id !== identityId && i.provider !== 'email'
      );

      if (!hasPassword && otherProviders.length === 0) {
        throw createValidationError(
          'Cannot unlink the only authentication method. Add a password or another provider first.'
        );
      }

      const { error } = await supabase.auth.unlinkIdentity({
        id: identityId,
        provider: identities.find((i) => i.id === identityId)?.provider || '',
      } as any);

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Provider unlinked successfully',
      });
    }

    case 'enroll_mfa': {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
    }

    case 'verify_mfa': {
      const { factorId, code } = body;

      if (!factorId || !code) {
        throw createValidationError('Factor ID and code are required');
      }

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    }

    case 'unenroll_mfa': {
      const { factorId } = body;

      if (!factorId) {
        throw createValidationError('Factor ID is required');
      }

      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'MFA disabled successfully',
      });
    }

    case 'resend_verification': {
      const email = user.email;
      if (!email) {
        throw createValidationError('No email associated with this account');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        throw createValidationError(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Verification email sent',
      });
    }

    default:
      throw createValidationError('Invalid action');
  }
});
