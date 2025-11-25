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
      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    </button>
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
      <MapPin className="h-4 w-4 text-gray-500" />
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

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-24 custom-scrollbar">
        {loading ? (
          <DrawerSection>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Loading visited places...</p>
            </div>
          </DrawerSection>
        ) : visitedPlaces.length === 0 ? (
          <DrawerSection>
            <div className="text-center py-12 px-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
              <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">No visited places yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                    <div className="absolute top-3 right-3 text-[10px] text-gray-400 font-medium bg-white/80 dark:bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
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
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-xl px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          View Full History
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
