import { Suspense } from 'react';
import { Metadata } from 'next';
import HomePageClient from './page-client';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';
import { InstantGridSkeleton } from '@/components/homepage/InstantGridSkeleton';
import { ServerDestinationGrid } from '@/components/homepage/ServerDestinationGrid';
import { ClientGridWrapper } from '@/components/homepage/ClientGridWrapper';
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/metadata';

/**
 * Homepage - Instant Loading Architecture
 *
 * NEW: Uses server-rendered grid for instant visual content
 *
 * Architecture:
 * 1. Static shell (skeleton) renders in <100ms
 * 2. Server-rendered grid streams with real destination data
 * 3. Client wrapper adds interactivity (click handlers)
 * 4. Full client component loads for advanced features
 *
 * Performance targets:
 * - TTFB: <100ms (static shell)
 * - FCP: <300ms (server grid visible)
 * - LCP: <800ms (images loaded)
 * - TTI: <1.5s (interactive)
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
 * Inline skeleton for instant feedback - no external dependencies
 * This renders immediately as part of the static shell
 */
function HomepageSkeleton() {
  return (
    <main className="w-full min-h-screen">
      {/* Hero Section Skeleton */}
      <section className="min-h-[50vh] flex flex-col px-6 md:px-10 py-10 pb-6 md:pb-10">
        <div className="w-full flex md:justify-start flex-1 items-center">
          <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl">
            {/* Greeting skeleton */}
            <div className="space-y-3 mb-8">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
            </div>

            {/* Search input skeleton */}
            <div className="h-12 w-full max-w-xl bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse mb-8" />

            {/* City filter skeleton */}
            <div className="flex flex-wrap gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-6 w-16 bg-gray-100 dark:bg-gray-900 rounded animate-pulse"
                />
              ))}
            </div>

            {/* Category filter skeleton */}
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-6 w-20 bg-gray-100 dark:bg-gray-900 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <div className="w-full px-6 md:px-10 mt-8">
        <div className="max-w-[1800px] mx-auto">
          {/* Navigation bar skeleton */}
          <div className="flex justify-end gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-11 w-24 bg-gray-100 dark:bg-gray-900 rounded-full animate-pulse"
              />
            ))}
          </div>

          {/* Grid skeleton */}
          <InstantGridSkeleton count={21} />
        </div>
      </div>
    </main>
  );
}

/**
 * Grid skeleton for the server grid loading state
 */
function GridLoadingSkeleton() {
  return (
    <div className="w-full px-6 md:px-10">
      <div className="max-w-[1800px] mx-auto">
        <InstantGridSkeleton count={21} />
      </div>
    </div>
  );
}

/**
 * Server-rendered grid with real destination data
 * Streams immediately after the skeleton, before client hydration
 */
async function ServerRenderedGrid() {
  const { destinations } = await prefetchHomepageData();

  // Render grid on server - visible instantly, no JS required
  return (
    <ClientGridWrapper destinations={destinations}>
      <ServerDestinationGrid destinations={destinations} limit={28} />
    </ClientGridWrapper>
  );
}

/**
 * Full homepage content with all client features
 * Loads after the server grid is visible
 */
async function HomepageContent() {
  const { destinations, cities, categories, trending } =
    await prefetchHomepageData();

  return (
    <HomePageClient
      initialDestinations={destinations}
      initialCities={cities}
      initialCategories={categories}
      initialTrending={trending}
    />
  );
}

export default function HomePage() {
  // Generate structured data for SEO
  const organizationSchema = generateOrganizationSchema();
  const webSiteSchema = generateWebSiteSchema();

  return (
    <>
      {/* Organization Schema - helps search engines understand the brand */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />

      {/* WebSite Schema with SearchAction - enables sitelinks searchbox in SERP */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteSchema),
        }}
      />

      {/*
        Two-phase loading:
        1. HomepageSkeleton shows instantly (static shell)
        2. HomepageContent streams in with real data + full interactivity

        The HomepageContent includes the full client component which
        renders the complete homepage with search, filters, and grid.
      */}
      <Suspense fallback={<HomepageSkeleton />}>
        <HomepageContent />
      </Suspense>
    </>
  );
}
