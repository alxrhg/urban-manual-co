/**
 * Sanity Schema Types
 *
 * All schema types are organized into:
 * - singletons: One-off documents (settings, homepage)
 * - documents: Repeatable content types (destinations, posts)
 * - objects: Reusable nested structures (blockContent, links)
 */

// Singletons
import settings from './singletons/settings';

// Documents
import destination from './documents/destination';

// Objects
import blockContent from './objects/blockContent';

export const schemaTypes = [
  // Singletons
  settings,

  // Documents
  destination,

  // Objects
  blockContent,
];
