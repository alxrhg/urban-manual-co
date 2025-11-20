import type { Destination } from '@/types/destination';
import type { UserProfile } from '@/types/personalization';
import { createServiceRoleClient, createServerClient } from '@/lib/supabase-server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type FilterRow = { city: string | null; category: string | null };

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
      return serviceClient;
    } catch (error: any) {
      console.warn('[Homepage Loaders] Service role client creation failed, trying public client:', error?.message);
    }
  } else {
    console.warn('[Homepage Loaders] Service role key invalid or missing, using public client');
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

export async function getFilterRows(limit = 1000) {
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
}

export async function getHomepageDestinations(limit = 5000) {
  const client = await getSupabaseClient();
  if (!client) {
    console.warn('[Homepage Loaders] No Supabase client available, returning empty destinations');
    return [];
  }
  
  try {
    const { data, error } = await client
      .from('destinations')
      .select('id, slug, name, city, country, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, tags, parent_destination_id, opening_hours_json, timezone_id, utc_offset, rating, architect, design_firm_id, architectural_style, design_period, designer_name, architect_info_json, instagram_handle, instagram_url, created_at')
      .is('parent_destination_id', null)
      .limit(limit)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }); // Fallback: newer IDs (higher numbers) first

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
}
