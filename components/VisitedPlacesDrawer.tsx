'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { Loader2, MapPin, ChevronLeft } from 'lucide-react';
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
        const slugs = visitedResult.map((item: any) => item.destination_slug);
        const { data: destData } = await supabaseClient
          .from('destinations')
          .select('*') // Fetch full destination details
          .in('slug', slugs);

        if (destData) {
          const mapped = visitedResult.map((item: any) => {
            const dest = destData.find((d: any) => d.slug === item.destination_slug);
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

  const backButton = canGoBack ? (
    <button
      onClick={goBack}
      className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-xl sm:rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-200 dark:active:bg-stone-700 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
    >
      <ChevronLeft className="h-5 w-5 text-stone-600 dark:text-stone-400" />
    </button>
  ) : (
    <div className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-xl sm:rounded-full bg-stone-100 dark:bg-stone-800">
      <MapPin className="h-5 w-5 sm:h-4 sm:w-4 text-stone-500" />
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={canGoBack ? goBack : closeDrawer} position="right">
      <DrawerHeader
        title="Visited Places"
        subtitle={`${visitedPlaces.length} places`}
        leftAccessory={backButton}
        bordered={false}
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-24 pb-safe custom-scrollbar">
        {loading ? (
          <DrawerSection>
            <div className="flex flex-col items-center justify-center py-16 sm:py-12">
              <Loader2 className="h-7 w-7 sm:h-6 sm:w-6 animate-spin text-stone-400" />
              <p className="mt-3 text-base sm:text-sm text-stone-500">Loading visited places...</p>
            </div>
          </DrawerSection>
        ) : visitedPlaces.length === 0 ? (
          <DrawerSection>
            <div className="text-center py-16 sm:py-12 px-5 sm:px-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/50">
              <MapPin className="h-10 w-10 sm:h-8 sm:w-8 text-stone-400 mx-auto mb-4 sm:mb-3" />
              <p className="text-base sm:text-sm font-medium text-stone-900 dark:text-white">No visited places yet</p>
              <p className="text-sm sm:text-xs text-stone-500 dark:text-stone-400 mt-1.5 sm:mt-1">
                Track everywhere you&apos;ve been
              </p>
            </div>
          </DrawerSection>
        ) : (
          <div className="px-4 space-y-3">
            {visitedPlaces.map((place) => (
              place.destination && (
                <div key={place.destination_slug} className="relative">
                  <HorizontalDestinationCard
                    destination={place.destination}
                    onClick={() => handleSelectPlace(place.destination_slug)}
                    showBadges={true}
                  />
                  {place.visited_at && (
                    <div className="absolute top-3 right-3 text-[11px] sm:text-[10px] text-stone-400 font-medium bg-white/80 dark:bg-stone-950/50 backdrop-blur-sm px-2 sm:px-1.5 py-1 sm:py-0.5 rounded-lg sm:rounded-md">
                      {new Date(place.visited_at).getFullYear()}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        )}
      </div>

      <DrawerActionBar>
        <button
          onClick={() => {
            closeDrawer();
            router.push('/account?tab=visited');
          }}
          className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl sm:rounded-xl px-4 py-4 sm:py-3 text-base sm:text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity min-h-[56px] sm:min-h-[44px]"
        >
          View Full History
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
