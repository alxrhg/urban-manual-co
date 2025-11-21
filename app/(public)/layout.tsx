import { Metadata } from 'next';
import { PublicLayout } from '@/components/layout/PublicLayout';

export const metadata: Metadata = {
  title: {
    default: 'The Urban Manual - Curated Guide to World\'s Best Hotels, Restaurants & Travel Destinations',
    template: '%s | The Urban Manual',
  },
  description: 'Discover the world\'s best hotels, restaurants, and travel destinations. Curated guides to help you explore cities like Tokyo, New York, Paris, and more.',
};

/**
 * Public route group layout
 * 
 * This layout wraps all public pages (homepage, city pages, destination pages, etc.)
 * with the shared PublicLayout component that includes header, footer, and consistent styling.
 * 
 * Public routes:
 * - / (homepage)
 * - /city/[slug]
 * - /destination/[slug]
 * - /places/[slug]
 * - /recent
 * - 404 (not-found.tsx)
 */
export default function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}

