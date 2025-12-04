/**
 * Generate time labels for trip cards
 */

import type { TripState } from './get-trip-state';

/**
 * Get relative time label for a trip
 * - Past trips: "3 months ago"
 * - Upcoming trips: "in 10 days →"
 */
export function getTimeLabel(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  state: TripState
): string | null {
  if (state === 'past') {
    return formatRelativeTime(endDate);
  }

  if (state === 'upcoming' || state === 'planning') {
    return formatCountdown(startDate);
  }

  return null;
}

/**
 * Format a past date as relative time (e.g., "3 months ago")
 */
function formatRelativeTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays < 730) return '1 year ago';
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Format countdown to trip start (e.g., "in 10 days →")
 */
function formatCountdown(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null; // Already started
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow \u2192';
  if (diffDays < 7) return `in ${diffDays} days \u2192`;
  if (diffDays < 14) return 'in 1 week \u2192';
  if (diffDays < 30) return `in ${Math.ceil(diffDays / 7)} weeks \u2192`;
  if (diffDays < 60) return 'in 1 month \u2192';
  return `in ${Math.ceil(diffDays / 30)} months \u2192`;
}

/**
 * Get days until trip starts
 */
export function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffMs = date.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
