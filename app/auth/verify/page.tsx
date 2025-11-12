'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithApple, sendMagicLink, pendingVerificationEmail } = useAuth();

  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const returnTo = searchParams.get('returnTo') || '/';
  const email = useMemo(
    () => searchParams.get('email') || pendingVerificationEmail || '',
    [pendingVerificationEmail, searchParams]
  );

  useEffect(() => {
    if (!email) {
      router.replace(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [email, returnTo, router]);

  const handleApple = async () => {
    setError(null);
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (err: any) {
      setError(err?.message || 'Apple sign in is unavailable right now.');
      setAppleLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await sendMagicLink(email, returnTo);
      setSuccess(`We sent a fresh link to ${email}. Check your inbox or spam folder.`);
    } catch (err: any) {
      setError(err?.message || 'Unable to resend the verification email.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <AuthFormShell
      title="Confirm your email"
      subtitle="Verify your address so we can keep your travel history safe."
      showDivider={false}
      actions={(
        <>
          <button
            type="button"
            onClick={handleApple}
            disabled={appleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <span>{appleLoading ? 'Redirecting…' : 'Continue with Apple'}</span>
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span>{loading ? 'Sending…' : 'Resend email link'}</span>
          </button>
        </>
      )}
      notice={
        <Alert variant="default">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>
            We sent a confirmation link to <span className="font-medium">{email}</span>. Click it within 5 minutes to finish
            signing in.
          </AlertDescription>
        </Alert>
      }
      footer={(
        <p>
          Wrong inbox?{' '}
          <Link href={`/auth/sign-up?returnTo=${encodeURIComponent(returnTo)}`} className="underline-offset-4 hover:underline">
            Use a different email
          </Link>
          .
        </p>
      )}
    >
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Link sent</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Didn’t get it? Check spam, add <span className="font-medium">hello@urbanmanual.com</span> to your contacts, or request another
        link above.
      </p>
    </AuthFormShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500 dark:bg-gray-950">
          Loading…
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
