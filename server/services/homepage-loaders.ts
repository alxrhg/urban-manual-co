import type { Destination } from '@/types/destination';
import type { UserProfile } from '@/types/personalization';
import { createServiceRoleClient } from '@/lib/supabase-server';

export type FilterRow = { city: string | null; category: string | null };

function getAdminClient() {
  try {
    return createServiceRoleClient();
  } catch (error: any) {
    // If service role client creation fails, log and return null
    // The calling functions will handle the null case
    console.warn('[Homepage Loaders] Failed to create service role client:', error?.message);
    return null as any; // Return null to prevent crashes
  }
}

export async function getUserProfileById(userId: string) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return null;
  }
  
  try {
    const { data, error } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as UserProfile | null;
  } catch (error: any) {
    // Handle various error types gracefully
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    
    if (
      errorMessage.includes('placeholder') || 
      errorMessage.includes('invalid') ||
      errorMessage.includes('fetch failed') ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ENOTFOUND' ||
      error?.name === 'TypeError'
    ) {
      return null;
    }
    throw error;
  }
}

export async function getVisitedSlugsForUser(userId: string) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return [];
  }
  
  try {
    const { data, error } = await adminClient
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
    // Handle various error types gracefully
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    
    if (
      errorMessage.includes('placeholder') || 
      errorMessage.includes('invalid') ||
      errorMessage.includes('fetch failed') ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ENOTFOUND' ||
      error?.name === 'TypeError'
    ) {
      return [];
    }
    throw error;
  }
}

export async function getFilterRows(limit = 1000) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return [];
  }
  
  try {
    const { data, error } = await adminClient
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
    // Handle various error types gracefully
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    
    if (
      errorMessage.includes('placeholder') || 
      errorMessage.includes('invalid') ||
      errorMessage.includes('fetch failed') ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ENOTFOUND' ||
      error?.name === 'TypeError'
    ) {
      return [];
    }
    throw error;
  }
}

export async function getHomepageDestinations(limit = 500) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return [];
  }
  
  try {
    const { data, error } = await adminClient
      .from('destinations')
      .select('id, slug, name, city, country, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, tags, parent_destination_id, opening_hours_json, timezone_id, utc_offset, rating, architect, design_firm_id, architectural_style, design_period, designer_name, architect_info_json, instagram_handle, instagram_url, created_at')
      .is('parent_destination_id', null)
      .limit(limit)
      .order('created_at', { ascending: false, nullsLast: true })
      .order('id', { ascending: false }); // Fallback: newer IDs (higher numbers) first

    if (error) {
      throw error;
    }

    return (data ?? []) as Destination[];
  } catch (error: any) {
    // Handle various error types gracefully
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    
    // Check for placeholder client errors, fetch failures, or connection issues
    if (
      errorMessage.includes('placeholder') || 
      errorMessage.includes('invalid') ||
      errorMessage.includes('fetch failed') ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ENOTFOUND' ||
      error?.name === 'TypeError'
    ) {
      console.warn('[Homepage Loaders] Database connection issue - returning empty destinations:', errorMessage);
      return [];
    }
    throw error;
  }
}
