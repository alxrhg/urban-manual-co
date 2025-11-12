import { Metadata } from 'next';
import { cache } from 'react';
import { createServerClient, createServiceRoleClient } from './supabase-server';
import { Destination } from '@/types/destination';

/**
 * Generate SEO-optimized metadata for destination pages
 */
export async function generateDestinationMetadata(slug: string): Promise<Metadata> {
  try {
    const supabase = await createServerClient();
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !destination) {
      return {
        title: 'Destination Not Found | The Urban Manual',
        description: 'The destination you are looking for could not be found.',
      };
    }

    const dest = destination as Destination;

    // Generate title
    const title = `${dest.name} - ${dest.category} in ${dest.city} | The Urban Manual`;

    // Generate description
    let description = '';
    if (dest.content) {
      // Strip HTML and limit to 155 characters
      description = dest.content
        .replace(/<[^>]*>/g, '')
        .substring(0, 155)
        .trim();
      if (dest.content.length > 155) {
        description += '...';
      }
    } else {
      // Fallback description
      description = `Discover ${dest.name}, a ${dest.category.toLowerCase()} in ${dest.city}`;
      if (dest.michelin_stars && dest.michelin_stars > 0) {
        description += `. ${dest.michelin_stars} Michelin star${dest.michelin_stars > 1 ? 's' : ''}`;
      }
      description += '. Curated by The Urban Manual.';
    }

    // Generate canonical URL
    const canonicalUrl = `https://www.urbanmanual.co/destination/${slug}`;

    // Generate Open Graph image
    const ogImage = dest.image || 'https://www.urbanmanual.co/og-default.jpg';

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: 'The Urban Manual',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: dest.name,
          },
        ],
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'The Urban Manual',
      description: 'Your guide to the world\'s best destinations',
    };
  }
}

/**
 * Generate SEO-optimized metadata for city pages
 */
export async function generateCityMetadata(city: string): Promise<Metadata> {
  const formattedCity = decodeURIComponent(city);
  const title = `Best Hotels & Restaurants in ${formattedCity} | The Urban Manual`;
  const description = `Discover the finest hotels, Michelin-starred restaurants, cafes, and hidden gems in ${formattedCity}. Curated by The Urban Manual.`;
  const canonicalUrl = `https://www.urbanmanual.co/city/${encodeURIComponent(city)}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'The Urban Manual',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

/**
 * Generate structured data (Schema.org JSON-LD) for destinations
 */
export function generateDestinationSchema(destination: Destination) {
  const baseSchema = {
    '@context': 'https://schema.org',
    name: destination.name,
    description: destination.content?.replace(/<[^>]*>/g, ''),
    image: destination.image,
    url: `https://www.urbanmanual.co/destination/${destination.slug}`,
  };

  // Determine schema type based on category
  const category = destination.category?.toLowerCase() || '';

  if (category === 'hotel') {
    return {
      ...baseSchema,
      '@type': 'Hotel',
      address: {
        '@type': 'PostalAddress',
        addressLocality: destination.city,
        addressCountry: destination.country,
      },
      starRating: destination.rating
        ? {
            '@type': 'Rating',
            ratingValue: destination.rating,
            bestRating: 5,
          }
        : undefined,
      priceRange: '$'.repeat(destination.price_level || 2),
    };
  } else if (['restaurant', 'Restaurant', 'cafe', 'bar'].includes(category)) {
    const restaurantSchema: any = {
      ...baseSchema,
      '@type': 'Restaurant',
      address: {
        '@type': 'PostalAddress',
        addressLocality: destination.city,
        addressCountry: destination.country,
      },
      servesCuisine: destination.tags?.join(', '),
      priceRange: '$'.repeat(destination.price_level || 2),
    };

    // Add Michelin stars if available
    if (destination.michelin_stars && destination.michelin_stars > 0) {
      restaurantSchema.award = `${destination.michelin_stars} Michelin Star${
        destination.michelin_stars > 1 ? 's' : ''
      }`;
    }

    // Add rating if available
    if (destination.rating) {
      restaurantSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: destination.rating,
        bestRating: 5,
      };
    }

    return restaurantSchema;
  } else {
    // Default to LocalBusiness for other categories
    return {
      ...baseSchema,
      '@type': 'LocalBusiness',
      address: {
        '@type': 'PostalAddress',
        addressLocality: destination.city,
        addressCountry: destination.country,
      },
    };
  }
}

/**
 * Generate breadcrumb schema for destination pages
 */
export function generateDestinationBreadcrumb(destination: Destination) {
  // Format city name for display
  const cityName = destination.city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.urbanmanual.co',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: cityName,
        item: `https://www.urbanmanual.co/city/${destination.city}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: destination.name,
        item: `https://www.urbanmanual.co/destination/${destination.slug}`,
      },
    ],
  };
}

/**
 * Generate breadcrumb schema for city pages
 */
export function generateCityBreadcrumb(city: string) {
  // Format city name for display
  const cityName = decodeURIComponent(city)
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.urbanmanual.co',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: cityName,
        item: `https://www.urbanmanual.co/city/${encodeURIComponent(city)}`,
      },
    ],
  };
}

/**
 * Generate FAQ schema for destination pages
 */
export function generateDestinationFAQ(destination: Destination) {
  const category = destination.category?.toLowerCase() || '';
  const cityName = destination.city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const faqs: Array<{ question: string; answer: string }> = [];

  // Generic FAQs based on category
  if (category === 'hotel') {
    faqs.push({
      question: `Where is ${destination.name} located?`,
      answer: `${destination.name} is located in ${cityName}${destination.country ? `, ${destination.country}` : ''}.`,
    });

    if (destination.price_level) {
      const priceDesc = destination.price_level === 1 ? 'budget-friendly' :
                        destination.price_level === 2 ? 'mid-range' :
                        destination.price_level === 3 ? 'upscale' : 'luxury';
      faqs.push({
        question: `What is the price range of ${destination.name}?`,
        answer: `${destination.name} is a ${priceDesc} hotel with a price level of ${'$'.repeat(destination.price_level)}.`,
      });
    }
  } else if (['restaurant', 'Restaurant', 'cafe', 'bar'].includes(category)) {
    faqs.push({
      question: `Where is ${destination.name} located?`,
      answer: `${destination.name} is a ${destination.category} located in ${cityName}${destination.country ? `, ${destination.country}` : ''}.`,
    });

    if (destination.michelin_stars && destination.michelin_stars > 0) {
      faqs.push({
        question: `Does ${destination.name} have Michelin stars?`,
        answer: `Yes, ${destination.name} has ${destination.michelin_stars} Michelin star${destination.michelin_stars > 1 ? 's' : ''}.`,
      });
    }

    if (destination.tags && destination.tags.length > 0) {
      faqs.push({
        question: `What type of cuisine does ${destination.name} serve?`,
        answer: `${destination.name} serves ${destination.tags.join(', ')} cuisine.`,
      });
    }
  }

  // Only return FAQ schema if we have questions
  if (faqs.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

type DestinationSummary = {
  slug: string;
  name: string;
  city: string | null;
  category: string | null;
  image: string | null;
};

type OrderedItemReference = {
  destination_slug: string;
  added_at: string | null;
};

type TripItinerarySummary = {
  id: string;
  trip_id: string;
  destination_slug: string | null;
  day: number;
  order_index: number;
  time: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  created_at: string;
};

interface CollectionRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  is_public: boolean;
  destination_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ListRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_collaborative: boolean;
  cover_image: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface TripRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_public: boolean;
  cover_image: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type SeoStatus = 'ok' | 'not_found' | 'unauthorized' | 'error';

export interface CollectionSeoPayload {
  collection: CollectionRecord | null;
  destinations: DestinationSummary[];
  items: OrderedItemReference[];
  isOwner: boolean;
  status: SeoStatus;
}

export interface ListSeoPayload {
  list: ListRecord | null;
  destinations: DestinationSummary[];
  items: OrderedItemReference[];
  isOwner: boolean;
  status: SeoStatus;
}

export interface TripSeoPayload {
  trip: TripRecord | null;
  itineraryItems: TripItinerarySummary[];
  destinations: DestinationSummary[];
  isOwner: boolean;
  status: SeoStatus;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://www.urbanmanual.co'
  );
}

function truncateDescription(value?: string | null, length = 155): string {
  if (!value) return '';
  const sanitized = value.replace(/\s+/g, ' ').trim();
  if (sanitized.length <= length) {
    return sanitized;
  }
  return `${sanitized.slice(0, length - 1).trimEnd()}…`;
}

async function getCurrentUserId() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch (error) {
    return null;
  }
}

export const fetchCollectionSeoData = cache(async (collectionId: string): Promise<CollectionSeoPayload> => {
  try {
    const [userId, serviceClient] = await Promise.all([
      getCurrentUserId(),
      Promise.resolve(createServiceRoleClient()),
    ]);

    const { data: collection, error } = await serviceClient
      .from('collections')
      .select('id, user_id, name, description, emoji, is_public, destination_count, created_at, updated_at')
      .eq('id', collectionId)
      .maybeSingle();

    if (error) {
      console.warn('[Metadata] Error loading collection metadata', error);
      return { collection: null, destinations: [], items: [], isOwner: false, status: 'error' };
    }

    if (!collection) {
      return { collection: null, destinations: [], items: [], isOwner: false, status: 'not_found' };
    }

    const isOwner = collection.user_id === userId;

    if (!collection.is_public && !isOwner) {
      return { collection: null, destinations: [], items: [], isOwner: false, status: 'unauthorized' };
    }

    const { data: itemsData, error: itemsError } = await serviceClient
      .from('list_items')
      .select('destination_slug, added_at')
      .eq('list_id', collectionId)
      .order('added_at', { ascending: false });

    const items = !itemsError && itemsData ? (itemsData as OrderedItemReference[]) : [];
    const slugs = Array.from(new Set(items.map(item => item.destination_slug).filter(Boolean)));

    let destinations: DestinationSummary[] = [];
    if (slugs.length > 0) {
      const { data: destinationData } = await serviceClient
        .from('destinations')
        .select('slug, name, city, category, image')
        .in('slug', slugs as string[]);

      if (destinationData) {
        destinations = destinationData as DestinationSummary[];
      }
    }

    return { collection: collection as CollectionRecord, destinations, items, isOwner, status: 'ok' };
  } catch (error) {
    console.warn('[Metadata] Failed to fetch collection SEO data', error);
    return { collection: null, destinations: [], items: [], isOwner: false, status: 'error' };
  }
});

export const fetchListSeoData = cache(async (listId: string): Promise<ListSeoPayload> => {
  try {
    const [userId, serviceClient] = await Promise.all([
      getCurrentUserId(),
      Promise.resolve(createServiceRoleClient()),
    ]);

    const { data: list, error } = await serviceClient
      .from('lists')
      .select('id, user_id, name, description, is_public, is_collaborative, cover_image, created_at, updated_at')
      .eq('id', listId)
      .maybeSingle();

    if (error) {
      console.warn('[Metadata] Error loading list metadata', error);
      return { list: null, destinations: [], items: [], isOwner: false, status: 'error' };
    }

    if (!list) {
      return { list: null, destinations: [], items: [], isOwner: false, status: 'not_found' };
    }

    const isOwner = list.user_id === userId;

    if (!list.is_public && !isOwner) {
      return { list: null, destinations: [], items: [], isOwner: false, status: 'unauthorized' };
    }

    const { data: itemsData, error: itemsError } = await serviceClient
      .from('list_items')
      .select('destination_slug, added_at')
      .eq('list_id', listId)
      .order('added_at', { ascending: false });

    const items = !itemsError && itemsData ? (itemsData as OrderedItemReference[]) : [];
    const slugs = Array.from(new Set(items.map(item => item.destination_slug).filter(Boolean)));

    let destinations: DestinationSummary[] = [];
    if (slugs.length > 0) {
      const { data: destinationData } = await serviceClient
        .from('destinations')
        .select('slug, name, city, category, image')
        .in('slug', slugs as string[]);

      if (destinationData) {
        destinations = destinationData as DestinationSummary[];
      }
    }

    return { list: list as ListRecord, destinations, items, isOwner, status: 'ok' };
  } catch (error) {
    console.warn('[Metadata] Failed to fetch list SEO data', error);
    return { list: null, destinations: [], items: [], isOwner: false, status: 'error' };
  }
});

export const fetchTripSeoData = cache(async (tripId: string): Promise<TripSeoPayload> => {
  try {
    const [userId, serviceClient] = await Promise.all([
      getCurrentUserId(),
      Promise.resolve(createServiceRoleClient()),
    ]);

    const { data: trip, error } = await serviceClient
      .from('trips')
      .select('id, user_id, title, description, destination, start_date, end_date, status, is_public, cover_image, created_at, updated_at')
      .eq('id', tripId)
      .maybeSingle();

    if (error) {
      console.warn('[Metadata] Error loading trip metadata', error);
      return { trip: null, itineraryItems: [], destinations: [], isOwner: false, status: 'error' };
    }

    if (!trip) {
      return { trip: null, itineraryItems: [], destinations: [], isOwner: false, status: 'not_found' };
    }

    const isOwner = trip.user_id === userId;

    if (!trip.is_public && !isOwner) {
      return { trip: null, itineraryItems: [], destinations: [], isOwner: false, status: 'unauthorized' };
    }

    const { data: itineraryData, error: itineraryError } = await serviceClient
      .from('itinerary_items')
      .select('id, trip_id, destination_slug, day, order_index, time, title, description, notes, created_at')
      .eq('trip_id', tripId)
      .order('day', { ascending: true })
      .order('order_index', { ascending: true });

    const itineraryItems = !itineraryError && itineraryData ? (itineraryData as TripItinerarySummary[]) : [];
    const slugs = Array.from(
      new Set(
        itineraryItems
          .map(item => item.destination_slug)
          .filter((slug): slug is string => Boolean(slug))
      )
    );

    let destinations: DestinationSummary[] = [];
    if (slugs.length > 0) {
      const { data: destinationData } = await serviceClient
        .from('destinations')
        .select('slug, name, city, category, image')
        .in('slug', slugs);

      if (destinationData) {
        destinations = destinationData as DestinationSummary[];
      }
    }

    return { trip: trip as TripRecord, itineraryItems, destinations, isOwner, status: 'ok' };
  } catch (error) {
    console.warn('[Metadata] Failed to fetch trip SEO data', error);
    return { trip: null, itineraryItems: [], destinations: [], isOwner: false, status: 'error' };
  }
});

export async function generateCollectionMetadata(collectionId: string): Promise<Metadata> {
  const payload = await fetchCollectionSeoData(collectionId);
  if (!payload.collection) {
    return {
      title: 'Collection Not Found | The Urban Manual',
      description: 'This collection is unavailable or may be private.',
    };
  }

  const { collection, destinations } = payload;
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/collection/${collection.id}`;
  const summaryCount = collection.destination_count ?? payload.items.length;

  const description = truncateDescription(
    collection.description ||
      (summaryCount
        ? `Discover ${summaryCount} curated places in ${collection.name} from The Urban Manual.`
        : `Explore ${collection.name}, a curated collection on The Urban Manual.`)
  );

  const image = destinations.find(dest => dest.image)?.image || 'https://www.urbanmanual.co/og-default.jpg';

  const title = `${collection.name} | Curated Collection on The Urban Manual`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'The Urban Manual',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: collection.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export async function generateListMetadata(listId: string): Promise<Metadata> {
  const payload = await fetchListSeoData(listId);
  if (!payload.list) {
    return {
      title: 'List Not Found | The Urban Manual',
      description: 'This list is unavailable or may be private.',
    };
  }

  const { list, destinations } = payload;
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/lists/${list.id}`;
  const description = truncateDescription(
    list.description ||
      (destinations.length
        ? `Browse ${destinations.length} handpicked places on the ${list.name} list.`
        : `Explore ${list.name}, a curated list on The Urban Manual.`)
  );

  const image = list.cover_image || destinations.find(dest => dest.image)?.image || 'https://www.urbanmanual.co/og-default.jpg';
  const title = `${list.name} | Saved List on The Urban Manual`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'The Urban Manual',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: list.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export async function generateTripMetadata(tripId: string): Promise<Metadata> {
  const payload = await fetchTripSeoData(tripId);
  if (!payload.trip) {
    return {
      title: 'Trip Not Found | The Urban Manual',
      description: 'This trip is unavailable or may be private.',
    };
  }

  const { trip, destinations, itineraryItems } = payload;
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/trips/${trip.id}`;

  const duration = trip.start_date && trip.end_date ? ` from ${trip.start_date} to ${trip.end_date}` : '';
  const stopCount = itineraryItems.length;
  const description = truncateDescription(
    trip.description ||
      (stopCount
        ? `Plan for ${trip.title}${duration} with ${stopCount} curated stops by The Urban Manual.`
        : `Explore the ${trip.title} itinerary curated by The Urban Manual.`)
  );

  const coverImage = trip.cover_image || destinations.find(dest => dest.image)?.image || 'https://www.urbanmanual.co/og-default.jpg';
  const title = `${trip.title} | Trip Planner on The Urban Manual`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'The Urban Manual',
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: trip.title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [coverImage],
    },
  };
}

export function generateItemListJsonLd({
  name,
  description,
  url,
  orderedSlugs,
  destinations,
}: {
  name: string;
  description?: string | null;
  url: string;
  orderedSlugs: string[];
  destinations: DestinationSummary[];
}) {
  const destinationMap = new Map(destinations.map(dest => [dest.slug, dest] as const));

  const itemListElement = orderedSlugs
    .map((slug, index) => {
      const destination = destinationMap.get(slug);
      if (!destination) {
        return null;
      }

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: destination.name,
        item: {
          '@type': 'Place',
          name: destination.name,
          url: `https://www.urbanmanual.co/destination/${destination.slug}`,
          image: destination.image ?? undefined,
          address: destination.city
            ? {
                '@type': 'PostalAddress',
                addressLocality: destination.city,
              }
            : undefined,
          additionalType: destination.category ?? undefined,
        },
      };
    })
    .filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description: description || undefined,
    url,
    numberOfItems: itemListElement.length || undefined,
    itemListElement,
  };
}

export function generateTripJsonLd({
  trip,
  itineraryItems,
  destinations,
}: {
  trip: TripRecord;
  itineraryItems: TripItinerarySummary[];
  destinations: DestinationSummary[];
}) {
  const destinationMap = new Map(destinations.map(dest => [dest.slug, dest] as const));

  const itineraryElements = itineraryItems.map((item, index) => {
    const destination = item.destination_slug ? destinationMap.get(item.destination_slug) : null;
    return {
      '@type': 'ListItem',
      position: index + 1,
      name: destination?.name ?? item.title,
      description: item.description ?? undefined,
      startTime: item.time ?? undefined,
      item: destination
        ? {
            '@type': 'Place',
            name: destination.name,
            url: `https://www.urbanmanual.co/destination/${destination.slug}`,
            image: destination.image ?? undefined,
            address: destination.city
              ? {
                  '@type': 'PostalAddress',
                  addressLocality: destination.city,
                }
              : undefined,
          }
        : undefined,
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Trip',
    name: trip.title,
    description: trip.description ?? undefined,
    url: `${getSiteUrl()}/trips/${trip.id}`,
    image: trip.cover_image ?? undefined,
    startDate: trip.start_date ?? undefined,
    endDate: trip.end_date ?? undefined,
    itinerary: itineraryElements.length
      ? {
          '@type': 'ItemList',
          name: `${trip.title} itinerary`,
          itemListElement: itineraryElements,
        }
      : undefined,
    travelAgency: {
      '@type': 'Organization',
      name: 'The Urban Manual',
      url: 'https://www.urbanmanual.co',
    },
    destination: trip.destination
      ? {
          '@type': 'City',
          name: trip.destination,
        }
      : undefined,
  };
}

