'use client';

import React, { useState, useEffect, Suspense, useId } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/ui/dialog';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function LoginModalContent({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
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
  // Default to current page so user stays on same page after login
  const [returnTo, setReturnTo] = useState(pathname || '/');

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

    // Check for explicit redirect params, otherwise use current pathname
    const redirect = searchParams?.get('redirect') || searchParams?.get('returnTo') || null;
    if (redirect) {
      setReturnTo(redirect);
    } else if (pathname) {
      setReturnTo(pathname);
    }

    const errorParam = searchParams?.get('error');
    if (errorParam) setError(decodeURIComponent(errorParam));
  }, [isOpen, searchParams, pathname]);

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
        // Refresh to update server components with new auth state
        // then navigate to return URL (usually stays on same page)
        router.refresh();
        if (returnTo !== pathname) {
          router.push(returnTo);
        }
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden bg-[var(--editorial-bg)] border-[var(--editorial-border)]">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle
            className="text-center text-lg font-normal text-[var(--editorial-text-primary)]"
            style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </DialogTitle>
          <DialogDescription className="text-center text-[var(--editorial-text-secondary)]">
            {isSignUp ? 'Begin your travel journey' : 'Welcome back'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Apple Sign In */}
          <button
            onClick={handleAppleSignIn}
            disabled={loading}
            className="w-full px-6 py-3.5 bg-[var(--editorial-text-primary)] text-white rounded-lg hover:opacity-90 active:opacity-80 transition-opacity text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--editorial-border)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[var(--editorial-bg)] text-[var(--editorial-text-tertiary)]">
                Or
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label htmlFor={`modal-name-${uniqueId}`} className="block text-sm font-medium mb-2 text-[var(--editorial-text-primary)]">
                  Name
                </label>
                <input
                  id={`modal-name-${uniqueId}`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  autoComplete="name"
                  className="w-full px-4 py-3 border border-[var(--editorial-border)] rounded-xl bg-[var(--editorial-bg-elevated)] focus:outline-none focus:border-[var(--editorial-accent)] transition-colors text-sm text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)]"
                  placeholder="Your name"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor={`modal-email-${uniqueId}`} className="block text-sm font-medium mb-2 text-[var(--editorial-text-primary)]">
                Email
              </label>
              <input
                id={`modal-email-${uniqueId}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-[var(--editorial-border)] rounded-xl bg-[var(--editorial-bg-elevated)] focus:outline-none focus:border-[var(--editorial-accent)] transition-colors text-sm text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)]"
                placeholder="you@example.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor={`modal-password-${uniqueId}`} className="block text-sm font-medium mb-2 text-[var(--editorial-text-primary)]">
                Password
              </label>
              <div className="relative">
                <input
                  id={`modal-password-${uniqueId}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full px-4 pr-12 py-3 border border-[var(--editorial-border)] rounded-xl bg-[var(--editorial-bg-elevated)] focus:outline-none focus:border-[var(--editorial-accent)] transition-colors text-sm text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isSignUp ? (
                <p className="text-xs text-[var(--editorial-text-tertiary)] mt-2">Minimum 6 characters</p>
              ) : (
                <div className="mt-2 text-right">
                  <a
                    href="/auth/forgot-password"
                    className="text-xs text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]"
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
              <Alert variant="default" className="rounded-xl bg-[var(--editorial-accent)]/10 border-[var(--editorial-accent)]/30">
                <CheckCircle2 className="h-4 w-4 text-[var(--editorial-accent)]" />
                <AlertTitle className="text-[var(--editorial-accent)]">Success</AlertTitle>
                <AlertDescription className="text-[var(--editorial-text-secondary)]">{success}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 bg-[var(--editorial-accent)] text-white rounded-lg hover:opacity-90 active:opacity-80 transition-opacity text-sm font-medium disabled:opacity-50 mt-2"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>

          {/* Footer */}
          <p className="text-xs text-[var(--editorial-text-tertiary)] text-center pt-2">
            By continuing, you agree to our{' '}
            <a href="/privacy" className="hover:text-[var(--editorial-text-primary)] underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  return (
    <Suspense fallback={null}>
      <LoginModalContent isOpen={isOpen} onClose={onClose} />
    </Suspense>
  );
}
