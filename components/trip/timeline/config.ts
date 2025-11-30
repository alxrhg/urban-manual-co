/**
 * Timeline Configuration
 * Shared styles and constants for the DayTimeline components
 */

export const TIMELINE_CONFIG = {
  pixelsPerMinute: 1.05,
  gridMinutes: 30,
  defaultStartHour: 6,
  defaultEndHour: 24,
  minCardHeight: 48,
  laneOffset: 8,
  scrollableMaxHeight: 500,
} as const;

export type CategoryType =
  | 'breakfast'
  | 'cafe'
  | 'restaurant'
  | 'bar'
  | 'museum'
  | 'gallery'
  | 'flight'
  | 'train'
  | 'activity'
  | 'hotel'
  | 'default';

export interface CategoryStyle {
  text: string;
  border: string;
  bg: string;
  iconBg: string;
  iconColor: string;
}

const baseStyle: CategoryStyle = {
  text: 'text-gray-900 dark:text-white',
  border: 'border-gray-200 dark:border-gray-800',
  bg: 'bg-white dark:bg-gray-900',
  iconBg: 'bg-gray-100 dark:bg-gray-800',
  iconColor: 'text-gray-500 dark:text-gray-400',
};

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  // Food & Drink
  breakfast: {
    ...baseStyle,
    iconColor: 'text-amber-600 dark:text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  cafe: {
    ...baseStyle,
    iconColor: 'text-amber-600 dark:text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  restaurant: {
    ...baseStyle,
    iconColor: 'text-amber-600 dark:text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  bar: {
    ...baseStyle,
    iconColor: 'text-amber-600 dark:text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
  },

  // Culture
  museum: {
    ...baseStyle,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
  },
  gallery: {
    ...baseStyle,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
  },

  // Transport
  flight: {
    ...baseStyle,
    iconColor: 'text-blue-600 dark:text-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  train: {
    ...baseStyle,
    iconColor: 'text-blue-600 dark:text-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
  },

  // Activities
  activity: {
    ...baseStyle,
    iconColor: 'text-emerald-600 dark:text-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },

  // Accommodation
  hotel: {
    ...baseStyle,
    iconColor: 'text-amber-600 dark:text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
  },

  // Default
  default: baseStyle,
};

export function getCategoryStyle(type?: string): CategoryStyle {
  if (!type) return CATEGORY_STYLES.default;
  return CATEGORY_STYLES[type] || CATEGORY_STYLES.default;
}
