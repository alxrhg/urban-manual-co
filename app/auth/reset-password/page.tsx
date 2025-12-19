'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      // Wait for Supabase to process the URL hash/params
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setSessionReady(true);
      } else {
        // Check for error in URL
        const errorParam = searchParams?.get('error');
        const errorDescription = searchParams?.get('error_description');

        if (errorParam) {
          setError(errorDescription || errorParam);
        } else {
          setError('Invalid or expired reset link. Please request a new password reset.');
        }
      }
    };

    checkSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Redirect to account after a short delay
      setTimeout(() => {
        router.push('/account?tab=settings');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady && !error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight mb-1">Reset password</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter your new password below
        </p>

        {success ? (
          <Alert variant="default" className="rounded-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-300">Password Updated</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              Your password has been reset successfully. Redirecting to your account...
            </AlertDescription>
          </Alert>
        ) : error && !sessionReady ? (
          <div className="space-y-4">
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium shadow-sm hover:shadow-md active:shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                New password
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 pr-12 py-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 focus:border-gray-300 dark:focus:border-gray-600 focus:bg-white dark:focus:bg-gray-800 transition-all duration-200 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Confirm password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 focus:border-gray-300 dark:focus:border-gray-600 focus:bg-white dark:focus:bg-gray-800 transition-all duration-200 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium disabled:opacity-50 mt-6 shadow-sm hover:shadow-md active:shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Updating...' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
