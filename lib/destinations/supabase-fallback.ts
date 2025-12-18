/**
 * Supabase Fallback for Destinations
 *
 * This module provides fallback functions to fetch destination data from Supabase
 * when Sanity is unavailable. Supabase serves as a backup data source and is
 * kept in sync via the Sanity → Supabase sync process.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Destination } from '@/types/destination';
import type { FetchDestinationsOptions } from './types';

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  return !!(url && url.includes('supabase') && key && key.length >= 50);
}

/**
 * Standard select fields for destination list queries
 */
const LIST_SELECT_FIELDS = `
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
`;

/**
 * Full select fields for destination detail queries
 */
const DETAIL_SELECT_FIELDS = `
  *,
  formatted_address,
  international_phone_number,
  website,
  rating,
  user_ratings_total,
  price_level,
  opening_hours_json,
  editorial_summary,
  google_name,
  place_types_json,
  utc_offset,
  vicinity,
  reviews_json,
  timezone_id,
  latitude,
  longitude,
  photos_json,
  primary_photo_url,
  photo_count,
  parent_destination_id,
  architect,
  design_firm_id,
  architectural_style,
  design_period,
  designer_name,
  architect_info_json,
  web_content_json
`;

/**
 * Fetch all destinations from Supabase (fallback)
 */
export async function fetchDestinationsFromSupabase(
  options: FetchDestinationsOptions = {}
): Promise<Destination[]> {
  const { limit = 200, city, category, orderBy = 'rating' } = options;

  if (!isSupabaseConfigured()) {
    console.log('[Supabase Fallback] Not configured, skipping fetch');
    return [];
  }

  try {
    const supabase = createServiceRoleClient();

    let query = supabase.from('destinations').select(LIST_SELECT_FIELDS);

    // Apply filters
    if (city) {
      query = query.eq('city', city);
    }

    if (category) {
      query = query.eq('category', category);
    }

    // Apply ordering
    if (orderBy === 'name') {
      query = query.order('name', { ascending: true });
    } else if (orderBy === 'created') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('rating', { ascending: false, nullsFirst: false });
    }

    // Apply limit
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase Fallback] Error fetching destinations:', error.message);
      return [];
    }

    return (data || []) as Destination[];
  } catch (error) {
    console.error('[Supabase Fallback] Exception:', error);
    return [];
  }
}

/**
 * Fetch a single destination by slug from Supabase (fallback)
 */
export async function fetchDestinationBySlugFromSupabase(
  slug: string
): Promise<Destination | null> {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase Fallback] Not configured');
    return null;
  }

  try {
    const supabase = createServiceRoleClient();

    // Try exact match first
    let { data: destination, error } = await supabase
      .from('destinations')
      .select(DETAIL_SELECT_FIELDS)
      .eq('slug', slug)
      .maybeSingle();

    // Try case-insensitive match if not found
    if (!destination && !error) {
      const { data: caseInsensitiveMatch, error: caseError } = await supabase
        .from('destinations')
        .select(DETAIL_SELECT_FIELDS)
        .ilike('slug', slug)
        .maybeSingle();

      if (caseInsensitiveMatch && !caseError) {
        destination = caseInsensitiveMatch;
      }
    }

    // Try lowercase match if still not found
    if (!destination && !error) {
      const { data: lowerMatch } = await supabase
        .from('destinations')
        .select(DETAIL_SELECT_FIELDS)
        .eq('slug', slug.toLowerCase())
        .maybeSingle();

      if (lowerMatch) {
        destination = lowerMatch;
      }
    }

    if (error) {
      console.error('[Supabase Fallback] Error:', error.message);
      return null;
    }

    return destination as Destination | null;
  } catch (error) {
    console.error('[Supabase Fallback] Exception:', error);
    return null;
  }
}

/**
 * Fetch filter options from Supabase (fallback)
 */
export async function fetchFilterOptionsFromSupabase(): Promise<{
  cities: string[];
  categories: string[];
}> {
  if (!isSupabaseConfigured()) {
    return { cities: [], categories: [] };
  }

  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('destinations')
      .select('city, category');

    if (error) {
      console.error('[Supabase Fallback] Error fetching filter options:', error.message);
      return { cities: [], categories: [] };
    }

    const destinations = data || [];
    const citySet = new Set<string>();
    const categoryLowerSet = new Set<string>();
    const categoryArray: string[] = [];

    destinations.forEach((dest: { city?: string | null; category?: string | null }) => {
      const city = (dest.city ?? '').toString().trim();
      const category = (dest.category ?? '').toString().trim();

      if (city) {
        citySet.add(city);
      }
      if (category) {
        const categoryLower = category.toLowerCase();
        if (!categoryLowerSet.has(categoryLower)) {
          categoryLowerSet.add(categoryLower);
          categoryArray.push(category);
        }
      }
    });

    return {
      cities: Array.from(citySet).sort(),
      categories: categoryArray.sort(),
    };
  } catch (error) {
    console.error('[Supabase Fallback] Exception:', error);
    return { cities: [], categories: [] };
  }
}

/**
 * Fetch related destinations from Supabase (fallback)
 */
export async function fetchRelatedDestinationsFromSupabase(
  city: string,
  currentSlug: string,
  limit: number = 6
): Promise<Destination[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('destinations')
      .select(LIST_SELECT_FIELDS)
      .eq('city', city)
      .neq('slug', currentSlug)
      .limit(limit);

    if (error) {
      console.error('[Supabase Fallback] Error fetching related:', error.message);
      return [];
    }

    return (data || []) as Destination[];
  } catch (error) {
    console.error('[Supabase Fallback] Exception:', error);
    return [];
  }
}

/**
 * Fetch nested destinations from Supabase (fallback)
 */
export async function fetchNestedDestinationsFromSupabase(
  parentId: number
): Promise<Destination[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc('get_nested_destinations', {
      parent_id: parentId,
    });

    if (error) {
      console.error('[Supabase Fallback] Error fetching nested:', error.message);
      return [];
    }

    return (data || []) as Destination[];
  } catch (error) {
    console.error('[Supabase Fallback] Exception:', error);
    return [];
  }
}

/**
 * Fetch parent destination from Supabase (fallback)
 */
export async function fetchParentDestinationFromSupabase(
  parentId: number
): Promise<Destination | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, image')
      .eq('id', parentId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase Fallback] Error fetching parent:', error.message);
      return null;
    }

    return data as Destination | null;
  } catch (error) {
    console.error('[Supabase Fallback] Exception:', error);
    return null;
  }
}
