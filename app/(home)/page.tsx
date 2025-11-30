/**
 * Homepage - Server-Side Rendered
 *
 * This is the main entry point for the homepage with SSR.
 * Data is fetched on the server and passed to the client component.
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
  keywords: [
    "travel guide",
    "hotels",
    "restaurants",
    "travel destinations",
    "Michelin restaurants",
    "luxury hotels",
    "travel recommendations",
  ],
  openGraph: {
    title: "The Urban Manual - Curated Travel Guide",
    description:
      "Discover the world's best hotels, restaurants & travel destinations",
    url: "https://www.urbanmanual.co",
    siteName: "The Urban Manual",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Urban Manual - Curated Travel Guide",
    description:
      "Discover the world's best hotels, restaurants & travel destinations",
  },
};

// Revalidate every 5 minutes for fresh data
export const revalidate = 300;

async function HomepageContent() {
  const {
    destinations,
    cities,
    categories,
    user,
    userProfile,
    visitedSlugs,
    isAdmin,
  } = await loadHomepageData();

  return (
    <HomepageClient
      initialDestinations={destinations}
      initialCities={cities}
      initialCategories={categories}
      initialUser={user}
      initialUserProfile={userProfile}
      initialVisitedSlugs={visitedSlugs}
      initialIsAdmin={isAdmin}
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
