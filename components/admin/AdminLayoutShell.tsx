'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminNav } from './AdminNav';

export default function AdminLayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin = (user?.app_metadata as Record<string, unknown> | null)?.role === 'admin';

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/account');
    }
  }, [isAdmin, loading, router]);

  if (loading || (!isAdmin && !loading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 px-6">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Checking admin access...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8 md:py-10 space-y-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">
                Admin Console
              </p>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                Content Operations
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.email}
                </div>
                <div className="mt-1 inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900">
                  Admin
                </div>
              </div>
            </div>
          </div>
          <AdminNav />
        </header>

        <section className="space-y-6">
          {children}
        </section>
      </div>
    </div>
  );
}
