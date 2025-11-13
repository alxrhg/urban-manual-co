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

const HOMEPAGE_DESTINATION_COLUMNS = [
  'slug',
  'name',
  'city',
  'country',
  'neighborhood',
  'category',
  'micro_description',
  'image',
  'primary_photo_url',
  'michelin_stars',
  'crown',
  'tags',
  'rating',
  'price_level',
  'timezone_id',
  'utc_offset',
  'opening_hours',
].join(', ');

const HOMEPAGE_FULL_DESTINATION_COLUMNS = [
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
  'primary_photo_url',
  'michelin_stars',
  'crown',
  'tags',
  'parent_destination_id',
  'opening_hours',
  'opening_hours_json',
  'timezone_id',
  'utc_offset',
  'rating',
  'price_level',
].join(', ');

const DEFAULT_HOMEPAGE_LIMIT = 250;
const MAX_HOMEPAGE_LIMIT = 500;

function normalizeLimit(limit?: number) {
  const value = typeof limit === 'number' ? limit : NaN;
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_HOMEPAGE_LIMIT;
  }
  return Math.min(MAX_HOMEPAGE_LIMIT, Math.floor(value));
}

function normalizeOffset(offset?: number) {
  const value = typeof offset === 'number' ? offset : NaN;
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

export async function getHomepageDestinations(limit = DEFAULT_HOMEPAGE_LIMIT, offset = 0) {
  const safeLimit = normalizeLimit(limit);
  const safeOffset = normalizeOffset(offset);
  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from('destinations')
    .select(HOMEPAGE_DESTINATION_COLUMNS)
    .is('parent_destination_id', null)
    .order('name')
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (error) {
    throw error;
  }

  return (data ?? []) as Destination[];
}

export async function getHomepageDestinationDetails(limit = DEFAULT_HOMEPAGE_LIMIT, offset = 0) {
  const safeLimit = normalizeLimit(limit);
  const safeOffset = normalizeOffset(offset);
  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from('destinations')
    .select(HOMEPAGE_FULL_DESTINATION_COLUMNS)
    .is('parent_destination_id', null)
    .order('name')
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (error) {
    throw error;
  }

  return (data ?? []) as Destination[];
}
