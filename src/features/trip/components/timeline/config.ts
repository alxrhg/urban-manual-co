/**
 * Timeline Configuration
 * Shared styles and constants for the DayTimeline components
 */

export const TIMELINE_CONFIG = {
  pixelsPerMinute: 1.05,
  gridMinutes: 30,
  defaultStartHour: 6,
  defaultEndHour: 24,
  minCardHeight: 44,
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
  accent: string;
  iconColor: string;
}

const baseStyle: CategoryStyle = {
  accent: 'bg-gray-300 dark:bg-gray-600',
  iconColor: 'text-gray-400 dark:text-gray-500',
};

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  // Food & Drink - amber accent
  breakfast: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  cafe: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  restaurant: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  bar: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },

  // Culture - gray accent
  museum: {
    accent: 'bg-gray-400 dark:bg-gray-500',
    iconColor: 'text-gray-500 dark:text-gray-400',
  },
  gallery: {
    accent: 'bg-gray-400 dark:bg-gray-500',
    iconColor: 'text-gray-500 dark:text-gray-400',
  },

  // Transport - blue accent
  flight: {
    accent: 'bg-blue-400 dark:bg-blue-500',
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
  train: {
    accent: 'bg-blue-400 dark:bg-blue-500',
    iconColor: 'text-blue-500 dark:text-blue-400',
  },

  // Activities - emerald accent
  activity: {
    accent: 'bg-emerald-400 dark:bg-emerald-500',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },

  // Accommodation - amber accent
  hotel: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },

  // Default
  default: baseStyle,
};

export function getCategoryStyle(type?: string): CategoryStyle {
  if (!type) return CATEGORY_STYLES.default;
  return CATEGORY_STYLES[type] || CATEGORY_STYLES.default;
}
