import { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';

interface DestinationRecord {
  slug: string;
  city: string;
  category: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface ListRecord {
  id: string;
  updated_at: string | null;
  created_at: string | null;
  is_public: boolean | null;
}

interface TripRecord {
  id: number | string;
  updated_at: string | null;
  created_at: string | null;
  is_public: boolean | null;
}

function normalizeDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function resolveLastModified(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const normalized = normalizeDate(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Determine base URL based on environment
  // Use VERCEL_URL for preview deployments, otherwise use custom domain
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'https://www.urbanmanual.co';

  const currentDate = new Date().toISOString();

  let destinationData: DestinationRecord[] = [];
  const cities = new Set<string>();
  const cityLastModified = new Map<string, string>();
  let publicLists: ListRecord[] = [];
  let publicTrips: TripRecord[] = [];

  try {
    const supabase = await createServerClient();

    const [destinationsResult, listsResult, tripsResult] = await Promise.allSettled([
      supabase
        .from('destinations')
        .select('slug, city, category, updated_at, created_at')
        .order('slug'),
      supabase
        .from('lists')
        .select('id, updated_at, created_at, is_public')
        .eq('is_public', true)
        .order('updated_at', { ascending: false }),
      supabase
        .from('trips')
        .select('id, updated_at, created_at, is_public')
        .eq('is_public', true)
        .order('updated_at', { ascending: false }),
    ]);

    if (destinationsResult.status === 'fulfilled') {
      const { data, error } = destinationsResult.value;
      if (error) {
        console.warn('Sitemap: Could not fetch destinations from Supabase:', error.message);
      } else {
        destinationData = ((data || []) as DestinationRecord[]).filter(dest => Boolean(dest.slug));
        destinationData.forEach(dest => {
          if (!dest.city) return;
          cities.add(dest.city);
          const lastModified = resolveLastModified(dest.updated_at, dest.created_at);
          if (!lastModified) return;

          const existing = cityLastModified.get(dest.city);
          if (!existing || new Date(lastModified).getTime() > new Date(existing).getTime()) {
            cityLastModified.set(dest.city, lastModified);
          }
        });
      }
    } else {
      console.warn('Sitemap: Destinations query failed:', destinationsResult.reason);
    }

    if (listsResult.status === 'fulfilled') {
      const { data, error } = listsResult.value;
      if (error) {
        console.warn('Sitemap: Could not fetch lists from Supabase:', error.message);
      } else {
        publicLists = ((data || []) as ListRecord[]).filter(list => list.is_public === true);
      }
    } else {
      console.warn('Sitemap: Lists query failed:', listsResult.reason);
    }

    if (tripsResult.status === 'fulfilled') {
      const { data, error } = tripsResult.value;
      if (error) {
        console.warn('Sitemap: Could not fetch trips from Supabase:', error.message);
      } else {
        publicTrips = ((data || []) as TripRecord[]).filter(trip => trip.is_public === true);
      }
    } else {
      console.warn('Sitemap: Trips query failed:', tripsResult.reason);
    }
  } catch (error) {
    console.warn('Sitemap: Could not fetch destinations from Supabase:', error);
    // This is fine during build without env vars - generate basic sitemap
  }

  // Main pages - highest priority
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/cities`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // Feature pages
  const featurePages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/lists`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/feed`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/trips`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  // City pages - important for discovery
  const cityPages: MetadataRoute.Sitemap = Array.from(cities).map(city => ({
    url: `${baseUrl}/city/${encodeURIComponent(city)}`,
    lastModified: cityLastModified.get(city) || currentDate,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // Destination pages - core content with high priority
  const destinationPages: MetadataRoute.Sitemap = destinationData.map(dest => {
    // Higher priority for featured destinations (restaurants, cafes, bars)
    const isPrimaryCategory = ['restaurant', 'cafe', 'bar', 'hotel'].includes(dest.category?.toLowerCase() || '');
    const lastModified = resolveLastModified(dest.updated_at, dest.created_at) || currentDate;

    return {
      url: `${baseUrl}/destination/${dest.slug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: isPrimaryCategory ? 0.75 : 0.65,
    };
  });

  const listPages: MetadataRoute.Sitemap = publicLists.map(list => ({
    url: `${baseUrl}/lists/${list.id}`,
    lastModified: resolveLastModified(list.updated_at, list.created_at) || currentDate,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const tripPages: MetadataRoute.Sitemap = publicTrips.map(trip => ({
    url: `${baseUrl}/trips/${trip.id}`,
    lastModified: resolveLastModified(trip.updated_at, trip.created_at) || currentDate,
    changeFrequency: 'weekly',
    priority: 0.55,
  }));

  // Legal/static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/planner`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.65,
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/recent`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/chat`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/itinerary`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.45,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.45,
    },
    {
      url: `${baseUrl}/optimize`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.4,
    },
  ];

  return [
    ...mainPages,
    ...featurePages,
    ...cityPages,
    ...destinationPages,
    ...listPages,
    ...tripPages,
    ...staticPages,
  ];
}
