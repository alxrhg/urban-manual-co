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
 * Parse opening hours JSON into Schema.org OpeningHoursSpecification format
 */
function parseOpeningHours(openingHoursJson: Record<string, unknown> | null | undefined) {
  if (!openingHoursJson) return undefined;

  // Google Places API returns opening_hours with periods array
  const periods = openingHoursJson.periods as Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }> | undefined;

  if (!periods || periods.length === 0) return undefined;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return periods.map(period => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: dayNames[period.open.day],
    opens: `${period.open.time.slice(0, 2)}:${period.open.time.slice(2)}`,
    closes: period.close
      ? `${period.close.time.slice(0, 2)}:${period.close.time.slice(2)}`
      : '23:59',
  }));
}

/**
 * Build enhanced PostalAddress from destination data
 */
function buildPostalAddress(destination: Destination) {
  const address: Record<string, unknown> = {
    '@type': 'PostalAddress',
    addressLocality: destination.city,
    addressCountry: destination.country,
  };

  // Add full street address if available
  if (destination.formatted_address) {
    address.streetAddress = destination.formatted_address;
  }

  return address;
}

/**
 * Build GeoCoordinates if latitude/longitude available
 */
function buildGeoCoordinates(destination: Destination) {
  if (destination.latitude && destination.longitude) {
    return {
      '@type': 'GeoCoordinates',
      latitude: destination.latitude,
      longitude: destination.longitude,
    };
  }
  return undefined;
}

/**
 * Generate structured data (Schema.org JSON-LD) for destinations
 */
export function generateDestinationSchema(destination: Destination) {
  const baseSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    name: destination.name,
    description: destination.content?.replace(/<[^>]*>/g, ''),
    image: destination.image || destination.primary_photo_url,
    url: `https://www.urbanmanual.co/destination/${destination.slug}`,
  };

  // Add phone number if available
  const phone = destination.international_phone_number || destination.phone_number;
  if (phone) {
    baseSchema.telephone = phone;
  }

  // Add geo coordinates if available
  const geo = buildGeoCoordinates(destination);
  if (geo) {
    baseSchema.geo = geo;
  }

  // Add opening hours if available
  const openingHours = parseOpeningHours(destination.opening_hours_json);
  if (openingHours) {
    baseSchema.openingHoursSpecification = openingHours;
  }

  // Add website if available
  if (destination.website) {
    baseSchema.sameAs = destination.website;
  }

  // Add Instagram if available
  if (destination.instagram_url) {
    baseSchema.sameAs = baseSchema.sameAs
      ? [baseSchema.sameAs as string, destination.instagram_url]
      : destination.instagram_url;
  }

  // Determine schema type based on category
  const category = destination.category?.toLowerCase() || '';

  if (category === 'hotel') {
    const hotelSchema: Record<string, unknown> = {
      ...baseSchema,
      '@type': 'Hotel',
      address: buildPostalAddress(destination),
      priceRange: '$'.repeat(destination.price_level || 2),
    };

    // Add star rating
    if (destination.rating) {
      hotelSchema.starRating = {
        '@type': 'Rating',
        ratingValue: destination.rating,
        bestRating: 5,
      };
    }

    // Add aggregate rating with review count
    if (destination.rating && destination.user_ratings_total) {
      hotelSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: destination.rating,
        bestRating: 5,
        ratingCount: destination.user_ratings_total,
      };
    }

    return hotelSchema;
  } else if (['restaurant', 'Restaurant', 'cafe', 'bar'].includes(category)) {
    const restaurantSchema: Record<string, unknown> = {
      ...baseSchema,
      '@type': 'Restaurant',
      address: buildPostalAddress(destination),
      servesCuisine: destination.tags?.join(', '),
      priceRange: '$'.repeat(destination.price_level || 2),
    };

    // Add Michelin stars if available
    if (destination.michelin_stars && destination.michelin_stars > 0) {
      restaurantSchema.award = `${destination.michelin_stars} Michelin Star${
        destination.michelin_stars > 1 ? 's' : ''
      }`;
    }

    // Add aggregate rating with review count
    if (destination.rating) {
      restaurantSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: destination.rating,
        bestRating: 5,
        ...(destination.user_ratings_total && { ratingCount: destination.user_ratings_total }),
      };
    }

    // Add accepts reservations if booking URLs available
    if (destination.opentable_url || destination.resy_url || destination.booking_url) {
      restaurantSchema.acceptsReservations = true;
    }

    return restaurantSchema;
  } else if (category === 'museum') {
    return {
      ...baseSchema,
      '@type': 'Museum',
      address: buildPostalAddress(destination),
      ...(destination.rating && destination.user_ratings_total && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: destination.rating,
          bestRating: 5,
          ratingCount: destination.user_ratings_total,
        },
      }),
    };
  } else if (category === 'shop') {
    return {
      ...baseSchema,
      '@type': 'Store',
      address: buildPostalAddress(destination),
      priceRange: '$'.repeat(destination.price_level || 2),
      ...(destination.rating && destination.user_ratings_total && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: destination.rating,
          bestRating: 5,
          ratingCount: destination.user_ratings_total,
        },
      }),
    };
  } else {
    // Default to LocalBusiness for other categories
    return {
      ...baseSchema,
      '@type': 'LocalBusiness',
      address: buildPostalAddress(destination),
      ...(destination.rating && destination.user_ratings_total && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: destination.rating,
          bestRating: 5,
          ratingCount: destination.user_ratings_total,
        },
      }),
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
 * Generate Organization schema for site-wide SEO credibility
 * Includes founding date, description, and social profiles
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://www.urbanmanual.co/#organization',
    name: 'The Urban Manual',
    alternateName: 'Urban Manual',
    url: 'https://www.urbanmanual.co',
    logo: {
      '@type': 'ImageObject',
      '@id': 'https://www.urbanmanual.co/#logo',
      url: 'https://www.urbanmanual.co/logo.png',
      contentUrl: 'https://www.urbanmanual.co/logo.png',
      width: 512,
      height: 512,
      caption: 'The Urban Manual Logo',
    },
    image: {
      '@type': 'ImageObject',
      url: 'https://www.urbanmanual.co/og-image.jpg',
      width: 1200,
      height: 630,
    },
    description: 'The Urban Manual is a curated travel guide featuring 897+ handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide. AI-powered recommendations and editorial content for the discerning modern traveler.',
    slogan: 'Your curated guide to exceptional travel experiences',
    foundingDate: '2023',
    founders: [
      {
        '@type': 'Person',
        name: 'Urban Manual Team',
      },
    ],
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: 0,
        longitude: 0,
      },
      geoRadius: 40075000, // Entire globe in meters
    },
    knowsAbout: [
      'Luxury Hotels',
      'Michelin Star Restaurants',
      'Travel Destinations',
      'Boutique Hotels',
      'Fine Dining',
      'City Guides',
      'Travel Recommendations',
    ],
    sameAs: [
      'https://www.instagram.com/urbanmanual',
      'https://twitter.com/urbanmanual',
      'https://x.com/urbanmanual',
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
    inLanguage: 'en-US',
    copyrightYear: new Date().getFullYear(),
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
 * Generate Homepage Breadcrumb Schema
 * Simple single-item breadcrumb for the homepage
 */
export function generateHomeBreadcrumb() {
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
    ],
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
 * Generate breadcrumb schema for brands listing page
 */
export function generateBrandsListBreadcrumb() {
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
        name: 'Brands',
        item: 'https://www.urbanmanual.co/brands',
      },
    ],
  };
}

/**
 * Generate CollectionPage schema for brands listing
 */
export function generateBrandsCollectionSchema(brands: Array<{ brand: string; count: number; categories?: string[] }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Discover Brands - The Urban Manual',
    description: 'Explore curated travel destinations by brand. Find the best hotels, restaurants, and experiences from world-renowned brands.',
    url: 'https://www.urbanmanual.co/brands',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: brands.length,
      itemListElement: brands.slice(0, 30).map((brand, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: brand.brand,
        url: `https://www.urbanmanual.co/brand/${encodeURIComponent(brand.brand)}`,
        description: `${brand.count} curated destinations from ${brand.brand}`,
      })),
    },
  };
}

/**
 * Generate breadcrumb schema for individual brand page
 */
export function generateBrandBreadcrumb(brand: string) {
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
        name: 'Brands',
        item: 'https://www.urbanmanual.co/brands',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: brand,
        item: `https://www.urbanmanual.co/brand/${encodeURIComponent(brand)}`,
      },
    ],
  };
}

/**
 * Generate metadata for individual brand page
 */
export function generateBrandMetadata(brand: string, count?: number): Metadata {
  const title = `${brand} - Hotels & Restaurants | The Urban Manual`;
  const description = count
    ? `Discover ${count} curated ${brand} destinations worldwide. Find the best hotels, restaurants, and experiences from ${brand}.`
    : `Discover curated ${brand} destinations worldwide. Find the best hotels, restaurants, and experiences.`;
  const canonicalUrl = `https://www.urbanmanual.co/brand/${encodeURIComponent(brand)}`;

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

/**
 * Format a slug into a display name
 */
function formatSlugToName(slug: string): string {
  return decodeURIComponent(slug)
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate metadata for category-city pages (e.g., /destinations/restaurants-tokyo/)
 */
export function generateCategoryCityMetadata(category: string, city: string, count?: number): Metadata {
  const categoryName = formatSlugToName(category);
  const cityName = formatSlugToName(city);

  // SEO-optimized descriptions per category
  const categoryDescriptions: Record<string, string> = {
    restaurant: `Discover the best restaurants in ${cityName}. From Michelin-starred fine dining to local gems, find curated dining experiences.`,
    restaurants: `Discover the best restaurants in ${cityName}. From Michelin-starred fine dining to local gems, find curated dining experiences.`,
    hotel: `Find the finest hotels in ${cityName}. Luxury accommodations, boutique stays, and design-forward properties curated by The Urban Manual.`,
    hotels: `Find the finest hotels in ${cityName}. Luxury accommodations, boutique stays, and design-forward properties curated by The Urban Manual.`,
    cafe: `Explore the best cafes in ${cityName}. Specialty coffee, artisan pastries, and unique atmospheres for discerning travelers.`,
    cafes: `Explore the best cafes in ${cityName}. Specialty coffee, artisan pastries, and unique atmospheres for discerning travelers.`,
    bar: `Discover exceptional bars in ${cityName}. Cocktail lounges, speakeasies, and rooftop venues curated by The Urban Manual.`,
    bars: `Discover exceptional bars in ${cityName}. Cocktail lounges, speakeasies, and rooftop venues curated by The Urban Manual.`,
    shop: `Find curated shops in ${cityName}. Fashion boutiques, design stores, and unique local finds for the modern traveler.`,
    shops: `Find curated shops in ${cityName}. Fashion boutiques, design stores, and unique local finds for the modern traveler.`,
    museum: `Explore world-class museums in ${cityName}. Art, history, and contemporary exhibitions curated by The Urban Manual.`,
    museums: `Explore world-class museums in ${cityName}. Art, history, and contemporary exhibitions curated by The Urban Manual.`,
  };

  const description = categoryDescriptions[category.toLowerCase()] ||
    `Discover the best ${categoryName.toLowerCase()} in ${cityName}. Curated recommendations from The Urban Manual.`;

  // Add count to description if available
  const fullDescription = count
    ? `${description.slice(0, -1)} - ${count} handpicked destinations.`
    : description;

  const title = `Best ${categoryName} in ${cityName} | The Urban Manual`;
  const canonicalUrl = `https://www.urbanmanual.co/destinations/${encodeURIComponent(category.toLowerCase())}-${encodeURIComponent(city.toLowerCase())}`;

  return {
    title,
    description: fullDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: fullDescription,
      url: canonicalUrl,
      siteName: 'The Urban Manual',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: fullDescription,
    },
  };
}

/**
 * Generate breadcrumb schema for category-city pages (e.g., /destinations/restaurants-tokyo/)
 */
export function generateCategoryCityBreadcrumb(category: string, city: string) {
  const categoryName = formatSlugToName(category);
  const cityName = formatSlugToName(city);
  const slug = `${category.toLowerCase()}-${city.toLowerCase()}`;

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
      {
        '@type': 'ListItem',
        position: 3,
        name: `${categoryName} in ${cityName}`,
        item: `https://www.urbanmanual.co/destinations/${encodeURIComponent(slug)}`,
      },
    ],
  };
}

/**
 * Generate ItemList schema for category-city pages
 */
export function generateCategoryCitySchema(
  category: string,
  city: string,
  destinations: Array<{
    name: string;
    slug: string;
    image?: string | null;
    description?: string | null;
    content?: string | null;
    rating?: number | null;
    michelin_stars?: number | null;
  }>
) {
  const categoryName = formatSlugToName(category);
  const cityName = formatSlugToName(city);
  const slug = `${category.toLowerCase()}-${city.toLowerCase()}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best ${categoryName} in ${cityName}`,
    description: `Curated list of the best ${categoryName.toLowerCase()} in ${cityName}`,
    url: `https://www.urbanmanual.co/destinations/${encodeURIComponent(slug)}`,
    numberOfItems: destinations.length,
    itemListElement: destinations.slice(0, 30).map((dest, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: dest.name,
      url: `https://www.urbanmanual.co/destination/${dest.slug}`,
      ...(dest.image && { image: dest.image }),
      ...(dest.description || dest.content) && {
        description: (dest.description || dest.content || '')
          .replace(/<[^>]*>/g, '')
          .substring(0, 150),
      },
    })),
  };
}

