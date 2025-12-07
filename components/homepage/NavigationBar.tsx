'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Map, LayoutGrid, Plus, Globe, Loader2, X, SlidersHorizontal, Star } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useHomepageData } from './HomepageDataProvider';

/**
 * Navigation Bar Component - Apple Design System
 *
 * Clean, minimal navigation with subtle hover effects.
 * Uses Apple's button styling and spacing principles.
 */
export default function NavigationBar() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    viewMode,
    setViewMode,
    selectedCity,
    selectedCategory,
    searchTerm,
    clearFilters,
    filteredDestinations,
    michelinOnly,
    crownOnly,
    setMichelinOnly,
    setCrownOnly,
  } = useHomepageData();
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const hasFilters = selectedCity || selectedCategory || searchTerm;
  const hasAdvancedFilters = michelinOnly || crownOnly;

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setViewMode(viewMode === 'grid' ? 'map' : 'grid');
  }, [viewMode, setViewMode]);

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center">
        {/* Left side - Active filters indicator */}
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium
                         text-gray-500 dark:text-gray-400
                         hover:text-gray-900 dark:hover:text-white
                         transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {/* Filters Button with Dropdown */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                         border px-4 text-[13px] font-medium transition-all duration-200
                         active:scale-[0.98] ${
                           hasAdvancedFilters
                             ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                             : 'border-gray-200/80 dark:border-white/[0.12] bg-white dark:bg-white/[0.06] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.1]'
                         }`}
            >
              <SlidersHorizontal className="h-[15px] w-[15px]" />
              <span className="hidden sm:inline">Filters</span>
              {hasAdvancedFilters && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-gray-900 text-[11px] font-semibold text-gray-900 dark:text-white">
                  {(michelinOnly ? 1 : 0) + (crownOnly ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Filter Dropdown */}
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1e] shadow-xl z-50 overflow-hidden">
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
                      Filter Destinations
                    </h3>
                    {hasAdvancedFilters && (
                      <button
                        onClick={() => {
                          setMichelinOnly(false);
                          setCrownOnly(false);
                        }}
                        className="text-[12px] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Special Filters */}
                  <div className="mb-4">
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Special</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setMichelinOnly(!michelinOnly)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                          michelinOnly
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                        }`}
                      >
                        <Star className="h-3.5 w-3.5" />
                        Michelin
                      </button>
                      <button
                        onClick={() => setCrownOnly(!crownOnly)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                          crownOnly
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                        }`}
                      >
                        <span>👑</span>
                        Editor's Pick
                      </button>
                    </div>
                  </div>

                  {/* Result count */}
                  <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                    <p className="text-[13px] text-gray-500 dark:text-gray-400">
                      {filteredDestinations.length} destinations match
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* View Toggle - Temporarily disabled while MapKit is being debugged */}
          {/* TODO: Re-enable when MapKit is working
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
          */}

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
