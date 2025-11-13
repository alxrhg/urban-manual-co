'use server';

import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase-server';
import { Destination } from '@/types/destination';

export type DestinationDetailStatus = 'success' | 'partial' | 'not-found' | 'error';
export type DestinationDetailIssues = Partial<Record<'destination' | 'parent' | 'nested', string>>;

export interface DestinationDetailResult {
  destination: Destination | null;
  parentDestination: Destination | null;
  nestedDestinations: Destination[];
  status: DestinationDetailStatus;
  issues: DestinationDetailIssues;
}

function logDetailMetric(event: string, payload: Record<string, unknown>) {
  const message = {
    source: 'destination-detail',
    event,
    ...payload,
  };
  console[event === 'error' ? 'error' : 'warn'](JSON.stringify(message));
}

async function fetchDestination(slug: string, supabase: Awaited<ReturnType<typeof createServerClient>>) {
  return supabase
    .from('destinations')
    .select(
      `
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
        parent_destination_id
      `
    )
    .eq('slug', slug)
    .single();
}

async function fetchParentDestination(
  parentId: number | null,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<Destination | null> {
  if (!parentId) return null;
  const { data, error } = await supabase
    .from('destinations')
    .select('id, slug, name, city, category, image')
    .eq('id', parentId)
    .single();

  if (error) {
    throw error;
  }

  return (data as Destination) ?? null;
}

async function fetchNestedDestinations(
  destinationId: number | null,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<Destination[]> {
  if (!destinationId) return [];
  const { data, error } = await supabase.rpc('get_nested_destinations', {
    parent_id: destinationId,
  });

  if (error) {
    throw error;
  }

  return (data as Destination[]) ?? [];
}

async function loadDestinationDetail(slug: string): Promise<DestinationDetailResult> {
  const supabase = await createServerClient();
  const baseResult: DestinationDetailResult = {
    destination: null,
    parentDestination: null,
    nestedDestinations: [],
    issues: {},
    status: 'error',
  };

  const destinationPromise = fetchDestination(slug, supabase);
  const [destinationOutcome, parentResult, nestedResult] = await Promise.allSettled([
    destinationPromise,
    destinationPromise.then(({ data }) =>
      fetchParentDestination((data as Destination | null)?.parent_destination_id ?? null, supabase)
    ),
    destinationPromise.then(({ data }) =>
      fetchNestedDestinations((data as Destination | null)?.id ?? null, supabase)
    ),
  ]);

  if (destinationOutcome.status === 'rejected') {
    logDetailMetric('error', {
      slug,
      stage: 'destination',
      message: destinationOutcome.reason?.message || 'Destination fetch rejected',
    });
    return {
      ...baseResult,
      status: 'error',
      issues: { destination: 'Failed to load destination' },
    };
  }

  const { data: destination, error } = destinationOutcome.value;

  if (error || !destination) {
    const errorMessage = error?.message?.toLowerCase();
    const isNotFound = error?.code === 'PGRST116' || (!!errorMessage && errorMessage.includes('row not found'));
    if (isNotFound || (!error && !destination)) {
      return {
        ...baseResult,
        status: 'not-found',
        issues: { destination: 'Destination not found' },
      };
    }

    logDetailMetric('error', {
      slug,
      stage: 'destination',
      message: error?.message || 'Unknown error fetching destination',
      code: error?.code,
    });

    return {
      ...baseResult,
      status: 'error',
      issues: { destination: error?.message || 'Unknown error fetching destination' },
    };
  }

  let parentDestination: Destination | null = null;
  let nestedDestinations: Destination[] = [];
  let status: DestinationDetailStatus = 'success';
  const issues: DestinationDetailIssues = {};

  if (parentResult.status === 'fulfilled') {
    parentDestination = parentResult.value;
  } else {
    issues.parent = parentResult.reason?.message || 'Unable to load parent destination';
    status = 'partial';
    logDetailMetric('parent_failed', {
      slug,
      parentId: destination.parent_destination_id,
      message: issues.parent,
    });
  }

  if (nestedResult.status === 'fulfilled') {
    nestedDestinations = nestedResult.value;
  } else {
    issues.nested = nestedResult.reason?.message || 'Unable to load nested destinations';
    status = 'partial';
    logDetailMetric('nested_failed', {
      slug,
      destinationId: destination.id,
      message: issues.nested,
    });
  }

  return {
    destination: destination as Destination,
    parentDestination,
    nestedDestinations,
    issues,
    status,
  };
}

export async function getDestinationDetail(slug: string) {
  const cachedFetcher = unstable_cache(
    () => loadDestinationDetail(slug),
    ['destination-detail', slug],
    {
      tags: [`destination:${slug}`],
      revalidate: 60 * 10,
    }
  );

  return cachedFetcher();
}
