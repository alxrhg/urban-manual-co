'use client';

import React, { useState, useEffect, Suspense, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';

interface LoginDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function LoginDrawerContent({ isOpen, onClose }: LoginDrawerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, signInWithApple } = useAuth();
  const uniqueId = useId();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [returnTo, setReturnTo] = useState('/');
  const inputClasses =
    "w-full rounded-2xl border border-black/10 dark:border-white/15 bg-white/90 dark:bg-white/[0.04] px-4 py-3 text-sm text-gray-900 dark:text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-black/80 dark:focus:ring-white/70 placeholder:text-gray-400 dark:placeholder:text-gray-500";

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setError('');
      setSuccess('');
      setIsSignUp(false);
      return;
    }

    const redirect = searchParams?.get('redirect') || searchParams?.get('returnTo') || null;
    if (redirect) setReturnTo(redirect);

    const errorParam = searchParams?.get('error');
    if (errorParam) setError(decodeURIComponent(errorParam));
  }, [isOpen, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name);
        setSuccess('Account created! Please check your email to verify.');
        setName('');
        setEmail('');
        setPassword('');
      } else {
        await signIn(email, password);
        onClose();
        router.push(returnTo);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Apple');
      setLoading(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} style="glassy">
      <DrawerHeader
        title={isSignUp ? 'Create Account' : 'Sign In'}
        subtitle={isSignUp ? 'Set up your profile in seconds' : 'Welcome back to your manual'}
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-24">
        <div className="px-5 sm:px-6 py-6 space-y-6">
          <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/90 dark:bg-white/[0.08] shadow-[0_15px_80px_rgba(15,23,42,0.08)] dark:shadow-[0_25px_90px_rgba(2,6,23,0.6)] p-6">
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Sign in to sync saved places, trips, and AI recommendations across every device.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Save favorites', 'Plan smarter trips', 'Unlock concierge'].map((chip) => (
                <span
                  key={chip}
                  className="text-[11px] font-medium uppercase tracking-wide px-3 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-2xl border border-black/10 dark:border-white/20 bg-black text-white dark:bg-white dark:text-black hover:translate-y-0.5 transition-all text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)] dark:shadow-[0_15px_50px_rgba(15,23,42,0.35)]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple
            </button>

            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400 dark:text-gray-500">
              <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
              <span>Email</span>
              <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label htmlFor={`login-name-${uniqueId}`} className="block text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                  Name
                </label>
                <input
                  id={`login-name-${uniqueId}`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  autoComplete="name"
                  className={inputClasses}
                  placeholder="Your name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor={`login-email-${uniqueId}`} className="block text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                Email
              </label>
              <input
                id={`login-email-${uniqueId}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClasses}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`login-password-${uniqueId}`} className="block text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                Password
              </label>
              <input
                id={`login-password-${uniqueId}`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className={inputClasses}
                placeholder="••••••••"
              />
              {isSignUp && <span className="text-xs text-gray-500 dark:text-gray-400">Minimum 6 characters</span>}
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-2xl border border-red-200/70 dark:border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="default" className="rounded-2xl border border-emerald-200/70 dark:border-emerald-400/30">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-black font-semibold text-sm tracking-wide shadow-[0_15px_40px_rgba(15,23,42,0.35)] hover:translate-y-0.5 transition-all disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
              className="text-sm font-medium text-gray-900 dark:text-white underline decoration-dotted underline-offset-4 hover:text-black dark:hover:text-gray-200 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Need an account? Create one"}
            </button>
          </div>
        </div>
      </div>

      <DrawerActionBar className="flex-col gap-1 text-center bg-white/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-t border-black/5 dark:border-white/10">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our{' '}
          <a href="/privacy" className="underline decoration-dotted decoration-gray-400 dark:decoration-white/40 hover:text-gray-900 dark:hover:text-white">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/terms" className="underline decoration-dotted decoration-gray-400 dark:decoration-white/40 hover:text-gray-900 dark:hover:text-white">
            Terms
          </a>
          .
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Having trouble? <a href="/contact" className="text-gray-700 dark:text-gray-200 underline-offset-4 underline decoration-dotted">Contact us</a>
        </p>
      </DrawerActionBar>
    </Drawer>
  );
}

export function LoginDrawer({ isOpen, onClose }: LoginDrawerProps) {
  return (
    <Suspense fallback={null}>
      <LoginDrawerContent isOpen={isOpen} onClose={onClose} />
    </Suspense>
  );
}
