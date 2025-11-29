'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Checking access...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Minimal Header */}
        <header className="py-6 md:py-8 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <Link
              href="/admin"
              className="text-sm font-medium text-black dark:text-white hover:opacity-70 transition-opacity"
            >
              Admin
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{user?.email}</span>
              <Link
                href="/"
                className="text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              >
                Exit
              </Link>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <AdminNav />
        </div>

        {/* Content */}
        <main className="py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
