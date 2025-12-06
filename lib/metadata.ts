import { Metadata } from 'next';
import { createServerClient } from './supabase/server';
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
 * Generate Organization schema for homepage
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://www.urbanmanual.co/#organization',
    name: 'The Urban Manual',
    url: 'https://www.urbanmanual.co',
    logo: {
      '@type': 'ImageObject',
      url: 'https://www.urbanmanual.co/logo.png',
      width: 512,
      height: 512,
    },
    description: 'Curated guide to the world\'s best hotels, restaurants & travel destinations',
    sameAs: [
      'https://www.instagram.com/urbanmanual',
      'https://twitter.com/urbanmanual',
    ],
  };
}

/**
 * Generate WebSite schema with SearchAction for homepage
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.urbanmanual.co/#website',
    url: 'https://www.urbanmanual.co',
    name: 'The Urban Manual',
    description: 'Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide.',
    publisher: {
      '@id': 'https://www.urbanmanual.co/#organization',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.urbanmanual.co/?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate ItemList schema for city/category listing pages
 */
export function generateItemListSchema(
  items: Array<{ name: string; slug: string; image?: string; description?: string }>,
  listName: string,
  listUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: listUrl,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 20).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: `https://www.urbanmanual.co/destination/${item.slug}`,
      ...(item.image && { image: item.image }),
      ...(item.description && { description: item.description.replace(/<[^>]*>/g, '').substring(0, 150) }),
    })),
  };
}

/**
 * Generate metadata for category pages
 */
export function generateCategoryMetadata(category: string): Metadata {
  const categoryName = decodeURIComponent(category)
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const categoryDescriptions: Record<string, string> = {
    hotel: 'Discover curated luxury hotels and boutique accommodations worldwide. From design-forward properties to historic landmarks.',
    restaurant: 'Explore handpicked restaurants featuring Michelin-starred venues and local gems. Fine dining and casual eateries.',
    cafe: 'Find exceptional cafes around the world. Specialty coffee, artisan pastries, and unique atmospheres.',
    bar: 'Discover the best bars, cocktail lounges, and drinking establishments. From speakeasies to rooftop venues.',
    shop: 'Explore curated shops and boutiques. Fashion, design, and unique local finds.',
    museum: 'Explore world-class museums and cultural institutions. Art, history, and contemporary exhibitions.',
  };

  const description = categoryDescriptions[category.toLowerCase()] ||
    `Discover the best ${categoryName.toLowerCase()} destinations around the world. Curated recommendations from The Urban Manual.`;

  const title = `Best ${categoryName}s Worldwide | The Urban Manual`;
  const canonicalUrl = `https://www.urbanmanual.co/category/${encodeURIComponent(category)}`;

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
 * Generate breadcrumb schema for category pages
 */
export function generateCategoryBreadcrumb(category: string) {
  const categoryName = decodeURIComponent(category)
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
        name: categoryName,
        item: `https://www.urbanmanual.co/category/${encodeURIComponent(category)}`,
      },
    ],
  };
}

/**
 * Generate breadcrumb schema for cities listing page
 */
export function generateCitiesListBreadcrumb() {
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
        name: 'Cities',
        item: 'https://www.urbanmanual.co/cities',
      },
    ],
  };
}

/**
 * Generate CollectionPage schema for cities listing
 */
export function generateCitiesCollectionSchema(cities: Array<{ city: string; count: number; country?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Discover Cities - The Urban Manual',
    description: 'Explore curated travel destinations by city. Find the best restaurants, hotels, bars, and attractions in cities worldwide.',
    url: 'https://www.urbanmanual.co/cities',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: cities.length,
      itemListElement: cities.slice(0, 30).map((city, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: city.city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        url: `https://www.urbanmanual.co/city/${encodeURIComponent(city.city)}`,
        description: `${city.count} curated destinations in ${city.city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}${city.country ? `, ${city.country}` : ''}`,
      })),
    },
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

