/**
 * Server-only Sanity API Token
 *
 * This module ensures the Sanity API token is only accessible on the server.
 * The 'server-only' import will cause a build error if this file is
 * imported in a client component.
 */

import 'server-only';

export const token = process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN || '';

/**
 * Get token with validation
 * Use this when you need to ensure the token exists
 */
export function getToken(): string {
  if (!token) {
    throw new Error(
      'Missing SANITY_API_READ_TOKEN. Please set it in your environment variables.'
    );
  }
  return token;
}
