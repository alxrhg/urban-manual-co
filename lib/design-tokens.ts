/**
 * Design Tokens - Shared typography and spacing scale
 *
 * Based on DESIGN_SYSTEM.md and UI_AUDIT_2025.md recommendations.
 * Use these instead of arbitrary Tailwind values like text-[11px] or text-[13px].
 *
 * @see DESIGN_SYSTEM.md for full design guidelines
 */

// ============================================
// TYPOGRAPHY TOKENS
// ============================================

/**
 * Typography scale - maps semantic names to Tailwind classes
 * Use these instead of arbitrary text-[Npx] values
 */
export const typography = {
  // Font sizes
  xs: 'text-xs', // 12px - smallest readable text (labels, captions)
  sm: 'text-sm', // 14px - default body text
  base: 'text-base', // 16px - larger body text
  lg: 'text-lg', // 18px - emphasis text
  xl: 'text-xl', // 20px - small headings
  '2xl': 'text-2xl', // 24px - section headings
  '3xl': 'text-3xl', // 30px - page headings
  '4xl': 'text-4xl', // 36px - large headings

  // Font weights
  normal: 'font-normal', // 400
  medium: 'font-medium', // 500
  semibold: 'font-semibold', // 600
  bold: 'font-bold', // 700
} as const;

/**
 * Pre-composed typography styles for common patterns
 */
export const textStyles = {
  // Headings
  pageTitle: 'text-2xl font-semibold text-black dark:text-white',
  sectionTitle: 'text-lg font-medium text-black dark:text-white',
  cardTitle: 'text-sm font-medium text-black dark:text-white leading-tight',
  cardSubtitle: 'text-sm text-gray-600 dark:text-gray-400',

  // Body text
  body: 'text-sm text-gray-900 dark:text-gray-100',
  bodySecondary: 'text-sm text-gray-600 dark:text-gray-400',
  bodyTertiary: 'text-xs text-gray-500 dark:text-gray-500',

  // Labels and captions
  label: 'text-xs font-medium text-gray-700 dark:text-gray-300',
  labelUppercase: 'text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400',
  caption: 'text-xs text-gray-500 dark:text-gray-400',

  // Specialized
  stat: 'text-2xl font-light text-gray-900 dark:text-white',
  mono: 'font-mono tabular-nums',
  code: 'font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded',
} as const;

// ============================================
// SPACING TOKENS
// ============================================

/**
 * Spacing scale - consistent padding/margin values
 * Based on Tailwind's default spacing scale (1 = 4px)
 */
export const spacing = {
  // Component internal spacing
  xs: 'p-1', // 4px
  sm: 'p-2', // 8px
  md: 'p-4', // 16px
  lg: 'p-6', // 24px
  xl: 'p-8', // 32px

  // Gaps
  gapXs: 'gap-1', // 4px
  gapSm: 'gap-2', // 8px
  gapMd: 'gap-4', // 16px
  gapLg: 'gap-6', // 24px

  // Margins
  marginSm: 'my-2',
  marginMd: 'my-4',
  marginLg: 'my-6',
} as const;

// ============================================
// COMPONENT TOKENS
// ============================================

/**
 * Card styles - consistent card/container styling
 */
export const card = {
  base: 'border border-gray-200 dark:border-gray-800 rounded-2xl',
  padded: 'border border-gray-200 dark:border-gray-800 rounded-2xl p-4',
  interactive: 'border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer',
  selected: 'border border-gray-900 dark:border-gray-100 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900',
} as const;

/**
 * Button styles - consistent button styling
 */
export const button = {
  primary: 'px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity',
  secondary: 'px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors',
  pill: 'px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors',
  icon: 'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
  iconSmall: 'p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
} as const;

/**
 * Badge/status styles
 */
export const badge = {
  base: 'px-2.5 py-1 rounded-full text-xs font-medium',
  success: 'px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  warning: 'px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  error: 'px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  info: 'px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  neutral: 'px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
} as const;

/**
 * Icon sizes - consistent icon dimensions
 */
export const iconSize = {
  xs: 'w-3 h-3', // 12px
  sm: 'w-4 h-4', // 16px - default
  md: 'w-5 h-5', // 20px
  lg: 'w-6 h-6', // 24px
} as const;

// ============================================
// TRIP-SPECIFIC TOKENS
// ============================================

/**
 * Trip-specific styling patterns
 */
export const tripStyles = {
  // Day headers
  dayHeader: 'flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800',
  dayNumber: 'text-lg font-medium text-black dark:text-white',
  dayDate: 'text-sm text-gray-500 dark:text-gray-400',

  // Item rows
  itemRow: 'flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors',
  itemRowSelected: 'flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800',
  itemTime: 'text-sm font-mono tabular-nums text-gray-500 dark:text-gray-400 w-14',
  itemTitle: 'text-sm font-medium text-gray-900 dark:text-white',
  itemMeta: 'text-xs text-gray-500 dark:text-gray-400',

  // Cards
  flightCard: 'rounded-2xl bg-stone-50 dark:bg-gray-800/60 overflow-hidden shadow-sm ring-1 ring-stone-200/50 dark:ring-gray-700/50',
  hotelCard: 'rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden',
  activityCard: 'rounded-xl border border-gray-200 dark:border-gray-800 p-3',
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Combine multiple class names, filtering out undefined/null values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get status badge style based on status type
 */
export function getStatusBadge(status: 'success' | 'warning' | 'error' | 'info' | 'neutral'): string {
  return badge[status] || badge.neutral;
}
