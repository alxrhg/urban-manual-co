'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert';

function ForgotPasswordContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-black dark:hover:text-white mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-light mb-2">Forgot Password</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Enter your email and we&apos;ll send you a link to reset your password
        </p>

        {success ? (
          <div className="space-y-4">
            <Alert variant="default" className="rounded-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-300">Email Sent</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                If an account exists with this email, you&apos;ll receive a password reset link shortly.
              </AlertDescription>
            </Alert>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 transition-opacity text-sm font-medium"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors text-sm text-gray-900 dark:text-white"
                placeholder="you@example.com"
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
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
