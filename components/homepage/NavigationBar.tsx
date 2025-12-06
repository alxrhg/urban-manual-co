'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Map, LayoutGrid, Plus, Globe, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

/**
 * Navigation Bar Component
 *
 * Provides view toggle (grid/map), create trip button, and discover link.
 * Lazy loaded to not block initial page render.
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
    // Update URL without full page reload
    const url = new URL(window.location.href);
    url.searchParams.set('view', newMode);
    router.push(url.pathname + url.search);
  }, [viewMode, router]);

  return (
    <div className="mb-6">
      <div className="flex justify-start sm:justify-end">
        <div className="flex w-full items-center gap-3 overflow-x-auto pb-2 no-scrollbar sm:justify-end sm:overflow-visible">
          {/* View Toggle */}
          <button
            onClick={handleViewToggle}
            className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 sm:px-5 text-sm font-medium text-gray-900 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.12)] transition-colors"
          >
            {viewMode === 'grid' ? (
              <>
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Grid</span>
              </>
            )}
          </button>

          {/* Create Trip */}
          <button
            onClick={handleCreateTrip}
            disabled={creatingTrip}
            className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full bg-black px-4 sm:px-5 text-sm font-medium text-white dark:bg-white dark:text-black disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            {creatingTrip ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {creatingTrip ? 'Creating...' : 'Create Trip'}
            </span>
          </button>

          {/* Discover by Cities */}
          <Link
            href="/cities"
            className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 sm:px-5 text-sm font-medium text-gray-900 dark:border-[rgba(255,255,255,0.10)] dark:text-[rgba(255,255,255,0.92)] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.12)] transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Discover by Cities</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
