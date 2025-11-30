/**
 * Homepage - ISR (Incremental Static Regeneration)
 *
 * OPTIMIZED FOR SPEED:
 * - Pre-rendered HTML with initial content (SEO-friendly)
 * - Cached data revalidates every 60 seconds
 * - User-specific data fetched client-side (non-blocking)
 */

import HomepageClient from "@/components/homepage/HomepageClient";
import { loadHomepageData } from "./loaders";
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

// ISR - revalidate every 60 seconds for fresh content
export const revalidate = 60;

export default async function HomePage() {
  // Fetch data server-side (cached with unstable_cache)
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
