import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';

/**
 * Sanity Client Configuration
 * 
 * Uses environment variables from Vercel Sanity integration:
 * - NEXT_PUBLIC_SANITY_PROJECT_ID
 * - NEXT_PUBLIC_SANITY_DATASET
 * - SANITY_API_TOKEN (for write operations)
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-11-18';
const token = process.env.SANITY_API_TOKEN;

if (!projectId) {
  console.warn('[Sanity] NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Sanity features will be disabled.');
}

/**
 * Sanity client for read operations
 * Public client that can be used in both server and client components
 */
export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true, // Use CDN for faster, cached responses
      perspective: 'published', // Only fetch published content
    })
  : null;

/**
 * Sanity client for write operations (admin only)
 * Requires SANITY_API_TOKEN
 */
export const sanityWriteClient = projectId && token
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false, // Don't use CDN for writes
      token,
      perspective: 'published',
    })
  : null;

/**
 * Image URL builder for Sanity images
 */
const builder = projectId
  ? imageUrlBuilder(sanityClient!)
  : null;

/**
 * Generate optimized image URL from Sanity image source
 */
export function urlFor(source: SanityImageSource) {
  if (!builder) {
    console.warn('[Sanity] Image builder not available. NEXT_PUBLIC_SANITY_PROJECT_ID is required.');
    return {
      width: () => ({ url: () => '' }),
      height: () => ({ url: () => '' }),
      url: () => '',
    };
  }
  return builder.image(source);
}

/**
 * Check if Sanity is properly configured
 */
export function isSanityConfigured(): boolean {
  return !!projectId;
}

