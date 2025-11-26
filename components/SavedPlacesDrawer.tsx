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
import { Loader2, Bookmark, ChevronLeft } from 'lucide-react';
import { HorizontalDestinationCard } from '@/components/HorizontalDestinationCard';
import type { Destination } from '@/types/destination';

interface SavedPlace {
  destination_slug: string;
  destination: Destination | null;
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
        const slugs = savedResult.map((item: any) => item.destination_slug);
        const { data: destData } = await supabaseClient
          .from('destinations')
          .select('*') // Fetch full destination details for card
          .in('slug', slugs);

        if (destData) {
          const mapped = savedResult.map((item: any) => {
            const dest = destData.find((d: any) => d.slug === item.destination_slug);
            return {
              destination_slug: item.destination_slug,
              destination: dest as Destination,
            };
          });
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

  const backButton = canGoBack ? (
    <button
      onClick={goBack}
      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    </button>
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
      <Bookmark className="h-4 w-4 text-gray-500" />
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={canGoBack ? goBack : closeDrawer} position="right">
      <DrawerHeader
        title="Saved Places"
        subtitle={`${savedPlaces.length} places`}
        leftAccessory={backButton}
        bordered={false}
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-24 custom-scrollbar">
        {loading ? (
          <DrawerSection>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Loading saved places...</p>
            </div>
          </DrawerSection>
        ) : savedPlaces.length === 0 ? (
          <DrawerSection>
            <div className="text-center py-12 px-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
              <Bookmark className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">No saved places yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Save places you want to visit later
              </p>
            </div>
          </DrawerSection>
        ) : (
          <div className="px-4 space-y-3">
            {savedPlaces.map((place) => (
              place.destination && (
                <HorizontalDestinationCard
                  key={place.destination_slug}
                  destination={place.destination}
                  onClick={() => handleSelectPlace(place.destination_slug)}
                  showBadges={true}
                />
              )
            ))}
          </div>
        )}
      </div>

      <DrawerActionBar>
        <button
          onClick={() => {
            closeDrawer();
            router.push('/account?tab=saved');
          }}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-xl px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          View Full List
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
