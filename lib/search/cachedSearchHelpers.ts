import { unstable_cache } from 'next/cache';
import { embedText } from '@/lib/llm';
import { expandNearbyLocations, getLocationContext } from '@/lib/search/expandLocations';

const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

export const cachedEmbedText = unstable_cache(
  async (input: string) => {
    return embedText(input);
  },
  ['embedTextCache'],
  { revalidate: CACHE_TTL_SECONDS }
);

export const cachedExpandNearbyLocations = unstable_cache(
  async (locationName: string, maxWalkingMinutes: number = 15) => {
    return expandNearbyLocations(locationName, maxWalkingMinutes);
  },
  ['expandNearbyLocationsCache'],
  { revalidate: CACHE_TTL_SECONDS }
);

export const cachedGetLocationContext = unstable_cache(
  async (locationName: string) => {
    return getLocationContext(locationName);
  },
  ['getLocationContextCache'],
  { revalidate: CACHE_TTL_SECONDS }
);
