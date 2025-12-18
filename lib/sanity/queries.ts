/**
 * Centralized GROQ Queries
 *
 * All Sanity queries are defined here for consistency and reusability.
 * Use these with sanityFetch from './client' or './live'.
 *
 * Pattern:
 * - Export query strings as constants
 * - Use fragments for reusable field selections
 * - Name queries descriptively (e.g., getDestinationBySlugQuery)
 */

import { groq } from 'next-sanity';

// ═══════════════════════════════════════════════════════════════════════════
// FIELD FRAGMENTS - Reusable field selections
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Core destination fields for list views and cards
 */
export const destinationCardFields = groq`
  _id,
  _type,
  name,
  "slug": slug.current,
  categories,
  "category": categories[0],
  microDescription,
  city,
  country,
  crown,
  michelinStars,
  rating,
  priceLevel,
  "imageUrl": coalesce(
    heroImage.asset->url,
    imageUrl
  ),
  "heroImage": heroImage {
    asset->{
      _id,
      url,
      metadata {
        dimensions,
        lqip
      }
    },
    alt,
    hotspot
  },
  brand,
  "brandRef": brandRef->{
    _id,
    name,
    "slug": slug.current,
    "logoUrl": logo.asset->url,
    "logoIconUrl": logoIcon.asset->url,
    brandColor
  }
`;

/**
 * Full destination fields for detail pages
 */
export const destinationDetailFields = groq`
  ${destinationCardFields},
  _createdAt,
  _updatedAt,
  description,
  content,
  tags,
  brand,
  "brandRef": brandRef->{
    _id,
    name,
    "slug": slug.current,
    "logo": logo {
      asset->{
        _id,
        url,
        metadata {
          dimensions,
          lqip
        }
      },
      alt
    },
    "logoDark": logoDark {
      asset->{
        _id,
        url
      },
      alt
    },
    "logoIcon": logoIcon.asset->url,
    brandColor,
    tier,
    website
  },
  neighborhood,
  geopoint,
  formattedAddress,
  gallery[] {
    asset->{
      _id,
      url,
      metadata {
        dimensions,
        lqip
      }
    },
    alt,
    caption
  },
  editorialSummary,
  architect,
  interiorDesigner,
  designFirm,
  architecturalStyle,
  designPeriod,
  constructionYear,
  architecturalSignificance,
  designStory,
  designAwards,
  website,
  phoneNumber,
  instagramHandle,
  opentableUrl,
  resyUrl,
  bookingUrl,
  googleMapsUrl,
  placeId,
  userRatingsTotal,
  openingHours,
  "parentDestination": parentDestination->{
    _id,
    name,
    "slug": slug.current
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// DESTINATION QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all published destinations (for list views)
 * Uses Sanity's native publish state - excludes documents with 'drafts.' prefix
 */
export const allDestinationsQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**"))] | order(name asc) {
    ${destinationCardFields}
  }
`;

/**
 * Get destinations by city
 */
export const destinationsByCityQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**")) && city == $city] | order(name asc) {
    ${destinationCardFields}
  }
`;

/**
 * Get destinations by category
 */
export const destinationsByCategoryQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**")) && $category in categories] | order(name asc) {
    ${destinationCardFields}
  }
`;

/**
 * Get featured/crown destinations
 */
export const featuredDestinationsQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**")) && crown == true] | order(name asc) {
    ${destinationCardFields}
  }
`;

/**
 * Get Michelin-starred destinations
 */
export const michelinDestinationsQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**")) && michelinStars > 0] | order(michelinStars desc, name asc) {
    ${destinationCardFields}
  }
`;

/**
 * Get a single destination by slug
 */
export const getDestinationBySlugQuery = groq`
  *[_type == "destination" && slug.current == $slug][0] {
    ${destinationDetailFields}
  }
`;

/**
 * Get destination by ID
 */
export const getDestinationByIdQuery = groq`
  *[_type == "destination" && _id == $id][0] {
    ${destinationDetailFields}
  }
`;

/**
 * Get related destinations (same city, different destination)
 */
export const relatedDestinationsQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**")) && city == $city && slug.current != $currentSlug][0...6] {
    ${destinationCardFields}
  }
`;

/**
 * Search destinations by name or city
 */
export const searchDestinationsQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**")) && (
    name match $searchTerm ||
    city match $searchTerm ||
    country match $searchTerm ||
    $searchTerm in categories
  )] | order(name asc) {
    ${destinationCardFields}
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// METADATA QUERIES (for generateStaticParams, sitemap, etc.)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all destination slugs (for static generation)
 */
export const allDestinationSlugsQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**")) && defined(slug.current)] {
    "slug": slug.current
  }
`;

/**
 * Get all unique cities
 */
export const allCitiesQuery = groq`
  array::unique(*[_type == "destination" && !(_id in path("drafts.**"))].city)
`;

/**
 * Get all unique categories
 */
export const allCategoriesQuery = groq`
  array::unique(*[_type == "destination" && !(_id in path("drafts.**"))].categories[])
`;

/**
 * Sitemap data - all destinations with update timestamps
 */
export const sitemapDestinationsQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**"))] {
    "slug": slug.current,
    _updatedAt
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// BRAND QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Brand fields for list views and cards
 */
export const brandCardFields = groq`
  _id,
  _type,
  name,
  "slug": slug.current,
  description,
  categories,
  tier,
  "logo": logo {
    asset->{
      _id,
      url,
      metadata {
        dimensions,
        lqip
      }
    },
    alt
  },
  "logoDark": logoDark {
    asset->{
      _id,
      url
    },
    alt
  },
  "logoIcon": logoIcon.asset->url,
  brandColor,
  website
`;

/**
 * Full brand fields for detail pages
 */
export const brandDetailFields = groq`
  ${brandCardFields},
  _createdAt,
  _updatedAt,
  founded,
  headquarters,
  "heroImage": heroImage {
    asset->{
      _id,
      url,
      metadata {
        dimensions,
        lqip
      }
    },
    alt,
    caption
  },
  instagramHandle,
  linkedinUrl
`;

/**
 * Get all brands
 */
export const allBrandsQuery = groq`
  *[_type == "brand" && !(_id in path("drafts.**"))] | order(name asc) {
    ${brandCardFields}
  }
`;

/**
 * Get a single brand by slug
 */
export const getBrandBySlugQuery = groq`
  *[_type == "brand" && slug.current == $slug][0] {
    ${brandDetailFields}
  }
`;

/**
 * Get a brand by ID
 */
export const getBrandByIdQuery = groq`
  *[_type == "brand" && _id == $id][0] {
    ${brandDetailFields}
  }
`;

/**
 * Get all brand slugs (for static generation)
 */
export const allBrandSlugsQuery = groq`
  *[_type == "brand" && !(_id in path("drafts.**")) && defined(slug.current)] {
    "slug": slug.current
  }
`;

/**
 * Get destinations by brand reference
 */
export const destinationsByBrandQuery = groq`
  *[_type == "destination" && !(_id in path("drafts.**")) && brandRef._ref == $brandId] | order(name asc) {
    ${destinationCardFields}
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS QUERIES (for future use)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get site settings (if settings document type is added)
 */
export const settingsQuery = groq`
  *[_type == "settings"][0] {
    title,
    description,
    ogImage
  }
`;
