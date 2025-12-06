import { Suspense } from 'react';
import { Metadata } from 'next';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';
import { ServerDestinationGrid } from '@/components/homepage/ServerDestinationGrid';
import { ClientGridWrapper } from '@/components/homepage/ClientGridWrapper';
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/metadata';
import { InstantGridSkeleton } from '@/components/homepage/InstantGridSkeleton';
import InteractiveHero from '@/components/homepage/InteractiveHero';
import NavigationBar from '@/components/homepage/NavigationBar';

/**
 * Homepage - Progressive Loading Architecture
 *
 * Key insight: Render actual content on server, not skeletons.
 *
 * Architecture:
 * 1. Server renders hero + grid with REAL DATA immediately
 * 2. Client components hydrate in background for interactivity
 * 3. No waiting for JS - content is visible instantly
 *
 * This eliminates the "stuck" feeling because users see real
 * content immediately, not a skeleton waiting for JS.
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

/**
 * Server-rendered destination grid
 * This is the main content that users want to see
 */
async function DestinationGridSection() {
  const { destinations } = await prefetchHomepageData();

  return (
    <ClientGridWrapper destinations={destinations}>
      <ServerDestinationGrid destinations={destinations} limit={28} />
    </ClientGridWrapper>
  );
}

export default async function HomePage() {
  // Fetch data on server - this is cached via ISR
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

      <main className="relative min-h-screen dark:text-white">
        <h1 className="sr-only">
          Discover the World's Best Hotels, Restaurants & Travel Destinations - The Urban Manual
        </h1>

        {/* Hero Section - Renders immediately with real data */}
        <section className="min-h-[50vh] flex flex-col px-6 md:px-10 py-10 pb-6 md:pb-10">
          <div className="w-full flex md:justify-start flex-1 items-center">
            <InteractiveHero
              cities={cities}
              categories={categories}
              initialDestinations={destinations}
            />
          </div>
        </section>

        {/* Content Section */}
        <div className="w-full px-6 md:px-10 mt-8">
          <div className="max-w-[1800px] mx-auto">
            {/* Navigation bar */}
            <NavigationBar />

            {/* Grid - Server rendered with real data */}
            <Suspense fallback={<InstantGridSkeleton count={21} />}>
              <DestinationGridSection />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
