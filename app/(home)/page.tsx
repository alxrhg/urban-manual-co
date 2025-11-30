/**
 * Homepage - Static Shell with Client-Side Data
 *
 * INSTANT LOADING:
 * - Static HTML shell renders immediately (0ms TTFB)
 * - Data fetched client-side with loading skeleton
 * - No server-side blocking - page is fully pre-built
 */

import HomepageClient from "@/components/homepage/HomepageClient";
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

// Fully static - no server data fetching
export const dynamic = "force-static";

export default function HomePage() {
  // Empty initial data - client will fetch and show skeleton
  return (
    <HomepageClient
      initialDestinations={[]}
      initialCities={[]}
      initialCategories={[]}
      totalCount={0}
    />
  );
}
