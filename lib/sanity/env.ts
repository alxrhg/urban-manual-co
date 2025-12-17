/**
 * Sanity Environment Configuration
 *
 * Centralized environment variable handling for Sanity integration.
 * This ensures consistent configuration across client and server.
 */

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01';

export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'production';

export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '';

// Used for preview/visual editing
export const studioUrl = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || '/studio';

// Validate required environment variables
function assertValue<T>(value: T | undefined, errorMessage: string): T {
  if (value === undefined || value === '') {
    throw new Error(errorMessage);
  }
  return value;
}

export function getProjectId(): string {
  return assertValue(
    projectId,
    'Missing NEXT_PUBLIC_SANITY_PROJECT_ID. Please set it in your environment variables.'
  );
}

export function getDataset(): string {
  return assertValue(
    dataset,
    'Missing NEXT_PUBLIC_SANITY_DATASET. Please set it in your environment variables.'
  );
}
