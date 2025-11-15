/**
 * Utility functions for architect pages
 */

/**
 * Convert architect name to URL-friendly slug
 * Example: "Renzo Piano" -> "renzo-piano"
 */
export function architectNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace common separators with hyphens
    .replace(/[&,]/g, '-')
    // Replace multiple spaces/hyphens with single hyphen
    .replace(/[\s\-]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^a-z0-9\-]/g, '')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert slug back to display name (capitalize words)
 * Example: "renzo-piano" -> "Renzo Piano"
 */
export function slugToArchitectName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

