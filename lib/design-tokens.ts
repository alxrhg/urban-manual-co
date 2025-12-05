/**
 * Urban Manual Design System Tokens
 *
 * This file provides centralized design tokens for consistent styling.
 * Use these constants instead of magic numbers to ensure design consistency.
 *
 * @see DESIGN_SYSTEM.md for full documentation
 */

// =============================================================================
// BORDER RADIUS
// Standard radius values for all components
// =============================================================================

export const RADIUS = {
  /** 8px - Small elements like pills, tags */
  sm: 'rounded-lg',
  /** 12px - Medium elements */
  md: 'rounded-xl',
  /** 16px - Cards, inputs, containers - PRIMARY RADIUS */
  lg: 'rounded-2xl',
  /** 24px - Large cards, modals */
  xl: 'rounded-3xl',
  /** 9999px - Buttons, badges, avatars */
  full: 'rounded-full',
} as const;

// CSS Custom Property values for non-Tailwind usage
export const RADIUS_VALUES = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

// =============================================================================
// SPACING
// Based on Tailwind's spacing scale
// =============================================================================

export const SPACING = {
  /** 4px */
  xs: '1',
  /** 8px */
  sm: '2',
  /** 12px */
  md: '3',
  /** 16px */
  lg: '4',
  /** 24px */
  xl: '6',
  /** 32px */
  '2xl': '8',
  /** 48px */
  '3xl': '12',
} as const;

// =============================================================================
// TYPOGRAPHY
// Consistent font sizes and weights
// =============================================================================

export const TEXT = {
  /** 12px - Smallest text, metadata */
  xs: 'text-xs',
  /** 14px - Default small text */
  sm: 'text-sm',
  /** 16px - Base text size */
  base: 'text-base',
  /** 18px - Slightly larger */
  lg: 'text-lg',
  /** 20px - Section headers */
  xl: 'text-xl',
  /** 24px - Page titles */
  '2xl': 'text-2xl',
  /** 30px - Hero text */
  '3xl': 'text-3xl',
  /** 36px - Display text */
  '4xl': 'text-4xl',
} as const;

export const WEIGHT = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;

// =============================================================================
// COLORS
// Light and dark mode color pairs
// =============================================================================

export const COLORS = {
  // Backgrounds
  bgPrimary: 'bg-white dark:bg-gray-900',
  bgSecondary: 'bg-gray-50 dark:bg-gray-800',
  bgCard: 'bg-white dark:bg-gray-900',

  // Text
  textPrimary: 'text-black dark:text-white',
  textSecondary: 'text-gray-600 dark:text-gray-400',
  textTertiary: 'text-gray-400 dark:text-gray-500',
  textMuted: 'text-gray-500 dark:text-gray-400',

  // Borders
  border: 'border-gray-200 dark:border-gray-800',
  borderSubtle: 'border-gray-100 dark:border-gray-800/50',

  // Status colors (use sparingly)
  success: 'text-green-600 dark:text-green-400',
  successBg: 'bg-green-50 dark:bg-green-900/20',
  warning: 'text-amber-600 dark:text-amber-400',
  warningBg: 'bg-amber-50 dark:bg-amber-900/20',
  error: 'text-red-600 dark:text-red-400',
  errorBg: 'bg-red-50 dark:bg-red-900/20',
  info: 'text-blue-600 dark:text-blue-400',
  infoBg: 'bg-blue-50 dark:bg-blue-900/20',
} as const;

// =============================================================================
// COMPONENT STYLES
// Pre-composed styles for common components
// =============================================================================

/**
 * Standard input field styles
 * Use: <input className={INPUT_STYLES} />
 */
export const INPUT_STYLES = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500';

/**
 * Standard textarea styles
 */
export const TEXTAREA_STYLES = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none';

/**
 * Primary button styles
 * Use: <button className={BUTTON_PRIMARY} />
 */
export const BUTTON_PRIMARY = 'px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Secondary/outline button styles
 */
export const BUTTON_SECONDARY = 'px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Pill/tag button styles
 */
export const BUTTON_PILL = 'px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-900';

/**
 * Standard card container styles
 */
export const CARD_CONTAINER = 'border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden';

/**
 * Dropdown/popover menu styles
 */
export const DROPDOWN_STYLES = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg overflow-hidden';

/**
 * Image container styles
 */
export const IMAGE_CONTAINER = 'relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800';

/**
 * Thumbnail (small image) styles
 */
export const THUMBNAIL = 'relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800';

/**
 * Icon container (squared with bg) styles
 */
export const ICON_BOX = 'flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800';

// =============================================================================
// TRANSITIONS
// Standard animation timings
// =============================================================================

export const TRANSITION = {
  fast: 'transition-all duration-150',
  default: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  colors: 'transition-colors',
  opacity: 'transition-opacity',
  transform: 'transition-transform',
} as const;

// =============================================================================
// ICON SIZES
// Consistent icon dimensions
// =============================================================================

export const ICON_SIZE = {
  /** 12px */
  xs: 'h-3 w-3',
  /** 16px - Standard icon size */
  sm: 'h-4 w-4',
  /** 20px */
  md: 'h-5 w-5',
  /** 24px */
  lg: 'h-6 w-6',
  /** 32px */
  xl: 'h-8 w-8',
} as const;

// =============================================================================
// HOVER EFFECTS
// Standard hover interaction styles
// =============================================================================

export const HOVER = {
  opacity: 'hover:opacity-80',
  bgLight: 'hover:bg-gray-50 dark:hover:bg-gray-900',
  bgMedium: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  scale: 'hover:scale-[1.02]',
  lift: 'hover:-translate-y-0.5',
} as const;

// =============================================================================
// FOCUS STYLES
// Accessible focus indicators
// =============================================================================

export const FOCUS = {
  ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2',
  border: 'focus:outline-none focus:border-black dark:focus:border-white',
} as const;
