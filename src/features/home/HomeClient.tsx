'use client';

/**
 * HomeClient - Interactive homepage client component
 *
 * This component receives pre-fetched data from the server and handles
 * all interactive functionality including:
 * - Search and filtering
 * - User authentication state
 * - Destination grid/map views
 * - Real-time updates
 *
 * Performance optimizations:
 * - Receives server-fetched destinations (no initial waterfall)
 * - Uses dynamic imports for heavy components
 * - Implements progressive enhancement
 */

import type { Destination } from '@/types/destination';

export type HomeClientProps = {
  /** Pre-fetched destinations from server */
  initialDestinations?: Destination[];
  /** Pre-fetched city options from server */
  initialCities?: string[];
  /** Pre-fetched category options from server */
  initialCategories?: string[];
};

/**
 * Re-export the implementation with proper typing
 */
export { default as HomeClient, type HomeClientImplProps } from './HomeClientImpl';
