/**
 * Homepage - Server-Side Rendered (Optimized)
 *
 * Performance optimizations:
 * - Cached data (60s for destinations, 5min for filters)
 * - Limited initial load (50 destinations)
 * - User data fetched client-side (non-blocking)
 * - Minimal destination fields (reduces payload ~70%)
 */

import { Suspense } from "react";
import { loadHomepageData } from "./loaders";
import HomepageClient from "@/components/homepage/HomepageClient";
import HomeLoading from "./loading";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Urban Manual - Curated Travel Guide to the World's Best Destinations",
  description:
    "Discover 897+ curated hotels, restaurants, and travel destinations worldwide. AI-powered recommendations and interactive maps for your next adventure.",
  openGraph: {
    title: "The Urban Manual - Curated Travel Guide",
    description:
      "Discover the world's best hotels, restaurants & travel destinations",
    url: "https://www.urbanmanual.co",
    siteName: "The Urban Manual",
    type: "website",
  },
};

// Force dynamic to ensure caching works correctly
export const dynamic = "force-dynamic";

async function HomepageContent() {
  const { destinations, cities, categories, totalCount } = await loadHomepageData();

  return (
    <HomepageClient
      initialDestinations={destinations}
      initialCities={cities}
      initialCategories={categories}
      totalCount={totalCount}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomepageContent />
    </Suspense>
  );
}
