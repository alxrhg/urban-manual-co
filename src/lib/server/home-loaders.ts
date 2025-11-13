import { cache } from 'react';
import { createServerClient } from '@/lib/supabase-server';
import { Destination } from '@/types/destination';

const DEFAULT_LIMIT = 200;

async function fetchInitialDestinations(limit: number): Promise<Destination[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('destinations')
      .select(
        'slug, name, city, neighborhood, category, micro_description, description, content, image, michelin_stars, crown, tags, parent_destination_id, opening_hours_json, timezone_id, utc_offset'
      )
      .is('parent_destination_id', null)
      .order('name')
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data as Destination[];
  } catch (error) {
    console.warn('[home-loaders] Failed to fetch initial destinations', error);
    return [];
  }
}

async function fetchTrendingDestinations(limit: number): Promise<Destination[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .gt('trending_score', 0)
      .gte('rating', 4)
      .order('trending_score', { ascending: false })
      .order('google_trends_direction', { ascending: false })
      .order('google_trends_interest', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data as Destination[];
  } catch (error) {
    console.warn('[home-loaders] Failed to fetch trending destinations', error);
    return [];
  }
}

export const getHomePageData = cache(async () => {
  const [initialDestinations, trendingDestinations] = await Promise.all([
    fetchInitialDestinations(DEFAULT_LIMIT),
    fetchTrendingDestinations(6),
  ]);

  return { initialDestinations, trendingDestinations };
});
