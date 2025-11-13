import { HomePageClient } from '@/src/features/home/HomePageClient';
import { getHomePageData } from '@/src/lib/server/home-loaders';

export default async function HomePage() {
  const data = await getHomePageData();

  return (
    <HomePageClient
      initialDestinations={data.initialDestinations}
      trendingDestinations={data.trendingDestinations}
    />
  );
}
