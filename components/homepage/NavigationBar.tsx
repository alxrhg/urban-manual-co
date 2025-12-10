'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Globe, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useHomepageData } from './HomepageDataProvider';

/**
 * Navigation Bar Component - Apple Design System
 *
 * Clean, minimal navigation with action buttons.
 * Filters are handled in InteractiveHero for cleaner UX.
 */
export default function NavigationBar() {
  const router = useRouter();
  const { user } = useAuth();
  const { filteredDestinations } = useHomepageData();
  const [creatingTrip, setCreatingTrip] = useState(false);

  // Handle create trip
  const handleCreateTrip = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      setCreatingTrip(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: 'New Trip',
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;
      if (data) router.push(`/trips/${data.id}`);
    } catch (err) {
      console.error('Error creating trip:', err);
    } finally {
      setCreatingTrip(false);
    }
  }, [user, router]);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        {/* Left side - Results count */}
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          {filteredDestinations.length} destinations
        </p>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Create Trip */}
          <button
            onClick={handleCreateTrip}
            disabled={creatingTrip}
            className="flex h-[42px] sm:h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                       bg-gray-900 dark:bg-white px-4 text-[14px] sm:text-[13px] font-medium
                       text-white dark:text-gray-900
                       disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-100
                       active:scale-[0.98] active:bg-gray-700 dark:active:bg-gray-200 transition-all duration-200"
          >
            {creatingTrip ? (
              <Loader2 className="h-[16px] w-[16px] sm:h-[15px] sm:w-[15px] animate-spin" />
            ) : (
              <Plus className="h-[16px] w-[16px] sm:h-[15px] sm:w-[15px]" />
            )}
            <span className="hidden sm:inline">
              {creatingTrip ? 'Creating...' : 'Create Trip'}
            </span>
          </button>

          {/* Discover by Cities */}
          <Link
            href="/cities"
            className="flex h-[42px] sm:h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                       border border-gray-200/80 dark:border-white/[0.12] bg-white dark:bg-white/[0.06]
                       px-4 text-[14px] sm:text-[13px] font-medium text-gray-700 dark:text-gray-200
                       hover:bg-gray-50 dark:hover:bg-white/[0.1]
                       active:scale-[0.98] active:bg-gray-100 dark:active:bg-white/[0.15] transition-all duration-200"
          >
            <Globe className="h-[16px] w-[16px] sm:h-[15px] sm:w-[15px]" />
            <span className="hidden sm:inline">Discover by Cities</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
