import HomePageClient from './page.client';
import { getCuratedFallbackDestinations } from '@/lib/staticContent';

export const revalidate = 3600;

export default async function HomePage() {
  const fallbackDestinations = await getCuratedFallbackDestinations();

  return <HomePageClient fallbackDestinations={fallbackDestinations} />;
}
