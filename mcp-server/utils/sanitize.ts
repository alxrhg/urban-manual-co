/**
 * Sanitization Utilities for MCP Server
 *
 * Provides input sanitization to prevent SQL injection and other attacks.
 */

/**
 * Escape SQL ILIKE wildcards for safe use in Supabase ILIKE queries.
 * Prevents users from injecting wildcards that could bypass filters.
 *
 * @example
 * ```ts
 * const query = "100%";
 * const safe = escapeForIlike(query); // "100\\%"
 * supabase.from('table').ilike('column', `%${safe}%`);
 * ```
 */
export function escapeForIlike(input: string): string {
  if (!input) return '';

  return input
    .trim()
    // Escape backslashes first (since we're using them for escaping)
    .replace(/\\/g, '\\\\')
    // Escape percent sign (wildcard for any sequence)
    .replace(/%/g, '\\%')
    // Escape underscore (wildcard for single character)
    .replace(/_/g, '\\_');
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  return query
    // Trim whitespace
    .trim()
    // Remove null bytes
    .replace(/\x00/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Limit length
    .slice(0, 200);
}

/**
 * Sanitize and escape input for safe use in SQL ILIKE queries.
 * Combines search query sanitization with ILIKE escaping.
 */
export function sanitizeForIlike(input: string): string {
  return escapeForIlike(sanitizeSearchQuery(input));
}
