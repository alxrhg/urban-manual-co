import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover | The Urban Manual',
  description:
    'AI-powered personalized travel recommendations. Get curated hotel and restaurant suggestions based on your preferences and travel style.',
  alternates: {
    canonical: 'https://www.urbanmanual.co/discover',
  },
  openGraph: {
    title: 'Discover | The Urban Manual',
    description:
      'AI-powered personalized travel recommendations. Get curated hotel and restaurant suggestions based on your preferences.',
    url: 'https://www.urbanmanual.co/discover',
    siteName: 'The Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover | The Urban Manual',
    description:
      'AI-powered personalized travel recommendations. Get curated hotel and restaurant suggestions based on your preferences.',
  },
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
