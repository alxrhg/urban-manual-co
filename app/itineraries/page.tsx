'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TripPlanner } from '@/components/TripPlanner';
import { TripViewDrawer } from '@/components/TripViewDrawer';

// Redirect to /trips or show trips page
// This is an alias for the trips page
export default function ItinerariesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      // Redirect to trips page
      router.replace('/trips');
    }
  }, [authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  return null;
}

