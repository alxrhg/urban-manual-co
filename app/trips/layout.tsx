import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Trips | The Urban Manual',
  description:
    'Plan and manage your travel itineraries. Save destinations, organize by date, and create personalized trip collections.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.urbanmanual.co/trips',
  },
  openGraph: {
    title: 'My Trips | The Urban Manual',
    description:
      'Plan and manage your travel itineraries. Save destinations and create personalized trip collections.',
    url: 'https://www.urbanmanual.co/trips',
    siteName: 'The Urban Manual',
    type: 'website',
  },
};

export default function TripsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
