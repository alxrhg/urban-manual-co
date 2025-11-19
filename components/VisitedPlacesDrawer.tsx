'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { EnhancedVisitedTab } from '@/components/EnhancedVisitedTab';
import { Loader2, AlertCircle } from 'lucide-react';
import { useDrawer } from '@/contexts/DrawerContext';

const LOADING_TIMEOUT = 10000; // 10 seconds

export function VisitedPlacesDrawer() {
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const isOpen = isDrawerOpen('visited-places');
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisitedPlaces = useCallback(async () => {
    if (!user) {
      setVisitedPlaces([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const supabaseClient = createClient();
      if (!supabaseClient) {
        throw new Error('Failed to initialize database connection');
      }

      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), LOADING_TIMEOUT);
      });

      const fetchPromise = (async () => {
        const { data: visitedResult, error } = await supabaseClient
          .from('visited_places')
          .select('destination_slug, visited_at, rating, notes')
          .eq('user_id', user.id)
          .order('visited_at', { ascending: false });

        if (error) throw error;

        if (visitedResult && visitedResult.length > 0) {
          const slugs = visitedResult.map((item: any) => item.destination_slug);
          const { data: destData } = await supabaseClient
            .from('destinations')
            .select('slug, name, city, category, image')
            .in('slug', slugs);

          if (destData) {
            const mapped = visitedResult.map((item: any) => {
              const dest = destData.find((d: any) => d.slug === item.destination_slug);
              return dest ? {
                destination_slug: item.destination_slug,
                visited_at: item.visited_at,
                rating: item.rating,
                notes: item.notes,
                destination: {
                  name: dest.name,
                  city: dest.city,
                  category: dest.category,
                  image: dest.image
                }
              } : null;
            }).filter((item: any) => item !== null);
            setVisitedPlaces(mapped);
          } else {
            setVisitedPlaces([]);
          }
        } else {
          setVisitedPlaces([]);
        }
      })();

      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error: any) {
      console.error('Error fetching visited places:', error);
      setError(error.message || 'Failed to load visited places. Please try again.');
      setVisitedPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchVisitedPlaces();
    } else {
      // Reset state when drawer closes
      setError(null);
    }
  }, [isOpen, fetchVisitedPlaces]);

  const content = (
    <div className="px-6 py-6">
      {loading ? (
        <div className="text-center py-12 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading visited places...</p>
          {/* Skeleton loader */}
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Failed to load</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{error}</p>
          </div>
          <button
            onClick={fetchVisitedPlaces}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            Try Again
          </button>
        </div>
      ) : (
        <EnhancedVisitedTab 
          visitedPlaces={visitedPlaces} 
          onPlaceAdded={fetchVisitedPlaces}
        />
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeDrawer}
      title="Visited Places"
    >
      {content}
    </Drawer>
  );
}

