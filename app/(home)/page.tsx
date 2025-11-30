/**
 * Homepage - ISR with Suspense Streaming
 *
 * OPTIMIZED FOR SPEED:
 * - Hero renders immediately (no data blocking)
 * - Destinations stream in with Suspense
 * - Only 20 destinations for first viewport
 * - Cached data revalidates every 60 seconds
 */

import { Suspense } from "react";
import HomepageClient from "@/components/homepage/HomepageClient";
import { loadHomepageData } from "./loaders";
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

// ISR - revalidate every 60 seconds for fresh content
export const revalidate = 60;

// Server component that fetches data
async function HomepageWithData() {
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
      <HomepageWithData />
    </Suspense>
  );
}
