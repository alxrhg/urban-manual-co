'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from './AdminSidebar';

export default function AdminLayoutShellNew({ children }: { children: ReactNode }) {
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-6">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="relative h-8 w-8 animate-spin text-indigo-400" />
        </div>
        <p className="mt-4 text-sm text-gray-400">
          Verifying admin access...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <AdminSidebar />
      <main className="ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
