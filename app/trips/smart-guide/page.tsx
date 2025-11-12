import { Metadata } from 'next';
import SmartTripGuide from '@/components/trips/SmartTripGuide';

export const metadata: Metadata = {
  title: 'Smart Trip Guide — Urban Manual',
  description: 'Describe your ideal outing and receive a curated itinerary summary paired with handpicked Urban Manual destinations.',
};

export default function SmartTripGuidePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-white py-12 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
      <SmartTripGuide />
    </main>
  );
}

