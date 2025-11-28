'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { Loader2, MapPin, ChevronLeft, X, ArrowRight } from 'lucide-react';
import { HorizontalDestinationCard } from '@/components/HorizontalDestinationCard';
import type { Destination } from '@/types/destination';

interface VisitedPlace {
  destination_slug: string;
  visited_at?: string;
  destination: Destination | null;
}

export function VisitedPlacesDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer, goBack, canGoBack } = useDrawer();
  const isOpen = isDrawerOpen('visited-places');
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVisitedPlaces = useCallback(async () => {
    if (!user) {
      setVisitedPlaces([]);
      return;
    }

    setLoading(true);
    try {
      const supabaseClient = createClient();
      const { data: visitedResult } = await supabaseClient
        .from('visited_places')
        .select('destination_slug, visited_at')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false });

      if (visitedResult && visitedResult.length > 0) {
        const slugs = visitedResult.map((item: { destination_slug: string }) => item.destination_slug);
        const { data: destData } = await supabaseClient
          .from('destinations')
          .select('*')
          .in('slug', slugs);

        if (destData) {
          const mapped = visitedResult.map((item: { destination_slug: string; visited_at?: string }) => {
            const dest = destData.find((d: Destination) => d.slug === item.destination_slug);
            return {
              destination_slug: item.destination_slug,
              visited_at: item.visited_at,
              destination: dest as Destination,
            };
          });
          setVisitedPlaces(mapped);
        }
      } else {
        setVisitedPlaces([]);
      }
    } catch (error) {
      console.error('Error fetching visited places:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchVisitedPlaces();
    }
  }, [isOpen, fetchVisitedPlaces]);

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
                <MapPin className="w-5 h-5 text-stone-600 dark:text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-lg font-semibold text-stone-900 dark:text-white">
                Visited
              </h1>
              <p className="text-sm sm:text-xs text-stone-500 dark:text-gray-400">
                {visitedPlaces.length} {visitedPlaces.length === 1 ? 'place' : 'places'}
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
                Loading visited places...
              </p>
            </div>
          ) : visitedPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-16 px-8 text-center">
              <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <MapPin className="w-9 h-9 sm:w-7 sm:h-7 text-stone-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg sm:text-base font-semibold text-stone-900 dark:text-white mb-2">
                No visited places yet
              </h3>
              <p className="text-base sm:text-sm text-stone-500 dark:text-gray-400 max-w-[240px]">
                Mark places as visited to keep track of your travel history
              </p>
            </div>
          ) : (
            <div className="px-4 sm:px-5 space-y-3 pb-4">
              {visitedPlaces.map((place) => (
                place.destination && (
                  <div key={place.destination_slug} className="relative">
                    <HorizontalDestinationCard
                      destination={place.destination}
                      onClick={() => handleSelectPlace(place.destination_slug)}
                      showBadges={true}
                    />
                    {place.visited_at && (
                      <div className="absolute top-2.5 right-2.5 text-[11px] sm:text-[10px] font-medium text-stone-500 dark:text-gray-400 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                        {new Date(place.visited_at).getFullYear()}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {visitedPlaces.length > 0 && (
          <div className="px-5 sm:px-6 py-4 pb-safe border-t border-stone-100 dark:border-gray-900">
            <button
              onClick={() => {
                closeDrawer();
                router.push('/account?tab=visited');
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl text-base sm:text-sm font-medium text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-800 active:bg-stone-200 dark:active:bg-gray-700 transition-colors min-h-[52px] sm:min-h-[44px]"
            >
              View full history
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
