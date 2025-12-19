'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminNav } from './AdminNav';

export default function AdminLayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isAdmin = (user?.app_metadata as Record<string, unknown> | null)?.role === 'admin';
  const isDashboard = pathname === '/admin';

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/account');
    }
  }, [isAdmin, loading, router]);

  if (loading || (!isAdmin && !loading)) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Checking access...
          </p>
        </div>
      </main>
    );
  }

  // Dashboard view - minimal header with centered content
  if (isDashboard) {
    return (
      <main className="w-full min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Minimal top bar */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link href="/admin" className="text-sm font-medium text-black dark:text-white">
              Urban Manual
            </Link>
            <div className="flex items-center gap-4">
              <AdminNav minimal />
              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit
              </Link>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-6xl mx-auto px-6 py-10">
          {children}
        </div>
      </main>
    );
  }

  // Sub-page view - standard layout with header
  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light">Admin</h1>
            <Link
              href="/"
              className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              Exit
            </Link>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-12">
          <AdminNav />
        </div>

        {/* Content */}
        {children}
      </div>
    </main>
  );
}
