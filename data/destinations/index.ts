import destinationsJson from '@/public/destinations.json';

export interface RawDestinationRecord {
  name: string;
  brand?: string;
  cardTags?: string;
  category?: string;
  city?: string;
  content?: string;
  crown?: boolean;
  lat?: number;
  long?: number;
  mainImage?: string;
  michelinStars?: number;
  myRating?: number;
  reviewed?: boolean;
  slug: string;
  subline?: string;
}

export interface DestinationMetadata {
  name: string;
  slug: string;
  city?: string;
  category?: string;
  summary?: string;
  highlights: string[];
  brand?: string;
  imageUrl?: string;
  michelinStars?: number;
  rating?: number;
  reviewed?: boolean;
  coordinates?: { lat: number; lng: number };
  crown?: boolean;
  subtitle?: string;
}

const rawDestinations = destinationsJson as RawDestinationRecord[];

const normalizedDestinations: DestinationMetadata[] = rawDestinations
  .filter(dest => Boolean(dest.slug))
  .map(dest => ({
    name: dest.name,
    slug: dest.slug,
    city: dest.city || undefined,
    category: dest.category || undefined,
    summary: dest.content || dest.subline || undefined,
    highlights: parseHighlights(dest.cardTags),
    brand: dest.brand || undefined,
    imageUrl: dest.mainImage || undefined,
    michelinStars: isNumber(dest.michelinStars) ? dest.michelinStars : undefined,
    rating: isNumber(dest.myRating) ? dest.myRating : undefined,
    reviewed: typeof dest.reviewed === 'boolean' ? dest.reviewed : undefined,
    coordinates:
      isNumber(dest.lat) && isNumber(dest.long)
        ? { lat: dest.lat, lng: dest.long }
        : undefined,
    crown: typeof dest.crown === 'boolean' ? dest.crown : undefined,
    subtitle: dest.subline || undefined,
  }));

const slugIndex = new Map<string, DestinationMetadata>();
const cityIndex = new Map<string, DestinationMetadata[]>();

normalizedDestinations.forEach(dest => {
  slugIndex.set(dest.slug.toLowerCase(), dest);

  const cityKey = dest.city?.toLowerCase();
  if (!cityKey) return;

  if (!cityIndex.has(cityKey)) {
    cityIndex.set(cityKey, []);
  }

  cityIndex.get(cityKey)!.push(dest);
});

function parseHighlights(cardTags?: string): string[] {
  if (!cardTags) return [];
  return cardTags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function getAllDestinationMetadata(): DestinationMetadata[] {
  return normalizedDestinations;
}

export function getDestinationMetadataBySlug(slug: string): DestinationMetadata | undefined {
  return slugIndex.get(slug.toLowerCase());
}

export function getDestinationsByCity(city: string): DestinationMetadata[] {
  return cityIndex.get(city.toLowerCase()) || [];
}
