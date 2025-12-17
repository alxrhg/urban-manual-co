import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architectural Movements | The Urban Manual',
  description:
    'Explore architectural movements and design styles from around the world. From Art Deco to Brutalism, discover buildings and spaces that define eras.',
  alternates: {
    canonical: 'https://www.urbanmanual.co/movements',
  },
  openGraph: {
    title: 'Architectural Movements | The Urban Manual',
    description:
      'Explore architectural movements and design styles from around the world. From Art Deco to Brutalism.',
    url: 'https://www.urbanmanual.co/movements',
    siteName: 'The Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Architectural Movements | The Urban Manual',
    description:
      'Explore architectural movements and design styles from around the world. From Art Deco to Brutalism.',
  },
};

export default function MovementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
