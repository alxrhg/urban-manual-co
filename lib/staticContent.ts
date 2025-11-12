import { Destination } from '@/types/destination';

const curatedFallbackDestinations: Destination[] = [
  {
    slug: 'raw-taipei',
    name: 'RAW',
    city: 'Taipei',
    country: 'Taiwan',
    category: 'Restaurant',
    micro_description: 'Innovative tasting menus from chef André Chiang.',
    image: 'https://images.urbanmanual.co/fallback/raw-taipei.jpg',
    crown: true,
    tags: ['fine dining', 'tasting menu'],
  },
  {
    slug: 'bar-benfiddich-tokyo',
    name: 'Bar Benfiddich',
    city: 'Tokyo',
    country: 'Japan',
    category: 'Bar',
    micro_description: 'Farm-to-glass cocktails crafted by Hiroyasu Kayama.',
    image: 'https://images.urbanmanual.co/fallback/bar-benfiddich.jpg',
    tags: ['cocktails', 'speakeasy'],
  },
  {
    slug: 'nine-orchards-new-york',
    name: 'Nine Orchard Hotel',
    city: 'New York',
    country: 'United States',
    category: 'Hotel',
    micro_description: 'Design-led stay in a restored Lower East Side bank.',
    image: 'https://images.urbanmanual.co/fallback/nine-orchard.jpg',
    tags: ['design hotel', 'lower east side'],
  },
  {
    slug: 'chiltern-firehouse-london',
    name: 'Chiltern Firehouse',
    city: 'London',
    country: 'United Kingdom',
    category: 'Restaurant',
    micro_description: 'Andre Balazs hotspot with a lively dining room.',
    image: 'https://images.urbanmanual.co/fallback/chiltern-firehouse.jpg',
    tags: ['celebrity', 'brunch'],
  },
];

export async function getCuratedFallbackDestinations(): Promise<Destination[]> {
  return curatedFallbackDestinations.map(destination => ({ ...destination }));
}
