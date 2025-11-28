'use client';

import React, { useState, useEffect, Suspense, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Drawer } from '@/components/ui/Drawer';

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [returnTo, setReturnTo] = useState('/');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setError('');
      setSuccess('');
      setIsSignUp(false);
      setShowPassword(false);
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
    <Drawer isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full bg-white dark:bg-stone-950">
        {/* Header */}
        <div className="flex-shrink-0 px-5 sm:px-6 pt-8 sm:pt-10 pb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-white tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome back'}
          </h1>
          <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 mt-2">
            {isSignUp ? 'Begin your travel journey' : 'Sign in to continue'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-safe">
          {/* Apple Sign In */}
          <button
            onClick={handleAppleSignIn}
            disabled={loading}
            className="w-full px-6 py-4 sm:py-3.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl sm:rounded-xl hover:opacity-90 active:opacity-80 transition-opacity text-sm sm:text-base font-medium disabled:opacity-50 flex items-center justify-center gap-3 min-h-[56px] sm:min-h-[48px]"
          >
            <svg className="h-5 w-5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>

          {/* Divider */}
          <div className="relative my-6 sm:my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200 dark:border-stone-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-white dark:bg-stone-950 text-stone-400 dark:text-stone-500">
                or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label htmlFor={`login-name-${uniqueId}`} className="block text-xs font-medium mb-2 text-stone-600 dark:text-stone-400">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 text-stone-400" />
                  <input
                    id={`login-name-${uniqueId}`}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isSignUp}
                    autoComplete="name"
                    className="w-full pl-12 sm:pl-11 pr-4 py-4 sm:py-3 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 focus:bg-white dark:focus:bg-stone-900 transition-colors text-base sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 min-h-[56px] sm:min-h-[48px]"
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor={`login-email-${uniqueId}`} className="block text-xs font-medium mb-2 text-stone-600 dark:text-stone-400">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 text-stone-400" />
                <input
                  id={`login-email-${uniqueId}`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-12 sm:pl-11 pr-4 py-4 sm:py-3 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 focus:bg-white dark:focus:bg-stone-900 transition-colors text-base sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 min-h-[56px] sm:min-h-[48px]"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor={`login-password-${uniqueId}`} className="block text-xs font-medium mb-2 text-stone-600 dark:text-stone-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 text-stone-400" />
                <input
                  id={`login-password-${uniqueId}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full pl-12 sm:pl-11 pr-14 py-4 sm:py-3 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 focus:bg-white dark:focus:bg-stone-900 transition-colors text-base sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 min-h-[56px] sm:min-h-[48px]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 active:text-stone-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5 sm:w-4 sm:h-4" /> : <Eye className="w-5 h-5 sm:w-4 sm:h-4" />}
                </button>
              </div>
              {isSignUp && (
                <p className="text-xs text-stone-400 mt-2">Minimum 6 characters</p>
              )}
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert variant="default" className="rounded-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">Success</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 sm:py-3.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl sm:rounded-xl hover:opacity-90 active:opacity-80 transition-opacity text-sm sm:text-base font-medium disabled:opacity-50 min-h-[56px] sm:min-h-[48px] mt-6"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="text-center mt-6 mb-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white active:text-stone-900 transition-colors py-2 min-h-[44px]"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-stone-100 dark:border-stone-900 pb-safe">
          <p className="text-xs text-stone-400 dark:text-stone-500 text-center">
            By continuing, you agree to our{' '}
            <a href="/privacy" className="hover:text-stone-900 dark:hover:text-white underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
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
