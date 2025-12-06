'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Map, LayoutGrid, Plus, Globe, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

/**
 * Navigation Bar Component - Apple Design System
 *
 * Clean, minimal navigation with subtle hover effects.
 * Uses Apple's button styling and spacing principles.
 */
export default function NavigationBar() {
  const router = useRouter();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
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

  // Handle view mode toggle
  const handleViewToggle = useCallback(() => {
    const newMode = viewMode === 'grid' ? 'map' : 'grid';
    setViewMode(newMode);
    const url = new URL(window.location.href);
    url.searchParams.set('view', newMode);
    router.push(url.pathname + url.search);
  }, [viewMode, router]);

  return (
    <div className="mb-8">
      <div className="flex justify-start sm:justify-end">
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-2 no-scrollbar sm:justify-end sm:overflow-visible">
          {/* View Toggle - Apple-style segmented control look */}
          <button
            onClick={handleViewToggle}
            className="flex h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                       border border-gray-200/80 dark:border-white/[0.12] bg-white dark:bg-white/[0.06]
                       px-4 text-[13px] font-medium text-gray-700 dark:text-gray-200
                       hover:bg-gray-50 dark:hover:bg-white/[0.1]
                       active:scale-[0.98] transition-all duration-200"
          >
            {viewMode === 'grid' ? (
              <>
                <Map className="h-[15px] w-[15px]" />
                <span className="hidden sm:inline">Map</span>
              </>
            ) : (
              <>
                <LayoutGrid className="h-[15px] w-[15px]" />
                <span className="hidden sm:inline">Grid</span>
              </>
            )}
          </button>

          {/* Create Trip - Apple-style primary button */}
          <button
            onClick={handleCreateTrip}
            disabled={creatingTrip}
            className="flex h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                       bg-gray-900 dark:bg-white px-4 text-[13px] font-medium
                       text-white dark:text-gray-900
                       disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-100
                       active:scale-[0.98] transition-all duration-200"
          >
            {creatingTrip ? (
              <Loader2 className="h-[15px] w-[15px] animate-spin" />
            ) : (
              <Plus className="h-[15px] w-[15px]" />
            )}
            <span className="hidden sm:inline">
              {creatingTrip ? 'Creating...' : 'Create Trip'}
            </span>
          </button>

          {/* Discover by Cities - Apple-style secondary button */}
          <Link
            href="/cities"
            className="flex h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                       border border-gray-200/80 dark:border-white/[0.12] bg-white dark:bg-white/[0.06]
                       px-4 text-[13px] font-medium text-gray-700 dark:text-gray-200
                       hover:bg-gray-50 dark:hover:bg-white/[0.1]
                       active:scale-[0.98] transition-all duration-200"
          >
            <Globe className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Discover by Cities</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
