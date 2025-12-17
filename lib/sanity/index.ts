/**
 * Sanity Integration - Barrel Export
 *
 * Re-exports all Sanity utilities for convenient imports:
 *
 *   import { client, sanityFetch, urlFor } from '@/lib/sanity';
 */

// Client and fetching
export { client, sanityFetch, getWriteClient, type SanityClient } from './client';

// Live content (for real-time updates)
export { sanityFetch as sanityFetchLive, SanityLive } from './live';

// Environment configuration
export { apiVersion, dataset, projectId, studioUrl, getProjectId, getDataset } from './env';

// Image utilities
export {
  urlFor,
  generateSrcSet,
  getPlaceholderUrl,
  hasValidAsset,
  type SanityImage,
} from './image';

// Queries
export * from './queries';

// Field mapping (for sync)
export * from './field-mapping';
