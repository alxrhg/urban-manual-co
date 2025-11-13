'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { EnhancedVisitedTab } from '@/components/EnhancedVisitedTab';

interface VisitedPlacesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VisitedPlacesDrawer({ isOpen, onClose }: VisitedPlacesDrawerProps) {
  const { user } = useAuth();
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisitedPlaces = useCallback(async () => {
    if (!user) {
      setVisitedPlaces([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

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
    } catch (error) {
      console.error('Error fetching visited places:', error);
      setVisitedPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchVisitedPlaces();
    }
  }, [isOpen, fetchVisitedPlaces]);

  const content = (
    <div className="px-6 py-6">
      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
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
      onClose={onClose}
      title="Visited Places"
    >
      {content}
    </Drawer>
  );
}

