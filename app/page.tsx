import { Suspense } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { HomePageClient } from "@/src/features/home";
import { getHomepageData, getPublicHomepageData } from "@/server/services/homepage-data";
import { HomePageSkeleton } from "@/components/skeletons/HomePageSkeleton";

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.urbanmanual.co/#organization",
      name: "The Urban Manual",
      url: "https://www.urbanmanual.co",
      description: "Curated guide to world's best hotels, restaurants & travel destinations",
      logo: { "@type": "ImageObject", url: "https://www.urbanmanual.co/logo.png" },
    },
    {
      "@type": "WebSite",
      "@id": "https://www.urbanmanual.co/#website",
      url: "https://www.urbanmanual.co",
      name: "The Urban Manual",
      publisher: { "@id": "https://www.urbanmanual.co/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.urbanmanual.co/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

// Metadata for SEO
export const metadata = {
  title: "The Urban Manual - Curated Travel Guide to World's Best Destinations",
  description:
    "Discover 897+ handpicked hotels, restaurants, bars, and attractions worldwide. Your curated guide to exceptional travel experiences.",
  openGraph: {
    title: "The Urban Manual - Curated Travel Guide",
    description: "Discover 897+ handpicked destinations worldwide",
    url: "https://www.urbanmanual.co",
    siteName: "The Urban Manual",
    type: "website",
  },
};

/**
 * Get authenticated user ID from cookies (server-side)
 */
async function getAuthenticatedUserId(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) return undefined;

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only in server components
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id;
  } catch {
    return undefined;
  }
}

/**
 * Server Component that fetches all homepage data
 */
async function HomePageContent() {
  const userId = await getAuthenticatedUserId();

  // Fetch all data in parallel on the server
  const data = userId
    ? await getHomepageData(userId)
    : await getPublicHomepageData().then((d) => ({
        ...d,
        visitedSlugs: [],
        userProfile: null,
        lastSession: null,
      }));

  return (
    <HomePageClient
      initialDestinations={data.destinations}
      initialFilters={data.filters}
      initialVisitedSlugs={data.visitedSlugs}
      initialUserProfile={data.userProfile}
      initialLastSession={data.lastSession}
    />
  );
}

/**
 * Homepage - Server Component with Suspense
 *
 * Performance optimizations:
 * 1. Server-side data fetching - Destinations and filters fetched before JS runs
 * 2. Parallel data loading - All data fetched simultaneously with Promise.all()
 * 3. Progressive rendering - Skeleton shows immediately while data streams
 * 4. No client-side waterfalls - All initial data passed as props
 */
export default function Home() {
  return (
    <>
      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Main content with Suspense boundary */}
      <Suspense fallback={<HomePageSkeleton />}>
        <HomePageContent />
      </Suspense>
    </>
  );
}

// Enable dynamic rendering for authenticated content
export const dynamic = "force-dynamic";
