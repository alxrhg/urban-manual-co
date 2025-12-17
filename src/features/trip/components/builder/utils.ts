/**
 * TripBuilder Utilities
 *
 * Helper functions for the trip builder components
 */

import { InsightType, InsightIcon } from './types';

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format date to display string
 */
export function formatDate(
  dateString: string,
  format: 'short' | 'medium' | 'long' = 'short'
): string {
  const date = new Date(dateString);

  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'medium':
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    case 'long':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
  }
}

/**
 * Format time slot (e.g., "09:00" -> "9:00 AM")
 */
export function formatTimeSlot(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ============================================
// STYLE UTILITIES
// ============================================

/**
 * Get color class based on crowd level
 */
export function getCrowdColor(level?: number): string {
  if (!level) return 'text-gray-400';
  if (level < 30) return 'text-green-500';
  if (level < 60) return 'text-yellow-500';
  return 'text-red-500';
}

/**
 * Get health badge color based on score
 */
export function getHealthColor(score: number): string {
  if (score >= 80)
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (score >= 60)
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  if (score >= 40)
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
}

/**
 * Get insight type color classes
 */
export function getInsightColor(type: InsightType): string {
  switch (type) {
    case 'warning':
      return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
    case 'success':
      return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
    case 'tip':
    default:
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
  }
}

/**
 * Get insight icon name mapping
 */
export function getInsightIconName(icon: InsightIcon): string {
  const iconMap: Record<InsightIcon, string> = {
    clock: 'Clock',
    route: 'Route',
    crowd: 'Users',
    weather: 'CloudRain',
    food: 'Utensils',
    category: 'Sparkles',
  };
  return iconMap[icon] || 'Info';
}

// ============================================
// EVENT UTILITIES
// ============================================

/**
 * Dispatch custom event to open a destination
 */
export function openDestination(slug: string): void {
  const event = new CustomEvent('openDestination', { detail: { slug } });
  window.dispatchEvent(event);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Check if a time slot is valid
 */
export function isValidTimeSlot(time: string): boolean {
  const pattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return pattern.test(time);
}

/**
 * Check if a date string is valid
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// ============================================
// ARRAY UTILITIES
// ============================================

/**
 * Move an item within an array
 */
export function moveArrayItem<T>(
  array: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

/**
 * Generate array of day numbers
 */
export function getDayNumbers(totalDays: number, excludeDay?: number): number[] {
  return Array.from({ length: totalDays }, (_, i) => i + 1).filter(
    (d) => d !== excludeDay
  );
}
