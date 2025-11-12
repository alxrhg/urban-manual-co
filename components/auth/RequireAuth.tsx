'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface RequireAuthProps {
  children: ReactNode;
  reason: 'account' | 'trips';
}

const REASON_COPY: Record<RequireAuthProps['reason'], { title: string; description: string }> = {
  account: {
    title: 'Sign in to manage your account',
    description:
      'Your account settings, security, and activity history are protected. Sign in to continue where you left off.',
  },
  trips: {
    title: 'Sign in to access your trips',
    description:
      'Trip itineraries and recommendations are saved to your profile. Sign in to resume planning without losing progress.',
  },
};

export function RequireAuth({ children, reason }: RequireAuthProps) {
  const { user, loading, signInWithApple } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const params = useMemo(() => {
    const search = new URLSearchParams();
    search.set('returnTo', pathname || '/');
    search.set('reason', reason);
    return `/auth/sign-in?${search.toString()}`;
  }, [pathname, reason]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(params);
    }
  }, [loading, user, router, params]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">Preparing your experience…</div>
      </div>
    );
  }

  if (!user) {
    const copy = REASON_COPY[reason];

    return (
      <div className="min-h-screen bg-gray-50 px-6 py-16 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Alert variant="destructive" className="text-left">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{copy.title}</AlertTitle>
            <AlertDescription>{copy.description}</AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={() => signInWithApple().catch(() => undefined)}
            >
              Continue with Apple
            </Button>
            <Button
              type="button"
              className="w-full"
              variant="secondary"
              size="lg"
              onClick={() => router.replace(params)}
            >
              Continue with email link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
