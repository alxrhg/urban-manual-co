/**
 * Timeline Configuration
 * Shared styles and constants for the DayTimeline components
 * Inspired by Square UI design patterns
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
  // Square UI inspired stripe colors
  stripeColor: string;
  bgColor: string;
  borderColor: string;
}

const baseStyle: CategoryStyle = {
  accent: 'bg-gray-300 dark:bg-gray-600',
  iconColor: 'text-gray-400 dark:text-gray-500',
  stripeColor: '#94a3b8', // slate-400
  bgColor: 'bg-slate-50/80 dark:bg-slate-800/50',
  borderColor: 'border-slate-200 dark:border-slate-700',
};

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  // Food & Drink - orange/amber accent (Square UI style)
  breakfast: {
    accent: 'bg-orange-400 dark:bg-orange-500',
    iconColor: 'text-orange-500 dark:text-orange-400',
    stripeColor: '#f97316', // orange-500
    bgColor: 'bg-orange-50/80 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800/50',
  },
  cafe: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
    stripeColor: '#f59e0b', // amber-500
    bgColor: 'bg-amber-50/80 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
  },
  restaurant: {
    accent: 'bg-orange-400 dark:bg-orange-500',
    iconColor: 'text-orange-500 dark:text-orange-400',
    stripeColor: '#f97316', // orange-500
    bgColor: 'bg-orange-50/80 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800/50',
  },
  bar: {
    accent: 'bg-pink-400 dark:bg-pink-500',
    iconColor: 'text-pink-500 dark:text-pink-400',
    stripeColor: '#ec4899', // pink-500
    bgColor: 'bg-pink-50/80 dark:bg-pink-950/30',
    borderColor: 'border-pink-200 dark:border-pink-800/50',
  },

  // Culture - indigo accent (Square UI style)
  museum: {
    accent: 'bg-indigo-400 dark:bg-indigo-500',
    iconColor: 'text-indigo-500 dark:text-indigo-400',
    stripeColor: '#6366f1', // indigo-500
    bgColor: 'bg-indigo-50/80 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800/50',
  },
  gallery: {
    accent: 'bg-purple-400 dark:bg-purple-500',
    iconColor: 'text-purple-500 dark:text-purple-400',
    stripeColor: '#a855f7', // purple-500
    bgColor: 'bg-purple-50/80 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800/50',
  },

  // Transport - blue accent (Square UI style)
  flight: {
    accent: 'bg-blue-400 dark:bg-blue-500',
    iconColor: 'text-blue-500 dark:text-blue-400',
    stripeColor: '#3b82f6', // blue-500
    bgColor: 'bg-blue-50/80 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800/50',
  },
  train: {
    accent: 'bg-cyan-400 dark:bg-cyan-500',
    iconColor: 'text-cyan-500 dark:text-cyan-400',
    stripeColor: '#06b6d4', // cyan-500
    bgColor: 'bg-cyan-50/80 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800/50',
  },

  // Activities - emerald accent (Square UI style)
  activity: {
    accent: 'bg-emerald-400 dark:bg-emerald-500',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    stripeColor: '#10b981', // emerald-500
    bgColor: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
  },

  // Accommodation - yellow accent (Square UI style)
  hotel: {
    accent: 'bg-yellow-400 dark:bg-yellow-500',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    stripeColor: '#eab308', // yellow-500
    bgColor: 'bg-yellow-50/80 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800/50',
  },

  // Default
  default: baseStyle,
};

export function getCategoryStyle(type?: string): CategoryStyle {
  if (!type) return CATEGORY_STYLES.default;
  return CATEGORY_STYLES[type] || CATEGORY_STYLES.default;

}

/**
 * Generate Square UI style stripe pattern CSS
 * Creates a repeating diagonal stripe for card bottom accent
 */
export function getStripePattern(color: string): string {
  return `repeating-linear-gradient(
    90deg,
    ${color} 0px,
    ${color} 4px,
    transparent 4px,
    transparent 8px
  )`;
}
