'use client';

import React, { useState, useEffect, Suspense, useId, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle2, Eye, EyeOff, X, Loader2 } from 'lucide-react';
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

  // Handle smooth view transition
  const handleViewToggle = () => {
    setIsTransitioning(true);
    setError('');
    setSuccess('');

    // Small delay to allow fade out
    setTimeout(() => {
      setIsSignUp(!isSignUp);
      setIsTransitioning(false);
    }, 150);
  };

  const customHeader = (
    <div className="flex items-center justify-between w-full">
      <button
        onClick={onClose}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all duration-200 ease-out"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </button>
      <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white transition-opacity duration-200">
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>
      <div className="w-9" /> {/* Spacer for balance */}
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} headerContent={customHeader} style="native">
      {/* Use app's background color (hsl(var(--background))) for seamless integration */}
      <div className="flex flex-col h-full bg-[hsl(43,27%,92%)] dark:bg-[hsl(43,20%,10%)]">
        {/* Welcome text with smooth transition */}
        <div className="flex-shrink-0 px-5 sm:px-6 pt-6 sm:pt-8 pb-6">
          <p
            className={`text-base text-gray-900 dark:text-white transition-all duration-300 ease-out ${
              isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
            }`}
          >
            {isSignUp ? 'Begin your travel journey' : 'Welcome back'}
          </p>
        </div>

        {/* Content with view transition */}
        <div
          className={`flex-1 overflow-y-auto px-5 sm:px-6 pb-safe transition-all duration-300 ease-out ${
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Apple Sign In - Enhanced with micro-interactions */}
          <button
            onClick={handleAppleSignIn}
            disabled={loading}
            className="group w-full px-6 py-4 sm:py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full
              hover:bg-gray-900 dark:hover:bg-gray-100
              active:scale-[0.98] active:bg-gray-800 dark:active:bg-gray-200
              transition-all duration-200 ease-out
              text-sm sm:text-base font-medium
              disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed
              flex items-center justify-center gap-3 min-h-[56px] sm:min-h-[48px]
              shadow-sm hover:shadow-md"
          >
            <svg
              className="h-5 w-5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>

          {/* Divider - uses background color for seamless blend */}
          <div className="relative my-6 sm:my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/10 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[hsl(43,27%,92%)] dark:bg-[hsl(43,20%,10%)] text-gray-400 dark:text-gray-500">
                Or
              </span>
            </div>
          </div>

          {/* Form with enhanced styling */}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Sign Up only) - with smooth reveal animation */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                isSignUp ? 'max-h-[100px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pb-4">
                <label htmlFor={`login-name-${uniqueId}`} className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  id={`login-name-${uniqueId}`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  autoComplete="name"
                  className="auth-input w-full px-4 py-4 sm:py-3
                    border border-black/10 dark:border-white/10
                    rounded-xl
                    bg-white/80 dark:bg-white/5
                    focus:outline-none focus:border-black/30 dark:focus:border-white/30
                    focus:bg-white dark:focus:bg-white/10
                    focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5
                    transition-all duration-200 ease-out
                    text-base sm:text-sm text-gray-900 dark:text-white
                    min-h-[56px] sm:min-h-[48px]
                    placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Your name"
                />
              </div>
            </div>

            {/* Email Field - Enhanced */}
            <div>
              <label htmlFor={`login-email-${uniqueId}`} className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id={`login-email-${uniqueId}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="auth-input w-full px-4 py-4 sm:py-3
                  border border-black/10 dark:border-white/10
                  rounded-xl
                  bg-white/80 dark:bg-white/5
                  focus:outline-none focus:border-black/30 dark:focus:border-white/30
                  focus:bg-white dark:focus:bg-white/10
                  focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5
                  transition-all duration-200 ease-out
                  text-base sm:text-sm text-gray-900 dark:text-white
                  min-h-[56px] sm:min-h-[48px]
                  placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="you@example.com"
              />
            </div>

            {/* Password Field - Enhanced with smooth icon transition */}
            <div>
              <label htmlFor={`login-password-${uniqueId}`} className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative group">
                <input
                  id={`login-password-${uniqueId}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="auth-input w-full px-4 pr-14 py-4 sm:py-3
                    border border-black/10 dark:border-white/10
                    rounded-xl
                    bg-white/80 dark:bg-white/5
                    focus:outline-none focus:border-black/30 dark:focus:border-white/30
                    focus:bg-white dark:focus:bg-white/10
                    focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5
                    transition-all duration-200 ease-out
                    text-base sm:text-sm text-gray-900 dark:text-white
                    min-h-[56px] sm:min-h-[48px]
                    placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2
                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                    active:scale-90
                    transition-all duration-200 ease-out
                    min-w-[44px] min-h-[44px] flex items-center justify-center
                    rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <div className="relative w-5 h-5 sm:w-4 sm:h-4">
                    <Eye
                      className={`absolute inset-0 w-full h-full transition-all duration-200 ${
                        showPassword ? 'opacity-0 scale-75 rotate-12' : 'opacity-100 scale-100 rotate-0'
                      }`}
                    />
                    <EyeOff
                      className={`absolute inset-0 w-full h-full transition-all duration-200 ${
                        showPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-12'
                      }`}
                    />
                  </div>
                </button>
              </div>
              {/* Password hint with smooth reveal */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  isSignUp ? 'max-h-8 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
                }`}
              >
                <p className="text-xs text-gray-400">Minimum 6 characters</p>
              </div>
            </div>

            {/* Error Alert - with slide animation */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                error ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <Alert
                variant="destructive"
                className="rounded-xl animate-in slide-in-from-top-2 fade-in-0 duration-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>

            {/* Success Alert - with slide animation */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                success ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <Alert
                variant="default"
                className="rounded-xl animate-in slide-in-from-top-2 fade-in-0 duration-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">Success</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
              </Alert>
            </div>

            {/* Submit Button - Enhanced with loading spinner */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full px-6 py-4 sm:py-3.5
                bg-black dark:bg-white text-white dark:text-black
                rounded-full
                hover:bg-gray-900 dark:hover:bg-gray-100
                active:scale-[0.98] active:bg-gray-800 dark:active:bg-gray-200
                transition-all duration-200 ease-out
                text-sm sm:text-base font-medium
                disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed
                min-h-[56px] sm:min-h-[48px] mt-6
                shadow-sm hover:shadow-md
                overflow-hidden"
            >
              {/* Button content with loading state */}
              <span
                className={`inline-flex items-center justify-center gap-2 transition-all duration-200 ${
                  loading ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </span>

              {/* Loading spinner overlay */}
              <span
                className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
                  loading ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Loader2 className="h-5 w-5 animate-spin" />
              </span>
            </button>
          </form>

          {/* Toggle Sign In / Sign Up - Enhanced */}
          <div className="text-center mt-6 mb-4">
            <button
              type="button"
              onClick={handleViewToggle}
              disabled={isTransitioning}
              className="text-sm text-gray-500 dark:text-gray-400
                hover:text-gray-900 dark:hover:text-white
                active:scale-[0.98]
                transition-all duration-200 ease-out
                py-2 min-h-[44px]
                disabled:opacity-50"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        {/* Footer - seamless with main background */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-black/5 dark:border-white/5 pb-safe bg-[hsl(43,27%,92%)] dark:bg-[hsl(43,20%,10%)]">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            By continuing, you agree to our{' '}
            <a
              href="/privacy"
              className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            >
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
