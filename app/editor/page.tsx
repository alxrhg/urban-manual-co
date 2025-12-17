'use client';

import { HomepageVisualEditor } from '@/features/admin/components/HomepageVisualEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function EditorPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if user is admin
    if (user) {
      const role = (user.app_metadata as Record<string, unknown> | null)?.role;
      if (role !== 'admin') {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [user, router]);

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check admin role - redirect handled in useEffect
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== 'admin') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Back to homepage"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Homepage Visual Editor
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure homepage sections and layout
                </p>
              </div>
            </div>
            <Link
              href="/admin"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Admin Panel →
            </Link>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="max-w-7xl mx-auto py-6">
        <HomepageVisualEditor />
      </div>
    </div>
  );
}

