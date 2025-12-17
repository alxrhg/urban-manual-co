import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Lists | The Urban Manual',
  description:
    'Create and organize your personal travel lists. Save your favorite destinations and share curated collections with friends.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.urbanmanual.co/lists',
  },
  openGraph: {
    title: 'My Lists | The Urban Manual',
    description:
      'Create and organize your personal travel lists. Save your favorite destinations.',
    url: 'https://www.urbanmanual.co/lists',
    siteName: 'The Urban Manual',
    type: 'website',
  },
};

export default function ListsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
