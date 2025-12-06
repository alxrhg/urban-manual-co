import React, { Suspense } from 'react';
import { Metadata } from 'next';
import HomePageClient from './page-client';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';

/**
 * Homepage - Highest Performance Architecture
 *
 * Uses Next.js 16 best practices:
 * - Partial Prerendering (PPR): Static shell renders instantly
 * - ISR: Background revalidation every 5 minutes
 * - Server-side data fetching with caching
 * - Streaming with Suspense boundaries
 *
 * Performance targets:
 * - TTFB: <100ms (static shell)
 * - FCP: <500ms
 * - LCP: <1s
 */

// ISR: Revalidate in background every 5 minutes
export const revalidate = 300;

// Allow dynamic rendering on first request (then cached via ISR)
// This ensures data is fetched when Supabase is available at runtime
// rather than at build time when credentials may not be available

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
 * Polished skeleton shimmer component for elegant loading states
 * Uses subtle gradient animation on dark theme
 */
function ShimmerBox({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden bg-neutral-100 dark:bg-neutral-800/60 ${className}`}
      style={style}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}

/**
 * Inline skeleton for instant feedback - no external dependencies
 * This renders immediately as part of the static shell
 * Matches exact layout of HomepageContent to prevent layout shift
 */
function HomepageSkeleton() {
  return (
    <main className="w-full min-h-screen px-6 md:px-10 py-20 animate-in fade-in-0 duration-200">
      <div className="max-w-[1800px] mx-auto">
        {/* Hero/Greeting skeleton - matches GreetingHero layout */}
        <div className="mb-8 md:mb-12">
          {/* Greeting text */}
          <ShimmerBox className="h-8 md:h-10 w-48 md:w-64 rounded-lg mb-3" />
          {/* Subtext */}
          <ShimmerBox className="h-4 w-72 md:w-96 rounded-md" />
        </div>

        {/* Search input skeleton - matches search bar dimensions */}
        <div className="mb-6 md:mb-8">
          <ShimmerBox className="h-12 md:h-14 w-full max-w-2xl rounded-2xl" />
        </div>

        {/* City tabs skeleton - horizontal scrollable pills */}
        <div className="flex gap-2 mb-4 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ShimmerBox
              key={i}
              className="h-9 rounded-full flex-shrink-0"
              style={{ width: `${60 + (i % 3) * 20}px`, animationDelay: `${i * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Category filters skeleton - horizontal scrollable pills */}
        <div className="flex gap-2 mb-8 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ShimmerBox
              key={i}
              className="h-8 rounded-full flex-shrink-0"
              style={{ width: `${70 + (i % 4) * 15}px`, animationDelay: `${i * 75}ms` } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Results count skeleton */}
        <div className="flex items-center justify-between mb-6">
          <ShimmerBox className="h-5 w-32 rounded-md" />
          <ShimmerBox className="h-5 w-20 rounded-md" />
        </div>

        {/* Destination cards grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col"
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            >
              {/* Image skeleton - aspect-video to match actual cards */}
              <ShimmerBox className="aspect-video rounded-2xl mb-3" />
              {/* Title skeleton */}
              <ShimmerBox className="h-4 w-3/4 rounded-md mb-1.5" />
              {/* Description skeleton */}
              <ShimmerBox className="h-3 w-2/3 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/**
 * Async data fetching component - streams after static shell
 */
async function HomepageContent() {
  // Fetch all homepage data in parallel on the server
  // This data is cached using Next.js unstable_cache for 5 minutes
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
  return (
    <Suspense fallback={<HomepageSkeleton />}>
      <HomepageContent />
    </Suspense>
  );
}
