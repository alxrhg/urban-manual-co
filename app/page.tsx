import { Metadata } from 'next';
import { generateHomeBreadcrumb } from '@/lib/metadata';
import { ConversationalDiscovery } from '@/features/homepage/components/ConversationalDiscovery';

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

      <h1 className="sr-only">
        Discover the World's Best Hotels, Restaurants & Travel Destinations - The Urban Manual
      </h1>

      {/* Split-Screen Conversational Discovery Interface */}
      <ConversationalDiscovery />
    </>
  );
}
