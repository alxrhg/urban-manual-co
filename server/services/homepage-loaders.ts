import type { Destination } from '@/types/destination';
import type { UserProfile } from '@/types/personalization';
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

export type FilterRow = { city: string | null; category: string | null };

const HOMEPAGE_DESTINATION_BASE_COLUMNS = [
  'id',
  'slug',
  'name',
  'city',
  'country',
  'neighborhood',
  'category',
  'micro_description',
  'description',
  'content',
  'image',
  'image_thumbnail',
  'michelin_stars',
  'crown',
  'tags',
  'parent_destination_id',
  'opening_hours_json',
  'timezone_id',
  'utc_offset',
  'rating',
  'architect',
  'design_firm_id',
  'architectural_style',
  'design_period',
  'designer_name',
  'instagram_handle',
  'instagram_url',
  'created_at',
] as const;

const HOMEPAGE_DESTINATION_OPTIONAL_ARCHITECT_COLUMNS = ['architect_info_json'] as const;

function buildHomepageDestinationSelect(includeArchitectInfo: boolean) {
  return [
    ...HOMEPAGE_DESTINATION_BASE_COLUMNS,
    ...(includeArchitectInfo ? HOMEPAGE_DESTINATION_OPTIONAL_ARCHITECT_COLUMNS : []),
  ].join(', ');
}

function isMissingArchitectInfoColumnError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('architect_info_json');
}

function coerceToDestinations(rows: unknown): Destination[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows as Destination[];
}

function getAdminClient(): SupabaseClient | null {
  try {
    return createServiceRoleClient();
  } catch (error: any) {
    console.warn('[Homepage Loaders] Failed to create service role client:', error?.message);
    return null;
  }
}

async function getPublicClient(): Promise<SupabaseClient | null> {
  try {
    return await createServerClient();
  } catch (error: any) {
    console.warn('[Homepage Loaders] Failed to create public server client:', error?.message);
    return null;
  }
}

export async function getUserProfileById(userId: string) {
  const client = getAdminClient() || await getPublicClient();
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
    // If it's a placeholder client error, return null gracefully
    if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
      return null;
    }
    throw error;
  }
}

export async function getVisitedSlugsForUser(userId: string) {
  const client = getAdminClient() || await getPublicClient();
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
    // If it's a placeholder client error, return empty array gracefully
    if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
      return [];
    }
    throw error;
  }
}

export async function getFilterRows(limit = 1000) {
  const client = await getPublicClient() || getAdminClient();
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
    // If it's a placeholder client error, return empty array gracefully
    if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
      return [];
    }
    throw error;
  }
}

export async function getHomepageDestinations(limit = 500) {
  // Prefer public client for RLS-safe access, fallback to admin client if available
  let client = await getPublicClient();
  if (!client) {
    client = getAdminClient();
  }

  if (!client) {
    return [];
  }

  const executeQuery = (includeArchitectInfo: boolean) => {
    const selectColumns = buildHomepageDestinationSelect(includeArchitectInfo);
    return client!
      .from('destinations')
      .select(selectColumns)
      .is('parent_destination_id', null)
      .limit(limit)
      // Supabase TypeScript definitions do not expose `nullsLast`,
      // so we just sort descending which effectively surfaces the newest rows
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }); // Fallback: newer IDs (higher numbers) first
  };

  try {
    const { data, error } = await executeQuery(true);

    if (error) {
      if (isMissingArchitectInfoColumnError(error)) {
        console.warn(
          '[Homepage Destinations API] architect_info_json column missing, retrying without optional architect fields.',
        );
        const fallbackResult = await executeQuery(false);
        if (fallbackResult.error) {
          throw fallbackResult.error;
        }
        return coerceToDestinations(fallbackResult.data);
      }
      throw error;
    }

    return coerceToDestinations(data);
  } catch (error: any) {
    // If it's a placeholder client error, return empty array gracefully
    if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
      return [];
    }
    throw error;
  }
}

export const getCachedHomepageDestinations = unstable_cache(
  async (limit = 500) => getHomepageDestinations(limit),
  ['homepage-destinations'],
  {
    revalidate: 3600, // 1 hour cache
    tags: ['destinations']
  }
);
