import type { Destination } from '@/types/destination';
import type { UserProfile } from '@/types/personalization';
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

export type FilterRow = { city: string | null; category: string | null };

// Track if we've already warned about service role key
let hasWarnedAboutServiceRoleKey = false;

/**
 * Get Supabase client, preferring service role but falling back to public client
 * Returns null only if both fail
 */
async function getSupabaseClient(): Promise<SupabaseClient | null> {
  // Check if service role key is valid before creating client
  const serviceRoleKey = 
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  
  const isServiceRoleValid = serviceRoleKey && 
    serviceRoleKey.length >= 50 && 
    !serviceRoleKey.includes('placeholder') &&
    !serviceRoleKey.includes('invalid');
  
  if (isServiceRoleValid) {
    try {
      const serviceClient = createServiceRoleClient();
      // If service client is valid, reset warning flag
      if (serviceClient && !(serviceClient as any).url?.includes('placeholder')) {
        hasWarnedAboutServiceRoleKey = false;
      }
      return serviceClient;
    } catch (error: any) {
      if (!hasWarnedAboutServiceRoleKey) {
        console.warn('[Homepage Loaders] Service role client creation failed, trying public client:', error?.message);
        hasWarnedAboutServiceRoleKey = true;
      }
    }
  } else {
    // Only warn once per process
    if (!hasWarnedAboutServiceRoleKey) {
      // Only log in development to reduce noise in production
      if (process.env.NODE_ENV === 'development') {
        console.info('[Homepage Loaders] Service role key not configured, using public client (RLS-enabled)');
      }
      hasWarnedAboutServiceRoleKey = true;
    }
  }
  
  // Fall back to public client
  try {
    return await createServerClient();
  } catch (error: any) {
    console.error('[Homepage Loaders] Public client also failed:', error?.message);
    return null;
  }
}

export async function getUserProfileById(userId: string) {
  const client = await getSupabaseClient();
  if (!client) {
    return null;
  }
  
  try {
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as UserProfile | null;
  } catch (error: any) {
    // Handle network errors and placeholder client errors gracefully
    if (error?.message?.includes('placeholder') || 
        error?.message?.includes('invalid') ||
        error?.message?.includes('fetch failed') ||
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ETIMEDOUT') {
      console.warn('[Homepage Loaders] Database error fetching user profile:', error?.message);
      return null;
    }
    throw error;
  }
}

export async function getVisitedSlugsForUser(userId: string) {
  const client = await getSupabaseClient();
  if (!client) {
    return [];
  }
  
  try {
    const { data, error } = await client
      .from('visited_places')
      .select('destination_slug')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return ((data ?? []) as Array<{ destination_slug: string | null }>)
      .map(entry => entry.destination_slug)
      .filter((slug): slug is string => Boolean(slug));
  } catch (error: any) {
    // Handle network errors and placeholder client errors gracefully
    if (error?.message?.includes('placeholder') || 
        error?.message?.includes('invalid') ||
        error?.message?.includes('fetch failed') ||
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ETIMEDOUT') {
      console.warn('[Homepage Loaders] Database error fetching visited slugs:', error?.message);
      return [];
    }
    throw error;
  }
}

// Cached version of filter rows - revalidates every 5 minutes
export const getFilterRows = unstable_cache(
  async (limit = 1000): Promise<FilterRow[]> => {
    const client = await getSupabaseClient();
    if (!client) {
      return [];
    }

    try {
      const { data, error } = await client
        .from('destinations')
        .select('city, category')
        .is('parent_destination_id', null)
        .limit(limit)
        .order('city');

      if (error) {
        throw error;
      }

      return (data ?? []) as FilterRow[];
    } catch (error: any) {
      // Handle network errors and placeholder client errors gracefully
      if (error?.message?.includes('placeholder') ||
          error?.message?.includes('invalid') ||
          error?.message?.includes('fetch failed') ||
          error?.code === 'ECONNREFUSED' ||
          error?.code === 'ETIMEDOUT') {
        console.warn('[Homepage Loaders] Database error fetching filter rows:', error?.message);
        return [];
      }
      throw error;
    }
  },
  ['homepage-filter-rows'],
  { revalidate: 300, tags: ['filters'] }
);

// Cached version of homepage destinations - revalidates every 60 seconds
// OPTIMIZED: Only fetch essential fields for initial render
export const getHomepageDestinations = unstable_cache(
  async (limit = 50): Promise<Destination[]> => {
    const client = await getSupabaseClient();
    if (!client) {
      console.warn('[Homepage Loaders] No Supabase client available, returning empty destinations');
      return [];
    }

    try {
      // Only fetch essential fields for grid display - reduces payload by ~70%
      const { data, error } = await client
        .from('destinations')
        .select(`id, slug, name, city, country, category,
                 image, image_thumbnail, michelin_stars, crown,
                 rating, price_level, micro_description`)
        .is('parent_destination_id', null)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as Destination[];
    } catch (error: any) {
      // Handle network errors and placeholder client errors gracefully
      if (error?.message?.includes('placeholder') ||
          error?.message?.includes('invalid') ||
          error?.message?.includes('fetch failed') ||
          error?.code === 'ECONNREFUSED' ||
          error?.code === 'ETIMEDOUT') {
        console.warn('[Homepage Loaders] Database error fetching destinations:', error?.message);
        return [];
      }
      throw error;
    }
  },
  ['homepage-destinations-cached'],
  { revalidate: 60, tags: ['destinations'] }
);
