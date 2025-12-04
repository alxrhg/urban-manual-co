'use client';

import React, { useState, useEffect, Suspense, useId, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import {
  FormField,
  FormErrorSummary,
  FormSuccessMessage,
  SubmitButton,
  validators,
} from '@/components/ui/form-field';

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
        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </button>
      <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>
      <div className="w-9" /> {/* Spacer for balance */}
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} headerContent={customHeader}>
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        {/* Welcome text */}
        <div className="flex-shrink-0 px-5 sm:px-6 pt-6 sm:pt-8 pb-6">
          <p className="text-base text-gray-900 dark:text-white">
            {isSignUp ? 'Begin your travel journey' : 'Welcome back'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-safe">
          {/* Apple Sign In */}
          <button
            onClick={handleAppleSignIn}
            disabled={loading}
            className="w-full px-6 py-4 sm:py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl sm:rounded-xl hover:opacity-90 active:opacity-80 transition-opacity text-sm sm:text-base font-medium disabled:opacity-50 flex items-center justify-center gap-3 min-h-[56px] sm:min-h-[48px]"
          >
            <svg className="h-5 w-5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>

          {/* Divider */}
          <div className="relative my-6 sm:my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500">
                Or
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Sign Up only) */}
            {isSignUp && (
              <FormField
                id={`login-name-${uniqueId}`}
                label="Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Your name"
                rules={[validators.required('Please enter your name')]}
                validateOnBlur
                showValidation={false}
              />
            )}

            {/* Email Field */}
            <FormField
              id={`login-email-${uniqueId}`}
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              rules={[
                validators.required('Email is required'),
                validators.email('Please enter a valid email'),
              ]}
              validateOnBlur
              showValidation={false}
            />

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor={`login-password-${uniqueId}`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
                <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <input
                  id={`login-password-${uniqueId}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="flex h-11 w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 pr-12 py-2 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 transition-colors"
                  placeholder="••••••••"
                  aria-describedby={isSignUp ? `login-password-${uniqueId}-hint` : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isSignUp && (
                <p id={`login-password-${uniqueId}-hint`} className="text-xs text-gray-500 dark:text-gray-400">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && <FormErrorSummary errors={[error]} />}

            {/* Success Message */}
            {success && <FormSuccessMessage message={success} />}

            {/* Submit Button */}
            <SubmitButton
              isLoading={loading}
              loadingText={isSignUp ? 'Creating account...' : 'Signing in...'}
              className="w-full mt-6"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </SubmitButton>
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
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white active:text-gray-900 transition-colors py-2 min-h-[44px]"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 pb-safe">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            By continuing, you agree to our{' '}
            <a href="/privacy" className="hover:text-gray-900 dark:hover:text-white underline">
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
