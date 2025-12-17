import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

interface SitemapDestination {
  slug: string;
  city: string;
  category?: string;
  last_enriched_at?: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Determine base URL based on environment
  // Use VERCEL_URL for preview deployments, otherwise use custom domain
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'https://www.urbanmanual.co';

  const currentDate = new Date().toISOString();

  let destinationData: SitemapDestination[] = [];
  let cities: string[] = [];

  try {
    // Fetch all destinations with last_enriched_at for accurate lastModified dates
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('slug, city, category, last_enriched_at')
      .order('slug');

    if (error) {
      console.warn('Sitemap: Could not fetch destinations from Supabase:', error.message);
    } else {
      destinationData = (destinations || []) as SitemapDestination[];
      // Get unique cities
      cities = Array.from(new Set(destinationData.map(d => d.city)));
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
      url: `${baseUrl}/map`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/chat`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/movements`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/architects`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Long-tail keyword pages - SEO landing pages
  const seoPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/best-michelin-restaurants`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/luxury-hotels`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/design-hotels`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/hidden-gems`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.85,
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

    // Use last_enriched_at if available, otherwise fall back to current date
    const lastModified = dest.last_enriched_at
      ? new Date(dest.last_enriched_at).toISOString()
      : currentDate;

    return {
      url: `${baseUrl}/destination/${dest.slug}`,
      lastModified,
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

  return [
    ...mainPages,
    ...featurePages,
    ...seoPages,
    ...cityPages,
    ...destinationPages,
    ...staticPages,
  ];
}
