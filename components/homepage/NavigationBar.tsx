'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Globe, Loader2, SlidersHorizontal, X, Star, Crown, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useHomepageData } from './HomepageDataProvider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Navigation Bar Component - Apple Design System
 *
 * Clean, minimal navigation with action buttons and filters.
 */
export default function NavigationBar() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    filteredDestinations,
    cities,
    categories,
    selectedCity,
    selectedCategory,
    michelinOnly,
    crownOnly,
    setSelectedCity,
    setSelectedCategory,
    setMichelinOnly,
    setCrownOnly,
    clearFilters,
  } = useHomepageData();
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCity) count++;
    if (selectedCategory) count++;
    if (michelinOnly) count++;
    if (crownOnly) count++;
    return count;
  }, [selectedCity, selectedCategory, michelinOnly, crownOnly]);

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
        {/* Left side - Results count and active filters */}
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            {filteredDestinations.length} destinations
          </p>

          {/* Active filter badges */}
          {activeFilterCount > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {selectedCity && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-[12px] text-gray-700 dark:text-gray-300">
                  {selectedCity}
                  <button onClick={() => setSelectedCity('')} className="hover:text-gray-900 dark:hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-[12px] text-gray-700 dark:text-gray-300">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('')} className="hover:text-gray-900 dark:hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {michelinOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-[12px] text-red-700 dark:text-red-300">
                  <Star className="h-3 w-3" />
                  Michelin
                  <button onClick={() => setMichelinOnly(false)} className="hover:text-red-900 dark:hover:text-red-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {crownOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-[12px] text-amber-700 dark:text-amber-300">
                  <Crown className="h-3 w-3" />
                  Crown
                  <button onClick={() => setCrownOnly(false)} className="hover:text-amber-900 dark:hover:text-amber-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Filter Button */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                className={`relative flex h-[42px] sm:h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                           border px-4 text-[14px] sm:text-[13px] font-medium transition-all duration-200
                           active:scale-[0.98] ${
                             activeFilterCount > 0
                               ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                               : 'border-gray-200/80 dark:border-white/[0.12] bg-white dark:bg-white/[0.06] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.1]'
                           }`}
              >
                <SlidersHorizontal className="h-[16px] w-[16px] sm:h-[15px] sm:w-[15px]" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-gray-900 text-[11px] font-semibold text-gray-900 dark:text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
              <div className="p-4 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white">Filters</h3>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* City Filter */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                  <div className="relative">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 pr-10 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-[14px] text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none"
                    >
                      <option value="">All Cities</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 pr-10 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-[14px] text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Toggle Filters */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-red-500" />
                      <span className="text-[14px] text-gray-700 dark:text-gray-300">Michelin Starred</span>
                    </div>
                    <button
                      onClick={() => setMichelinOnly(!michelinOnly)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        michelinOnly
                          ? 'bg-gray-900 dark:bg-white'
                          : 'bg-gray-200 dark:bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-gray-900 rounded-full transition-transform shadow-sm ${
                          michelinOnly ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span className="text-[14px] text-gray-700 dark:text-gray-300">Editor&apos;s Pick</span>
                    </div>
                    <button
                      onClick={() => setCrownOnly(!crownOnly)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        crownOnly
                          ? 'bg-gray-900 dark:bg-white'
                          : 'bg-gray-200 dark:bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-gray-900 rounded-full transition-transform shadow-sm ${
                          crownOnly ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>
            </PopoverContent>
          </Popover>

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
