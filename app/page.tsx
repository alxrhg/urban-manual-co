import { Metadata } from 'next';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/metadata';
import { HomepageDataProvider } from '@/components/homepage/HomepageDataProvider';
import { ClientDestinationGrid } from '@/components/homepage/ClientDestinationGrid';
import InteractiveHero from '@/components/homepage/InteractiveHero';
import NavigationBar from '@/components/homepage/NavigationBar';

/**
 * Homepage - Progressive Loading Architecture with Client Fallback
 *
 * Architecture:
 * 1. Server attempts to fetch and render with real data (ISR cached)
 * 2. HomepageDataProvider detects empty server data
 * 3. If empty, client-side fetch kicks in automatically
 * 4. Users always see content - either from SSR or client fetch
 *
 * Apple Design System:
 * - Clean, spacious layouts with generous whitespace
 * - SF Pro-inspired typography with tight letter-spacing
 * - Subtle, refined interactions
 * - Monochromatic palette with minimal accents
 */

// ISR: Revalidate in background every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Urban Manual - Curated Travel Destinations Worldwide',
  description:
    'Discover 897+ curated destinations worldwide. AI-powered recommendations, interactive maps, and editorial content for the modern traveler.',
  openGraph: {
    title: 'Urban Manual - Curated Travel Destinations Worldwide',
    description:
      'Discover 897+ curated destinations worldwide. AI-powered recommendations, interactive maps, and editorial content for the modern traveler.',
    url: 'https://www.urbanmanual.co',
    siteName: 'Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Urban Manual - Curated Travel Destinations Worldwide',
    description:
      'Discover 897+ curated destinations worldwide. AI-powered recommendations, interactive maps, and editorial content for the modern traveler.',
  },
};

export default async function HomePage() {
  // Fetch data on server - this is cached via ISR
  // If fetch fails or returns empty, client-side fallback will handle it
  const { destinations, cities, categories } = await prefetchHomepageData();

  // Generate structured data for SEO
  const organizationSchema = generateOrganizationSchema();
  const webSiteSchema = generateWebSiteSchema();

  return (
    <>
      {/* SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteSchema),
        }}
      />

      {/* Data Provider wraps all components needing destination data */}
      <HomepageDataProvider
        serverDestinations={destinations}
        serverCities={cities}
        serverCategories={categories}
      >
        <main className="relative min-h-screen dark:text-white">
          <h1 className="sr-only">
            Discover the World's Best Hotels, Restaurants & Travel Destinations - The Urban Manual
          </h1>

          {/* Hero Section - Apple-inspired spacious layout */}
          <section className="min-h-[50vh] flex flex-col px-6 md:px-10 py-10 pb-6 md:pb-10">
            <div className="w-full flex md:justify-start flex-1 items-center">
              <InteractiveHero />
            </div>
          </section>

          {/* Content Section */}
          <div className="w-full px-6 md:px-10 mt-8">
            <div className="max-w-[1800px] mx-auto">
              {/* Navigation bar */}
              <NavigationBar />

              {/* Grid - Uses context, handles its own loading state */}
              <ClientDestinationGrid limit={28} />
            </div>
          </div>
        </main>
      </HomepageDataProvider>
    </>
  );
}
