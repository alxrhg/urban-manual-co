/**
 * Sanity Image URL Builder
 *
 * Utility for generating optimized image URLs from Sanity assets.
 * Supports responsive images, format conversion, and hotspot cropping.
 *
 * Usage:
 *   import { urlFor } from '@/lib/sanity/image';
 *
 *   // Basic usage
 *   <img src={urlFor(destination.heroImage).width(800).url()} />
 *
 *   // With responsive sizes
 *   <img
 *     src={urlFor(image).width(400).url()}
 *     srcSet={`
 *       ${urlFor(image).width(400).url()} 400w,
 *       ${urlFor(image).width(800).url()} 800w,
 *       ${urlFor(image).width(1200).url()} 1200w
 *     `}
 *   />
 */

import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { client } from './client';

const builder = imageUrlBuilder(client);

/**
 * Generate image URL from Sanity image reference
 *
 * @param source - Sanity image reference object
 * @returns ImageUrlBuilder instance for chaining
 *
 * @example
 * // Basic URL
 * urlFor(image).url()
 *
 * // With dimensions
 * urlFor(image).width(800).height(600).url()
 *
 * // With format conversion
 * urlFor(image).width(800).format('webp').url()
 *
 * // Fit modes: clip, crop, fill, fillmax, max, scale, min
 * urlFor(image).width(800).height(600).fit('crop').url()
 *
 * // Quality (1-100)
 * urlFor(image).width(800).quality(80).url()
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/**
 * Generate a responsive image srcSet string
 *
 * @param source - Sanity image reference
 * @param widths - Array of widths for srcSet
 * @returns srcSet string
 */
export function generateSrcSet(
  source: SanityImageSource,
  widths: number[] = [400, 800, 1200, 1600]
): string {
  return widths
    .map((width) => `${urlFor(source).width(width).auto('format').url()} ${width}w`)
    .join(', ');
}

/**
 * Get placeholder image URL (low quality image placeholder)
 *
 * @param source - Sanity image reference
 * @returns Low resolution placeholder URL
 */
export function getPlaceholderUrl(source: SanityImageSource): string {
  return urlFor(source).width(20).quality(30).blur(10).url();
}

/**
 * Type for Sanity image with asset reference
 */
export interface SanityImage {
  _type: 'image';
  asset?: {
    _ref?: string;
    _type?: 'reference';
    url?: string;
    metadata?: {
      dimensions?: {
        width: number;
        height: number;
        aspectRatio: number;
      };
      lqip?: string;
    };
  };
  hotspot?: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  alt?: string;
  caption?: string;
}

/**
 * Check if a Sanity image has a valid asset reference
 */
export function hasValidAsset(image: SanityImage | null | undefined): boolean {
  return !!(image?.asset?._ref || image?.asset?.url);
}
