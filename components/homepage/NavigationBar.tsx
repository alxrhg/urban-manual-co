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

  // Top categories to show as pills
  const topCategories = useMemo(() => {
    // Show most common categories first
    const priorityCategories = ['Restaurant', 'Hotel', 'Bar', 'Cafe', 'Culture'];
    return priorityCategories.filter(cat => categories.includes(cat));
  }, [categories]);

  return (
    <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
      {/* Category Filter Pills - Larger touch targets on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('')}
          className={`flex-shrink-0 px-4 py-2.5 sm:py-2 rounded-full text-[14px] sm:text-[13px] font-medium transition-all active:scale-[0.97] ${
            !selectedCategory
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
          }`}
        >
          All
        </button>
        {topCategories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
            className={`flex-shrink-0 px-4 py-2.5 sm:py-2 rounded-full text-[14px] sm:text-[13px] font-medium transition-all active:scale-[0.97] ${
              selectedCategory === category
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            {category}
          </button>
        ))}
        <button
          onClick={() => setMichelinOnly(!michelinOnly)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-full text-[14px] sm:text-[13px] font-medium transition-all active:scale-[0.97] ${
            michelinOnly
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
          }`}
        >
          <Star className="h-3.5 w-3.5" />
          Michelin
        </button>
        <button
          onClick={() => setCrownOnly(!crownOnly)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-full text-[14px] sm:text-[13px] font-medium transition-all active:scale-[0.97] ${
            crownOnly
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
          }`}
        >
          <Crown className="h-3.5 w-3.5" />
          Crown
        </button>
      </div>

      <div className="flex justify-between items-center gap-3">
        {/* Left side - Results count and city filter */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <p className="text-[13px] text-gray-500 dark:text-gray-400 flex-shrink-0">
            {filteredDestinations.length} places
          </p>

          {/* City filter badge */}
          {selectedCity && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-[12px] text-gray-700 dark:text-gray-300 truncate max-w-[120px] sm:max-w-none">
              <span className="truncate">{selectedCity}</span>
              <button onClick={() => setSelectedCity('')} className="hover:text-gray-900 dark:hover:text-white flex-shrink-0">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {activeFilterCount > 1 && (
            <button
              onClick={clearFilters}
              className="text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* City Filter Popover */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                className={`relative flex h-[42px] sm:h-[38px] flex-shrink-0 items-center justify-center gap-1.5 sm:gap-2 rounded-full
                           border px-3 sm:px-4 text-[13px] font-medium transition-all duration-200
                           active:scale-[0.98] ${
                             selectedCity
                               ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                               : 'border-gray-200/80 dark:border-white/[0.12] bg-white dark:bg-white/[0.06] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.1]'
                           }`}
              >
                <Globe className="h-4 w-4 sm:h-[15px] sm:w-[15px]" />
                <span className="hidden sm:inline">{selectedCity || 'All Cities'}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end" sideOffset={8}>
              <div className="max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setSelectedCity(''); setFilterOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                    !selectedCity ? 'bg-gray-100 dark:bg-white/10 font-medium' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  All Cities
                </button>
                {cities.map(city => (
                  <button
                    key={city}
                    onClick={() => { setSelectedCity(city); setFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                      selectedCity === city ? 'bg-gray-100 dark:bg-white/10 font-medium' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Create Trip */}
          <button
            onClick={handleCreateTrip}
            disabled={creatingTrip}
            className="flex h-[42px] sm:h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                       bg-gray-900 dark:bg-white px-3 sm:px-4 text-[14px] sm:text-[13px] font-medium
                       text-white dark:text-gray-900
                       disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-100
                       active:scale-[0.98] active:bg-gray-700 dark:active:bg-gray-200 transition-all duration-200"
          >
            {creatingTrip ? (
              <Loader2 className="h-4 w-4 sm:h-[15px] sm:w-[15px] animate-spin" />
            ) : (
              <Plus className="h-4 w-4 sm:h-[15px] sm:w-[15px]" />
            )}
            <span className="hidden sm:inline">
              {creatingTrip ? 'Creating...' : 'Create Trip'}
            </span>
          </button>

          {/* Discover by Cities - Desktop only */}
          <Link
            href="/cities"
            className="hidden sm:flex h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                       border border-gray-200/80 dark:border-white/[0.12] bg-white dark:bg-white/[0.06]
                       px-4 text-[13px] font-medium text-gray-700 dark:text-gray-200
                       hover:bg-gray-50 dark:hover:bg-white/[0.1]
                       active:scale-[0.98] active:bg-gray-100 dark:active:bg-white/[0.15] transition-all duration-200"
          >
            <Globe className="h-[15px] w-[15px]" />
            <span>Discover by Cities</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
