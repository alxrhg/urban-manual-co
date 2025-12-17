/**
 * Sanity Live Content API
 *
 * This module configures real-time content updates using next-sanity's defineLive.
 * It enables automatic revalidation and refreshing of fetched content.
 *
 * Usage:
 *   import { sanityFetch, SanityLive } from '@/lib/sanity/live';
 *
 *   // In server component:
 *   const { data } = await sanityFetch({ query: '...' });
 *
 *   // In layout (for live updates):
 *   <SanityLive />
 */

import { defineLive } from 'next-sanity';
import { client } from './client';
import { token } from './token';

export const { sanityFetch, SanityLive } = defineLive({
  client,
  // Server token enables:
  // - Draft content in Sanity Presentation Tool
  // - Vercel Toolbar Edit Mode
  serverToken: token,
  // Browser token enables:
  // - Standalone live previews
  // - Only shared with browser in valid Draft Mode sessions
  browserToken: token,
});
