'use client';

import { useRouter } from 'next/navigation';

export default function TripsUnauthenticated() {
  const router = useRouter();

  return (
    <main className="w-full px-6 md:px-10 py-20">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-light mb-8">Trips</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Sign in to plan and organize your travels
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-sm hover:opacity-80 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </div>
    </main>
  );
}
