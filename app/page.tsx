import { Metadata } from 'next';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';
import { generateHomeBreadcrumb } from '@/lib/metadata';
import { HomepageDataProvider } from '@/features/homepage/components/HomepageDataProvider';
import { HomepageContent } from '@/features/homepage/components/HomepageContent';
import { AISearchChatWrapper } from '@/features/homepage/components/AISearchChatWrapper';
import InteractiveHero from '@/features/homepage/components/InteractiveHero';
import NavigationBar from '@/features/homepage/components/NavigationBar';
import { DiscoverySections } from '@/features/homepage/components/DiscoverySections';

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

  // Generate homepage breadcrumb schema for SEO
  // Note: Organization and WebSite schemas are now in layout.tsx for site-wide presence
  const breadcrumbSchema = generateHomeBreadcrumb();

  return (
    <>
      {/* Homepage Breadcrumb Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
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

          {/* Hero Section - Compact with search and filters */}
          <section className="flex flex-col pl-6 md:pl-10 pr-0 pt-6 pb-4 md:pt-8 md:pb-6">
            <div className="w-full flex md:justify-start items-center">
              <InteractiveHero />
            </div>
          </section>

          {/* Discovery Sections - Trending, Near You, Personalized */}
          <DiscoverySections />

          {/* Content Section - All destinations grid */}
          <div className="w-full px-4 sm:px-6 md:px-10">
            <div className="max-w-[1800px] mx-auto">
              {/* Section Header with Navigation */}
              <div className="mb-4">
                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight mb-4 px-0">
                  All Destinations
                </h2>
                <NavigationBar />
              </div>

              {/* Grid or Map view - switches based on viewMode */}
              <HomepageContent />
            </div>
          </div>
        </main>

        {/* Destination Drawer - now handled by IntelligentDrawer in layout.tsx */}

        {/* AI Search Chat - modal chat interface */}
        <AISearchChatWrapper />
      </HomepageDataProvider>
    </>
  );
}
