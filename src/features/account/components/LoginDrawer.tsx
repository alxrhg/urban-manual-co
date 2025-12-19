'use client';

import React, { useState, useEffect, Suspense, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert';
import { Drawer } from '@/ui/Drawer';
import { AuthInput, AuthPasswordInput, AuthButton, AuthDivider } from '@/ui/auth';

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

  const customHeader = (
    <div className="flex items-center justify-between w-full">
      <button
        onClick={onClose}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-all duration-150 active:scale-95"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </button>
      <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>
      <div className="w-9" /> {/* Spacer for balance */}
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} headerContent={customHeader}>
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        {/* Welcome text */}
        <div className="flex-shrink-0 px-5 sm:px-6 pt-4 sm:pt-6 pb-5">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
            {isSignUp ? 'Begin your journey' : 'Welcome back'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isSignUp ? 'Create an account to save your favorite places' : 'Sign in to access your saved places'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-safe">
          {/* Apple Sign In */}
          <AuthButton
            onClick={handleAppleSignIn}
            disabled={loading}
            className="gap-3"
          >
            <svg className="h-5 w-5 sm:h-4.5 sm:w-4.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </AuthButton>

          {/* Divider */}
          <AuthDivider>Or continue with email</AuthDivider>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Sign Up only) */}
            {isSignUp && (
              <AuthInput
                id={`login-name-${uniqueId}`}
                label="Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
                autoComplete="name"
                placeholder="Your name"
              />
            )}

            {/* Email Field */}
            <AuthInput
              id={`login-email-${uniqueId}`}
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />

            {/* Password Field */}
            <div>
              <AuthPasswordInput
                id={`login-password-${uniqueId}`}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                hint={isSignUp ? 'Minimum 6 characters' : undefined}
              />
              {!isSignUp && (
                <div className="mt-2 text-right">
                  <a
                    href="/auth/forgot-password"
                    className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      window.location.href = '/auth/forgot-password';
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
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
            <AuthButton
              type="submit"
              loading={loading}
              loadingText={isSignUp ? 'Creating account...' : 'Signing in...'}
              className="mt-6"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </AuthButton>
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
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2 min-h-[44px]"
            >
              {isSignUp ? (
                <>Already have an account? <span className="font-medium">Sign in</span></>
              ) : (
                <>Don&apos;t have an account? <span className="font-medium">Create one</span></>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800/50 pb-safe bg-gray-50/50 dark:bg-gray-900">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            By continuing, you agree to our{' '}
            <a href="/privacy" className="hover:text-gray-900 dark:hover:text-white underline underline-offset-2 transition-colors">
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
