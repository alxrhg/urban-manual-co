import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Travel Assistant | The Urban Manual',
  description:
    'Chat with our AI travel assistant to find perfect destinations, plan trips, and get personalized recommendations for hotels and restaurants worldwide.',
  alternates: {
    canonical: 'https://www.urbanmanual.co/chat',
  },
  openGraph: {
    title: 'Travel Assistant | The Urban Manual',
    description:
      'Chat with our AI travel assistant to find perfect destinations and get personalized recommendations.',
    url: 'https://www.urbanmanual.co/chat',
    siteName: 'The Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Travel Assistant | The Urban Manual',
    description:
      'Chat with our AI travel assistant to find perfect destinations and get personalized recommendations.',
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
