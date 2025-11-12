'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, signInWithApple, sendMagicLink } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const returnTo = searchParams.get('returnTo') || '/';

  useEffect(() => {
    const prefilledEmail = searchParams.get('email');
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { session } = await signUp(email, password, returnTo);

      if (session) {
        router.push(returnTo);
        return;
      }

      setSuccess('Account created! Check your email to verify your address and finish setting up your profile.');
      router.push(`/auth/verify?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`);
    } catch (err: any) {
      setError(err?.message || 'We couldn’t create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setError(null);
    setSuccess(null);
    setAppleLoading(true);

    try {
      await signInWithApple();
    } catch (err: any) {
      setError(err?.message || 'Apple sign up is unavailable right now. Please try again.');
      setAppleLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Enter your email so we know where to send the link.');
      return;
    }

    setError(null);
    setSuccess(null);
    setMagicLinkLoading(true);

    try {
      await sendMagicLink(email, returnTo);
      setSuccess(`We emailed a secure link to ${email}. Use it to finish creating your account.`);
      router.push(`/auth/verify?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`);
    } catch (err: any) {
      setError(err?.message || 'Unable to send a magic link right now.');
    } finally {
      setMagicLinkLoading(false);
    }
  };

  return (
    <AuthFormShell
      title="Create your account"
      subtitle="Personalize your trips, unlock AI planning, and sync your travel history."
      actions={(
        <>
          <button
            type="button"
            onClick={handleAppleSignUp}
            disabled={loading || appleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <span>{appleLoading ? 'Redirecting…' : 'Continue with Apple'}</span>
          </button>
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading || magicLinkLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span>{magicLinkLoading ? 'Sending link…' : 'Continue with email link'}</span>
          </button>
        </>
      )}
      footer={(
        <p>
          By creating an account you agree to our{' '}
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm transition-colors focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:focus:border-white"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
            minLength={6}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm transition-colors focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:focus:border-white"
            placeholder="At least 6 characters"
          />
          <span className="mt-1 block text-xs text-gray-400">Minimum 6 characters</span>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>We couldn’t finish sign up</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? 'Creating your account…' : 'Create account'}
        </button>

        <p className="pt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(email)}`} className="font-medium text-gray-900 underline-offset-4 hover:underline dark:text-gray-100">
            Sign in
          </Link>
          .
        </p>
      </form>
    </AuthFormShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500 dark:bg-gray-950">
          Loading…
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
