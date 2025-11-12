import { MetadataRoute } from 'next';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { Destination } from '@/types/destination';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Determine base URL based on environment
  // Use VERCEL_URL for preview deployments, otherwise use custom domain
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'https://www.urbanmanual.co';

  const currentDate = new Date().toISOString();

  let destinationData: Destination[] = [];
  let cities: string[] = [];
  let collections: Array<{ id: string; updated_at: string | null }> = [];
  let lists: Array<{ id: string; updated_at: string | null }> = [];
  let trips: Array<{ id: string; updated_at: string | null }> = [];

  try {
    const serviceClient = createServiceRoleClient();

    const [destinationResult, collectionResult, listResult, tripResult] = await Promise.all([
      serviceClient.from('destinations').select('slug, city, category').order('slug'),
      serviceClient
        .from('collections')
        .select('id, updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false }),
      serviceClient
        .from('lists')
        .select('id, updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false }),
      serviceClient
        .from('trips')
        .select('id, updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false }),
    ]);

    if (destinationResult.error) {
      console.warn('Sitemap: Could not fetch destinations from Supabase:', destinationResult.error.message);
    } else if (destinationResult.data) {
      destinationData = destinationResult.data as Destination[];
      cities = Array.from(new Set(destinationData.map(d => d.city)));
    }

    if (collectionResult.error) {
      console.warn('Sitemap: Could not fetch collections for sitemap:', collectionResult.error.message);
    } else if (collectionResult.data) {
      collections = collectionResult.data as Array<{ id: string; updated_at: string | null }>;
    }

    if (listResult.error) {
      console.warn('Sitemap: Could not fetch lists for sitemap:', listResult.error.message);
    } else if (listResult.data) {
      lists = listResult.data as Array<{ id: string; updated_at: string | null }>;
    }

    if (tripResult.error) {
      console.warn('Sitemap: Could not fetch trips for sitemap:', tripResult.error.message);
    } else if (tripResult.data) {
      trips = tripResult.data as Array<{ id: string; updated_at: string | null }>;
    }
  } catch (error) {
    console.warn('Sitemap: Could not fetch data from Supabase:', error);
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
  const cityPages: MetadataRoute.Sitemap = cities.map(city => ({
    url: `${baseUrl}/city/${encodeURIComponent(city)}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // Destination pages - core content with high priority
  const destinationPages: MetadataRoute.Sitemap = destinationData.map(dest => {
    // Higher priority for featured destinations (restaurants, cafes, bars)
    const isPrimaryCategory = ['restaurant', 'cafe', 'bar', 'hotel'].includes(dest.category?.toLowerCase() || '');

    return {
      url: `${baseUrl}/destination/${dest.slug}`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: isPrimaryCategory ? 0.75 : 0.65,
    };
  });

  // Legal/static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const collectionPages: MetadataRoute.Sitemap = collections.map(collection => ({
    url: `${baseUrl}/collection/${collection.id}`,
    lastModified: collection.updated_at || currentDate,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const listPages: MetadataRoute.Sitemap = lists.map(list => ({
    url: `${baseUrl}/lists/${list.id}`,
    lastModified: list.updated_at || currentDate,
    changeFrequency: 'weekly',
    priority: 0.55,
  }));

  const tripPages: MetadataRoute.Sitemap = trips.map(trip => ({
    url: `${baseUrl}/trips/${trip.id}`,
    lastModified: trip.updated_at || currentDate,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [
    ...mainPages,
    ...featurePages,
    ...cityPages,
    ...destinationPages,
    ...collectionPages,
    ...listPages,
    ...tripPages,
    ...staticPages,
  ];
}
