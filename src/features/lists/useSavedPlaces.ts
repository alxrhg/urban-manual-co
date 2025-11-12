import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';

export interface SavedPlaceWithDestination {
  id: number;
  destinationSlug: string;
  savedAt: string;
  notes?: string | null;
  destination?: Pick<Destination, 'slug' | 'name' | 'city' | 'category' | 'image'> | null;
}

interface UseSavedPlacesOptions {
  userId?: string;
}

type SavedPlaceRow = {
  id: number;
  destination_slug: string;
  notes: string | null;
  saved_at: string;
};

type DestinationRow = Pick<Destination, 'slug' | 'name' | 'city' | 'category' | 'image'>;

export function useSavedPlaces(options: UseSavedPlacesOptions = {}) {
  const { userId } = options;
  const [places, setPlaces] = useState<SavedPlaceWithDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlaces = useCallback(async () => {
    if (!userId) {
      setPlaces([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Supabase client unavailable');
      }

      const { data: saved, error: savedError } = await supabase
        .from('saved_places')
        .select('id, destination_slug, notes, saved_at')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (savedError) throw savedError;

      const rows: SavedPlaceRow[] = (saved || []) as SavedPlaceRow[];
      const slugs = Array.from(
        new Set(rows.map((row) => row.destination_slug).filter(Boolean))
      );

      let destinationsBySlug = new Map<
        string,
        Pick<Destination, 'slug' | 'name' | 'city' | 'category' | 'image'>
      >();

      if (slugs.length > 0) {
        const { data: destinations, error: destinationsError } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image')
          .in('slug', slugs);

        if (destinationsError) throw destinationsError;

        destinationsBySlug = new Map(
          (destinations || []).map((destination) => {
            const typedDestination = destination as DestinationRow;
            return [
              typedDestination.slug,
              {
                slug: typedDestination.slug,
                name: typedDestination.name,
                city: typedDestination.city,
                category: typedDestination.category,
                image: typedDestination.image,
              } as DestinationRow,
            ];
          })
        );
      }

      setPlaces(
        rows.map((row) => ({
          id: row.id,
          destinationSlug: row.destination_slug,
          savedAt: row.saved_at,
          notes: row.notes,
          destination: destinationsBySlug.get(row.destination_slug) || null,
        }))
      );
    } catch (err) {
      console.error('Error loading saved places:', err);
      setError(err instanceof Error ? err : new Error('Failed to load saved places'));
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const value = useMemo(
    () => ({
      places,
      loading,
      error,
      refresh: fetchPlaces,
    }),
    [places, loading, error, fetchPlaces]
  );

  return value;
}
