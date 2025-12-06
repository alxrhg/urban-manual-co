'use client';

import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import { Destination } from '@/types/destination';
import { createClient } from '@/lib/supabase/client';

/**
 * Homepage Data Provider
 *
 * Provides client-side data fetching fallback when server-side data is empty.
 * This ensures the homepage always shows content, even if SSR fails.
 *
 * Architecture:
 * 1. Server attempts to fetch data and passes it as props
 * 2. If server data is empty, this component fetches on the client
 * 3. Children receive data via context, avoiding prop drilling
 */

interface HomepageDataContextType {
  destinations: Destination[];
  cities: string[];
  categories: string[];
  isLoading: boolean;
}

const HomepageDataContext = createContext<HomepageDataContextType>({
  destinations: [],
  cities: [],
  categories: [],
  isLoading: true,
});

export function useHomepageData() {
  return useContext(HomepageDataContext);
}

interface HomepageDataProviderProps {
  children: ReactNode;
  serverDestinations: Destination[];
  serverCities: string[];
  serverCategories: string[];
}

export function HomepageDataProvider({
  children,
  serverDestinations,
  serverCities,
  serverCategories,
}: HomepageDataProviderProps) {
  const [destinations, setDestinations] = useState<Destination[]>(serverDestinations);
  const [cities, setCities] = useState<string[]>(serverCities);
  const [categories, setCategories] = useState<string[]>(serverCategories);
  const [isLoading, setIsLoading] = useState(serverDestinations.length === 0);

  // Client-side fallback fetch when server data is empty
  useEffect(() => {
    if (serverDestinations.length > 0) {
      // Server data is available, no need to fetch
      setIsLoading(false);
      return;
    }

    // Fetch data on client side
    async function fetchClientData() {
      try {
        const supabase = createClient();
        if (!supabase) {
          setIsLoading(false);
          return;
        }

        // Fetch destinations
        const { data: destData, error: destError } = await supabase
          .from('destinations')
          .select(`
            id,
            slug,
            name,
            city,
            country,
            neighborhood,
            category,
            micro_description,
            description,
            content,
            image,
            image_thumbnail,
            michelin_stars,
            crown,
            rating,
            price_level,
            tags,
            opening_hours_json,
            latitude,
            longitude
          `)
          .order('rating', { ascending: false, nullsFirst: false })
          .limit(200);

        if (!destError && destData) {
          setDestinations(destData as Destination[]);

          // Extract unique cities and categories
          const citySet = new Set<string>();
          const categorySet = new Set<string>();

          destData.forEach((dest: { city?: string | null; category?: string | null }) => {
            const city = (dest.city ?? '').toString().trim();
            const category = (dest.category ?? '').toString().trim();
            if (city) citySet.add(city);
            if (category) categorySet.add(category);
          });

          setCities(Array.from(citySet).sort());
          setCategories(Array.from(categorySet).sort());
        }
      } catch (error) {
        console.error('[Client] Error fetching homepage data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClientData();
  }, [serverDestinations]);

  return (
    <HomepageDataContext.Provider value={{ destinations, cities, categories, isLoading }}>
      {children}
    </HomepageDataContext.Provider>
  );
}

export default HomepageDataProvider;
