/**
 * Types for the Destination Service Layer
 *
 * This module defines types used across the destination service,
 * ensuring consistent data handling between Sanity and Supabase.
 */

import type { Destination } from '@/types/destination';

/**
 * Sanity destination document structure (subset for querying)
 */
export interface SanityDestinationCard {
  _id: string;
  _type: 'destination';
  name: string;
  slug: string;
  categories?: string[];
  category?: string;
  microDescription?: string;
  city: string;
  country?: string;
  crown?: boolean;
  michelinStars?: number;
  rating?: number;
  priceLevel?: number;
  imageUrl?: string;
  heroImage?: {
    asset?: {
      _id: string;
      url: string;
      metadata?: {
        dimensions?: { width: number; height: number };
        lqip?: string;
      };
    };
    alt?: string;
    hotspot?: { x: number; y: number; height: number; width: number };
  };
}

/**
 * Full Sanity destination document for detail pages
 */
export interface SanityDestinationDetail extends SanityDestinationCard {
  _createdAt?: string;
  _updatedAt?: string;
  description?: string;
  content?: string;
  tags?: string[];
  brand?: string;
  neighborhood?: string;
  geopoint?: { lat: number; lng: number };
  formattedAddress?: string;
  gallery?: Array<{
    asset?: {
      _id: string;
      url: string;
      metadata?: {
        dimensions?: { width: number; height: number };
        lqip?: string;
      };
    };
    alt?: string;
    caption?: string;
  }>;
  editorialSummary?: string;
  architect?: string;
  interiorDesigner?: string;
  designFirm?: string;
  architecturalStyle?: string;
  designPeriod?: string;
  constructionYear?: number;
  architecturalSignificance?: string;
  designStory?: string;
  designAwards?: Array<{ name: string; year: number; organization: string }>;
  website?: string;
  phoneNumber?: string;
  instagramHandle?: string;
  opentableUrl?: string;
  resyUrl?: string;
  bookingUrl?: string;
  googleMapsUrl?: string;
  placeId?: string;
  userRatingsTotal?: number;
  openingHours?: { weekdayText?: string[]; openNow?: boolean };
  parentDestination?: {
    _id: string;
    name: string;
    slug: string;
  };
}

/**
 * Options for fetching destinations
 */
export interface FetchDestinationsOptions {
  limit?: number;
  city?: string;
  category?: string;
  featured?: boolean;
  orderBy?: 'name' | 'rating' | 'created';
}

/**
 * Result from the destination service
 */
export interface DestinationServiceResult<T> {
  data: T;
  source: 'sanity' | 'supabase';
  cached?: boolean;
}

/**
 * Transform Sanity destination card to Destination type
 */
export function transformSanityCardToDestination(
  sanityDoc: SanityDestinationCard
): Destination {
  return {
    slug: sanityDoc.slug,
    name: sanityDoc.name,
    city: sanityDoc.city,
    country: sanityDoc.country,
    category: sanityDoc.category || sanityDoc.categories?.[0] || '',
    micro_description: sanityDoc.microDescription,
    image: sanityDoc.heroImage?.asset?.url || sanityDoc.imageUrl,
    michelin_stars: sanityDoc.michelinStars,
    crown: sanityDoc.crown,
    rating: sanityDoc.rating,
    price_level: sanityDoc.priceLevel,
  };
}

/**
 * Transform Sanity destination detail to Destination type
 */
export function transformSanityDetailToDestination(
  sanityDoc: SanityDestinationDetail
): Destination {
  const base = transformSanityCardToDestination(sanityDoc);

  return {
    ...base,
    description: sanityDoc.description,
    content: sanityDoc.content,
    tags: sanityDoc.tags,
    brand: sanityDoc.brand,
    neighborhood: sanityDoc.neighborhood,
    latitude: sanityDoc.geopoint?.lat,
    longitude: sanityDoc.geopoint?.lng,
    formatted_address: sanityDoc.formattedAddress,
    editorial_summary: sanityDoc.editorialSummary,
    architect: sanityDoc.architect,
    interior_designer: sanityDoc.interiorDesigner,
    design_firm: sanityDoc.designFirm,
    architectural_style: sanityDoc.architecturalStyle,
    design_period: sanityDoc.designPeriod,
    construction_year: sanityDoc.constructionYear,
    architectural_significance: sanityDoc.architecturalSignificance,
    design_story: sanityDoc.designStory,
    design_awards: sanityDoc.designAwards as any,
    website: sanityDoc.website,
    phone_number: sanityDoc.phoneNumber,
    instagram_url: sanityDoc.instagramHandle
      ? `https://instagram.com/${sanityDoc.instagramHandle.replace('@', '')}`
      : undefined,
    instagram_handle: sanityDoc.instagramHandle,
    opentable_url: sanityDoc.opentableUrl,
    resy_url: sanityDoc.resyUrl,
    booking_url: sanityDoc.bookingUrl,
    google_maps_url: sanityDoc.googleMapsUrl,
    place_id: sanityDoc.placeId,
    user_ratings_total: sanityDoc.userRatingsTotal,
    opening_hours_json: sanityDoc.openingHours as any,
  };
}
