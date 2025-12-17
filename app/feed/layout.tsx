import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activity Feed | The Urban Manual',
  description:
    'Stay updated with the latest travel discoveries and recommendations from the Urban Manual community.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.urbanmanual.co/feed',
  },
  openGraph: {
    title: 'Activity Feed | The Urban Manual',
    description:
      'Stay updated with the latest travel discoveries and recommendations from the community.',
    url: 'https://www.urbanmanual.co/feed',
    siteName: 'The Urban Manual',
    type: 'website',
  },
};

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
