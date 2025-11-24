'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect /profile to /account?tab=preferences
// The profile preferences have been merged into the Account page
export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/account?tab=preferences');
  }, [router]);

  return (
    <div className="w-full px-6 md:px-10 py-20 min-h-screen flex items-center justify-center">
      <p className="text-xs text-gray-500 dark:text-gray-400">Redirecting...</p>
    </div>
  );
}
