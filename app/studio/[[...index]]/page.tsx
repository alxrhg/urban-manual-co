'use client';

import { NextStudio } from 'next-sanity/studio';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import config from '../../../sanity.config';

export default function StudioPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      const isAdmin = (user?.app_metadata as Record<string, any> | null)?.role === 'admin';
      if (!isAdmin) {
        router.replace('/account?error=unauthorized');
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 px-6">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Checking admin access…
        </p>
      </div>
    );
  }

  // User is authenticated and is admin - render Studio
  return <NextStudio config={config} />;
}
