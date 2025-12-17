/**
 * Sanity Client Configuration
 *
 * This module exports a configured Sanity client for use throughout the application.
 * Uses stega encoding for visual editing support in the Presentation Tool.
 */

import { createClient, type QueryParams } from 'next-sanity';
import { apiVersion, dataset, projectId, studioUrl } from './env';

/**
 * Main Sanity client for fetching published content
 * Includes stega configuration for visual editing
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === 'production',
  perspective: 'published',
  stega: {
    studioUrl,
    // Uncomment for verbose logging during development
    // logger: console,
    filter: (props) => {
      // Only encode 'title' and similar display fields
      if (props.sourcePath.at(-1) === 'title') {
        return true;
      }
      return props.filterDefault(props);
    },
  },
});

/**
 * Write client with authentication token
 * Use this for mutations (create, update, delete)
 */
export function getWriteClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN;

  if (!token) {
    throw new Error('Missing SANITY_API_WRITE_TOKEN for write operations');
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token,
  });
}

/**
 * Fetch helper with consistent error handling
 */
export async function sanityFetch<T>({
  query,
  params = {},
  tags = [],
}: {
  query: string;
  params?: QueryParams;
  tags?: string[];
}): Promise<T> {
  return client.fetch<T>(query, params, {
    next: {
      revalidate: process.env.NODE_ENV === 'development' ? 30 : 3600,
      tags,
    },
  });
}

export type SanityClient = typeof client;
