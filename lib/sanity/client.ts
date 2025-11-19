import { createClient } from '@sanity/client';

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  || process.env.SANITY_STUDIO_PROJECT_ID
  || process.env.SANITY_API_PROJECT_ID;

const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET
  || process.env.SANITY_STUDIO_DATASET
  || process.env.SANITY_API_DATASET
  || 'production';

const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION
  || process.env.SANITY_API_VERSION
  || '2023-10-01';

if (!projectId) {
  throw new Error('Missing Sanity project ID. Set NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID.');
}

const token =
  process.env.SANITY_TOKEN
  || process.env.SANITY_API_WRITE_TOKEN
  || process.env.SANITY_API_READ_TOKEN;

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NEXT_PUBLIC_SANITY_USE_CDN !== 'false',
  perspective: 'published',
  token,
});

export type SanityClient = typeof sanityClient;
