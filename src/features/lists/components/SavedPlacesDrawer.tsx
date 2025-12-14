'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/ui/Drawer';
import { Loader2, Bookmark, ChevronLeft, X, ArrowRight } from 'lucide-react';
import { HorizontalDestinationCard } from '@/components/HorizontalDestinationCard';
import type { Destination } from '@/types/destination';

interface SavedPlace {
  destination_slug: string;
  destination: Destination;
}

export function SavedPlacesDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer, goBack, canGoBack } = useDrawer();
  const isOpen = isDrawerOpen('saved-places');
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSavedPlaces = useCallback(async () => {
    if (!user) {
      setSavedPlaces([]);
      return;
    }

    setLoading(true);
    try {
      const supabaseClient = createClient();
      const { data: savedResult } = await supabaseClient
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      if (savedResult && savedResult.length > 0) {
        const slugs = savedResult.map((item: { destination_slug: string }) => item.destination_slug);
        const { data: destData } = await supabaseClient
          .from('destinations')
          .select('*')
          .in('slug', slugs);

        if (destData) {
          const mapped = savedResult
            .map((item: { destination_slug: string }) => {
              const dest = destData.find((d: Destination) => d.slug === item.destination_slug);
              return {
                destination_slug: item.destination_slug,
                destination: dest as Destination | null,
              };
            })
            // Filter out items where destination wasn't found to prevent count mismatch
            .filter((item): item is SavedPlace =>
              item.destination !== null && item.destination !== undefined
            );
          setSavedPlaces(mapped);
        }
      } else {
        setSavedPlaces([]);
      }
    } catch (error) {
      console.error('Error fetching saved places:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchSavedPlaces();
    }
  }, [isOpen, fetchSavedPlaces]);

  const handleSelectPlace = (slug: string) => {
    closeDrawer();
    setTimeout(() => router.push(`/destination/${slug}`), 200);
  };

  const handleClose = canGoBack ? goBack : closeDrawer;

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} position="right">
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-6 sm:pt-5 pb-4">
          <div className="flex items-center gap-3">
            {canGoBack ? (
              <button
                onClick={goBack}
                className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-gray-800 active:bg-stone-200 dark:active:bg-gray-700 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-stone-600 dark:text-gray-400" />
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-stone-100 dark:bg-gray-800">
                <Bookmark className="w-5 h-5 text-stone-600 dark:text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-lg font-semibold text-stone-900 dark:text-white">
                Saved
              </h1>
              <p className="text-sm sm:text-xs text-stone-500 dark:text-gray-400">
                {savedPlaces.length} {savedPlaces.length === 1 ? 'place' : 'places'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 sm:p-2 rounded-full bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-700 hover:text-stone-900 dark:hover:text-white active:scale-95 transition-all min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-safe">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-16">
              <Loader2 className="w-8 h-8 sm:w-6 sm:h-6 animate-spin text-stone-300 dark:text-gray-600" />
              <p className="mt-4 text-base sm:text-sm text-stone-500 dark:text-gray-400">
                Loading saved places...
              </p>
            </div>
          ) : savedPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-16 px-8 text-center">
              <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <Bookmark className="w-9 h-9 sm:w-7 sm:h-7 text-stone-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg sm:text-base font-semibold text-stone-900 dark:text-white mb-2">
                No saved places yet
              </h3>
              <p className="text-base sm:text-sm text-stone-500 dark:text-gray-400 max-w-[240px]">
                Tap the bookmark icon on any place to save it for later
              </p>
            </div>
          ) : (
            <div className="px-4 sm:px-5 space-y-3 pb-4">
              {savedPlaces.map((place) => (
                <HorizontalDestinationCard
                  key={place.destination_slug}
                  destination={place.destination}
                  onClick={() => handleSelectPlace(place.destination_slug)}
                  showBadges={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {savedPlaces.length > 0 && (
          <div className="px-5 sm:px-6 py-4 pb-safe border-t border-stone-100 dark:border-gray-900">
            <button
              onClick={() => {
                closeDrawer();
                router.push('/account?tab=saved');
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl text-base sm:text-sm font-medium text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-800 active:bg-stone-200 dark:active:bg-gray-700 transition-colors min-h-[52px] sm:min-h-[44px]"
            >
              View all saved places
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
