'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert';
import { AuthInput, AuthButton } from '@/ui/auth';

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
    <div className="min-h-screen bg-[var(--editorial-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] mb-8 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        <h1
          className="text-xl font-normal text-[var(--editorial-text-primary)] tracking-tight mb-1"
          style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
        >
          Forgot password?
        </h1>
        <p className="text-sm text-[var(--editorial-text-secondary)] mb-6">
          No worries, we&apos;ll send you a reset link
        </p>

        {success ? (
          <div className="space-y-4">
            <Alert variant="default" className="rounded-xl bg-[var(--editorial-accent)]/10 border-[var(--editorial-accent)]/30">
              <CheckCircle2 className="h-4 w-4 text-[var(--editorial-accent)]" />
              <AlertTitle className="text-[var(--editorial-accent)]">Email Sent</AlertTitle>
              <AlertDescription className="text-[var(--editorial-text-secondary)]">
                If an account exists with this email, you&apos;ll receive a password reset link shortly.
              </AlertDescription>
            </Alert>
            <AuthButton
              onClick={() => router.push('/auth/login')}
              variant="secondary"
            >
              Back to Sign In
            </AuthButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthInput
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />

            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <AuthButton
              type="submit"
              loading={loading}
              loadingText="Sending..."
              variant="secondary"
            >
              Send reset link
            </AuthButton>
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
        <div className="min-h-screen bg-[var(--editorial-bg)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--editorial-text-tertiary)]" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
