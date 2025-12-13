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

/**
 * Item priority determines visual weight in the timeline
 * - 'anchor': Fixed, immovable items (flights, confirmed reservations) - strongest visual presence
 * - 'highlight': Main moments of the day (key restaurant, hero attraction) - prominent but flexible
 * - 'standard': Normal activities and stops - balanced visual weight
 * - 'supporting': Transit, logistics, breaks - subtle, background presence
 */
export type ItemPriority = 'anchor' | 'highlight' | 'standard' | 'supporting';

export interface CategoryStyle {
  accent: string;
  iconColor: string;
  /** Default priority for this category */
  defaultPriority: ItemPriority;
}

const baseStyle: CategoryStyle = {
  accent: 'bg-gray-300 dark:bg-gray-600',
  iconColor: 'text-gray-400 dark:text-gray-500',
  defaultPriority: 'standard',
};

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  // Food & Drink - amber accent
  breakfast: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
    defaultPriority: 'supporting', // Morning routine, background item
  },
  cafe: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
    defaultPriority: 'standard',
  },
  restaurant: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
    defaultPriority: 'highlight', // Often a main event of the day
  },
  bar: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
    defaultPriority: 'standard',
  },

  // Culture - gray accent
  museum: {
    accent: 'bg-gray-400 dark:bg-gray-500',
    iconColor: 'text-gray-500 dark:text-gray-400',
    defaultPriority: 'highlight', // Major cultural experiences
  },
  gallery: {
    accent: 'bg-gray-400 dark:bg-gray-500',
    iconColor: 'text-gray-500 dark:text-gray-400',
    defaultPriority: 'standard',
  },

  // Transport - blue accent (anchors - fixed times)
  flight: {
    accent: 'bg-blue-400 dark:bg-blue-500',
    iconColor: 'text-blue-500 dark:text-blue-400',
    defaultPriority: 'anchor', // Immovable, fixed time
  },
  train: {
    accent: 'bg-blue-400 dark:bg-blue-500',
    iconColor: 'text-blue-500 dark:text-blue-400',
    defaultPriority: 'anchor', // Scheduled transport
  },
  transit: {
    accent: 'bg-gray-300 dark:bg-gray-600',
    iconColor: 'text-gray-400 dark:text-gray-500',
    defaultPriority: 'supporting', // Background logistics
  },
  transfer: {
    accent: 'bg-gray-300 dark:bg-gray-600',
    iconColor: 'text-gray-400 dark:text-gray-500',
    defaultPriority: 'supporting',
  },

  // Activities - emerald accent
  activity: {
    accent: 'bg-emerald-400 dark:bg-emerald-500',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    defaultPriority: 'standard',
  },

  // Accommodation - amber accent
  hotel: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
    defaultPriority: 'anchor', // Check-in/out times are fixed
  },
  checkin: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
    defaultPriority: 'supporting', // Logistics
  },
  checkout: {
    accent: 'bg-amber-400 dark:bg-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
    defaultPriority: 'supporting',
  },

  // Default
  default: baseStyle,
};

export function getCategoryStyle(type?: string): CategoryStyle {
  if (!type) return CATEGORY_STYLES.default;
  return CATEGORY_STYLES[type] || CATEGORY_STYLES.default;
}

/**
 * Priority-based visual styling
 * Creates clear visual hierarchy: anchors stand out, supporting items recede
 */
export interface PriorityStyle {
  /** Card background opacity and style */
  cardBg: string;
  /** Border/ring treatment */
  border: string;
  /** Text weight for title */
  titleWeight: string;
  /** Opacity for secondary text */
  subtextOpacity: string;
  /** Whether to show a subtle anchor indicator */
  showAnchorBadge: boolean;
}

export const PRIORITY_STYLES: Record<ItemPriority, PriorityStyle> = {
  anchor: {
    cardBg: 'bg-white dark:bg-gray-800',
    border: 'ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm',
    titleWeight: 'font-semibold',
    subtextOpacity: 'opacity-100',
    showAnchorBadge: true,
  },
  highlight: {
    cardBg: 'bg-gray-50/90 dark:bg-gray-800/70',
    border: 'ring-1 ring-black/[0.06] dark:ring-white/[0.08]',
    titleWeight: 'font-medium',
    subtextOpacity: 'opacity-100',
    showAnchorBadge: false,
  },
  standard: {
    cardBg: 'bg-gray-50/80 dark:bg-gray-800/50',
    border: 'ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
    titleWeight: 'font-medium',
    subtextOpacity: 'opacity-90',
    showAnchorBadge: false,
  },
  supporting: {
    cardBg: 'bg-gray-50/60 dark:bg-gray-800/30',
    border: 'ring-1 ring-black/[0.03] dark:ring-white/[0.04]',
    titleWeight: 'font-normal',
    subtextOpacity: 'opacity-70',
    showAnchorBadge: false,
  },
};

export function getPriorityStyle(priority: ItemPriority): PriorityStyle {
  return PRIORITY_STYLES[priority] || PRIORITY_STYLES.standard;
}

/**
 * Determine the effective priority for an item
 * Can be overridden by item-level flags (e.g., confirmed reservations)
 */
export function getItemPriority(
  type?: string,
  overrides?: { isConfirmed?: boolean; isHighlight?: boolean }
): ItemPriority {
  // Explicit overrides take precedence
  if (overrides?.isConfirmed) return 'anchor';
  if (overrides?.isHighlight) return 'highlight';

  // Fall back to category default
  const style = getCategoryStyle(type);
  return style.defaultPriority;
}
