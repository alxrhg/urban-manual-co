'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { EnhancedSavedTab } from '@/components/EnhancedSavedTab';

interface SavedPlacesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SavedPlacesDrawer({ isOpen, onClose }: SavedPlacesDrawerProps) {
  const { user } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPlaces = useCallback(async () => {
    if (!user) {
      setSavedPlaces([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data: savedResult, error } = await supabaseClient
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      if (error) throw error;

      if (savedResult && savedResult.length > 0) {
        const slugs = savedResult.map((item: any) => item.destination_slug);
        const { data: destData } = await supabaseClient
          .from('destinations')
          .select('slug, name, city, category, image')
          .in('slug', slugs);

        if (destData) {
          const mapped = savedResult.map((item: any) => {
            const dest = destData.find((d: any) => d.slug === item.destination_slug);
            return dest ? {
              destination_slug: dest.slug,
              destination: {
                name: dest.name,
                city: dest.city,
                category: dest.category,
                image: dest.image
              }
            } : null;
          }).filter((item: any) => item !== null);
          setSavedPlaces(mapped);
        } else {
          setSavedPlaces([]);
        }
      } else {
        setSavedPlaces([]);
      }
    } catch (error) {
      console.error('Error fetching saved places:', error);
      setSavedPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchSavedPlaces();
    }
  }, [isOpen, fetchSavedPlaces]);

  const content = (
    <div className="px-6 py-6">
      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : (
        <EnhancedSavedTab savedPlaces={savedPlaces} />
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Saved Places"
    >
      {content}
    </Drawer>
  );
}

