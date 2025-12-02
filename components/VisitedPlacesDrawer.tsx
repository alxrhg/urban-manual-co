'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MapPin, ChevronLeft, ArrowRight } from 'lucide-react';
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
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            {canGoBack ? (
              <Button variant="ghost" size="icon" onClick={goBack} className="-ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : (
              <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Visited
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {visitedPlaces.length} {visitedPlaces.length === 1 ? 'place' : 'places'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-gray-600" />
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Loading visited places...
              </p>
            </div>
          ) : visitedPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <MapPin className="w-9 h-9 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No visited places yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[240px]">
                Mark places as visited to keep track of your travel history
              </p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-4">
              {visitedPlaces.map((place) => (
                place.destination && (
                  <div key={place.destination_slug} className="relative">
                    <HorizontalDestinationCard
                      destination={place.destination}
                      onClick={() => handleSelectPlace(place.destination_slug)}
                      showBadges={true}
                    />
                    {place.visited_at && (
                      <div className="absolute top-2.5 right-2.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                        {new Date(place.visited_at).getFullYear()}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {visitedPlaces.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="ghost"
              onClick={() => {
                closeDrawer();
                router.push('/account?tab=visited');
              }}
              className="w-full"
            >
              View full history
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
