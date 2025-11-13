import type { Destination } from '@/types/destination';
import type { UserProfile } from '@/types/personalization';
import { createServiceRoleClient } from '@/lib/supabase-server';

export type FilterRow = { city: string | null; category: string | null };

function getAdminClient() {
  return createServiceRoleClient();
}

export async function getUserProfileById(userId: string) {
  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as UserProfile | null;
}

export async function getVisitedSlugsForUser(userId: string) {
  const adminClient = getAdminClient();
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
}

export async function getFilterRows(limit = 1000) {
  const adminClient = getAdminClient();
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
}

export async function getHomepageDestinations(limit = 500) {
  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from('destinations')
    .select('slug, name, city, neighborhood, category, micro_description, description, content, image, michelin_stars, crown, tags, parent_destination_id, opening_hours_json, timezone_id, utc_offset')
    .is('parent_destination_id', null)
    .limit(limit)
    .order('name');

  if (error) {
    throw error;
  }

  return (data ?? []) as Destination[];
}
