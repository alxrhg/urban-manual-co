import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Destinations | The Urban Manual',
  description:
    'Browse and filter 900+ curated destinations worldwide. Discover hotels, restaurants, cafes, bars, and cultural landmarks by city and category.',
  alternates: {
    canonical: 'https://www.urbanmanual.co/explore',
  },
  openGraph: {
    title: 'Explore Destinations | The Urban Manual',
    description:
      'Browse and filter 900+ curated destinations worldwide. Discover hotels, restaurants, cafes, bars, and cultural landmarks.',
    url: 'https://www.urbanmanual.co/explore',
    siteName: 'The Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Destinations | The Urban Manual',
    description:
      'Browse and filter 900+ curated destinations worldwide. Discover hotels, restaurants, cafes, bars, and cultural landmarks.',
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
