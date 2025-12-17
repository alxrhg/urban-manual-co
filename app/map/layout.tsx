import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Map | The Urban Manual',
  description:
    'Discover curated hotels, restaurants, and attractions on an interactive world map. Find the best destinations near you or explore new cities.',
  alternates: {
    canonical: 'https://www.urbanmanual.co/map',
  },
  openGraph: {
    title: 'Explore Map | The Urban Manual',
    description:
      'Discover curated hotels, restaurants, and attractions on an interactive world map. Find the best destinations near you.',
    url: 'https://www.urbanmanual.co/map',
    siteName: 'The Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Map | The Urban Manual',
    description:
      'Discover curated hotels, restaurants, and attractions on an interactive world map. Find the best destinations near you.',
  },
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
