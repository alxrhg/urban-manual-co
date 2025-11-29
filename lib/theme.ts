/**
 * Urban Manual Design Token API
 *
 * A comprehensive, type-safe design token system for consistent UI/UX.
 * All design decisions flow from this single source of truth.
 *
 * Usage:
 * - Import tokens: import { theme, colors, spacing } from '@/lib/theme'
 * - Use in components: style={{ padding: spacing.md }}
 * - Reference in Tailwind: Configured via tailwind.config.js
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================

/**
 * Adaptive Color Palette
 * - Light mode: Warmer grays for a softer, more editorial feel
 * - Dark mode: Cooler grays for better contrast and reduced eye strain
 */
export const colors = {
  // Semantic color tokens - use these in components
  light: {
    // Surfaces
    background: '#FFFFFF',
    backgroundSecondary: '#FAFAFA',
    backgroundTertiary: '#F5F5F4',
    surface: '#FFFFFF',
    surfaceHover: '#F9FAFB',
    surfaceActive: '#F3F4F6',

    // Text
    text: '#0A0A0A',
    textSecondary: '#525252',
    textMuted: '#737373',
    textSubtle: '#A3A3A3',
    textInverse: '#FFFFFF',

    // Borders
    border: '#E5E5E5',
    borderSubtle: 'rgba(0, 0, 0, 0.06)',
    borderStrong: '#D4D4D4',
    borderFocus: '#0A0A0A',

    // Interactive
    primary: '#0A0A0A',
    primaryHover: '#171717',
    primaryActive: '#262626',
    secondary: '#F5F5F4',
    secondaryHover: '#E7E5E4',
    secondaryActive: '#D6D3D1',
  },
  dark: {
    // Surfaces
    background: '#0C0C0D',
    backgroundSecondary: '#141416',
    backgroundTertiary: '#1A1A1D',
    surface: '#18181B',
    surfaceHover: '#1F1F23',
    surfaceActive: '#27272A',

    // Text
    text: '#FAFAFA',
    textSecondary: '#D4D4D8',
    textMuted: '#A1A1AA',
    textSubtle: '#71717A',
    textInverse: '#0A0A0A',

    // Borders
    border: '#27272A',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderStrong: '#3F3F46',
    borderFocus: '#FAFAFA',

    // Interactive
    primary: '#FAFAFA',
    primaryHover: '#E4E4E7',
    primaryActive: '#D4D4D8',
    secondary: '#27272A',
    secondaryHover: '#3F3F46',
    secondaryActive: '#52525B',
  },
  // Status colors (same across themes)
  status: {
    success: '#10B981',
    successLight: '#D1FAE5',
    successDark: '#065F46',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    warningDark: '#92400E',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    errorDark: '#991B1B',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    infoDark: '#1E40AF',
  },
} as const;

// =============================================================================
// SPACING TOKENS
// =============================================================================

/**
 * Semantic Spacing Tokens
 * Based on 4px grid with meaningful names for common use cases
 */
export const spacing = {
  // Base scale (in pixels, use for style prop)
  px: {
    '0': 0,
    '0.5': 2,
    '1': 4,
    '1.5': 6,
    '2': 8,
    '2.5': 10,
    '3': 12,
    '4': 16,
    '5': 20,
    '6': 24,
    '8': 32,
    '10': 40,
    '12': 48,
    '16': 64,
    '20': 80,
    '24': 96,
  },

  // Semantic tokens
  component: {
    gap: 16,       // Gap between elements within a component
    padding: 16,   // Internal padding for components
    margin: 24,    // Margin between components
  },
  section: {
    gap: 48,       // Gap between sections
    padding: 32,   // Section internal padding
    margin: 64,    // Margin between major sections
  },
  card: {
    padding: 16,
    paddingLg: 24,
    gap: 12,
  },
  page: {
    gutterMobile: 24,    // px-6
    gutterDesktop: 40,   // px-10
    maxWidth: 1280,
  },
  stack: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  inline: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
} as const;

// =============================================================================
// BORDER RADIUS TOKENS
// =============================================================================

/**
 * Semantic Border Radius
 * Consistent rounding across all components
 */
export const radius = {
  // Base scale (in pixels)
  none: 0,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,

  // Semantic tokens
  button: 12,
  buttonPill: 9999,
  input: 12,
  card: 12,
  cardLg: 16,
  drawer: 16,
  drawerMobile: 28,
  modal: 16,
  badge: 9999,
  avatar: 9999,
  tag: 8,
  tooltip: 8,
} as const;

// =============================================================================
// SHADOW TOKENS
// =============================================================================

/**
 * Shadow System
 * 4-level elevation scale with dark mode adjustments
 */
export const shadows = {
  light: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    // Semantic
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    cardHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    drawer: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  dark: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
    // Semantic
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
    cardHover: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
    dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
    modal: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
    drawer: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
  },
} as const;

// =============================================================================
// MOTION TOKENS
// =============================================================================

/**
 * Motion Design System
 * Consistent animation timings and easings
 */
export const motion = {
  // Duration (in ms)
  duration: {
    instant: 0,
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 500,
  },

  // Easing curves
  easing: {
    linear: 'linear',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.32, 0.72, 0, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Pre-composed transitions
  transition: {
    fast: '150ms cubic-bezier(0.0, 0.0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.0, 0.0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.32, 0.72, 0, 1)',
    spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // CSS transition strings for common properties
  css: {
    colors: 'color 200ms ease-out, background-color 200ms ease-out, border-color 200ms ease-out',
    transform: 'transform 200ms cubic-bezier(0.0, 0.0, 0.2, 1)',
    opacity: 'opacity 200ms ease-out',
    all: 'all 200ms cubic-bezier(0.0, 0.0, 0.2, 1)',
  },
} as const;

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

/**
 * Typography Scale
 * Semantic type styles for consistent hierarchy
 */
export const typography = {
  // Font families
  fontFamily: {
    sans: 'Outfit, system-ui, -apple-system, sans-serif',
    serif: 'Playfair Display, Georgia, serif',
    display: 'Instrument Serif, Playfair Display, Georgia, serif',
    mono: 'JetBrains Mono, Menlo, monospace',
  },

  // Font sizes (in px)
  fontSize: {
    micro: 10,
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 64,
  },

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// =============================================================================
// Z-INDEX TOKENS
// =============================================================================

/**
 * Z-Index Scale
 * Predictable layering for overlapping elements
 */
export const zIndex = {
  hide: -1,
  base: 0,
  raised: 1,
  dropdown: 10,
  sticky: 20,
  header: 30,
  overlay: 40,
  modal: 50,
  drawer: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  max: 9999,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

/**
 * Responsive Breakpoints
 * Mobile-first breakpoint scale
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// =============================================================================
// ICON SIZE TOKENS
// =============================================================================

/**
 * Icon Size Standards
 * Consistent icon sizing across the app
 */
export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
} as const;

// =============================================================================
// FORM TOKENS
// =============================================================================

/**
 * Form Token Standardization
 * Consistent form element sizing
 */
export const form = {
  height: {
    sm: 32,
    md: 40,
    lg: 48,
  },
  padding: {
    x: {
      sm: 12,
      md: 16,
      lg: 20,
    },
    y: {
      sm: 6,
      md: 10,
      lg: 14,
    },
  },
  fontSize: {
    sm: 13,
    md: 14,
    lg: 16,
  },
  borderWidth: 1,
  focusRingWidth: 2,
  focusRingOffset: 2,
} as const;

// =============================================================================
// FOCUS INDICATORS
// =============================================================================

/**
 * Custom Focus Indicators
 * Per-component focus styling
 */
export const focus = {
  ring: {
    width: 2,
    offset: 2,
    color: {
      light: 'rgba(10, 10, 10, 1)',
      dark: 'rgba(250, 250, 250, 1)',
    },
  },
  // Component-specific focus styles (CSS strings)
  styles: {
    button: {
      light: 'ring-2 ring-offset-2 ring-gray-900 scale-[0.98]',
      dark: 'ring-2 ring-offset-2 ring-offset-gray-950 ring-white scale-[0.98]',
    },
    card: {
      light: 'ring-2 ring-gray-200 shadow-md translate-y-[-2px]',
      dark: 'ring-2 ring-gray-700 shadow-md translate-y-[-2px]',
    },
    input: {
      light: 'ring-2 ring-gray-900 border-gray-900',
      dark: 'ring-2 ring-white border-white',
    },
    link: {
      light: 'underline text-gray-700',
      dark: 'underline text-gray-200',
    },
  },
} as const;

// =============================================================================
// COMBINED THEME OBJECT
// =============================================================================

/**
 * Complete Theme Object
 * Single import for all design tokens
 */
export const theme = {
  colors,
  spacing,
  radius,
  shadows,
  motion,
  typography,
  zIndex,
  breakpoints,
  iconSize,
  form,
  focus,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;
export type ThemeRadius = typeof radius;
export type ThemeShadows = typeof shadows;
export type ThemeMotion = typeof motion;
export type ThemeTypography = typeof typography;
export type ThemeZIndex = typeof zIndex;
export type ThemeBreakpoints = typeof breakpoints;
export type ThemeIconSize = typeof iconSize;
export type ThemeForm = typeof form;
export type ThemeFocus = typeof focus;
export type Theme = typeof theme;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get color value for current theme
 */
export function getColor(
  colorKey: keyof typeof colors.light,
  isDark: boolean = false
): string {
  return isDark ? colors.dark[colorKey] : colors.light[colorKey];
}

/**
 * Get shadow value for current theme
 */
export function getShadow(
  shadowKey: keyof typeof shadows.light,
  isDark: boolean = false
): string {
  return isDark ? shadows.dark[shadowKey] : shadows.light[shadowKey];
}

/**
 * Create CSS custom properties from theme
 */
export function createCSSVariables(isDark: boolean = false): Record<string, string> {
  const colorSet = isDark ? colors.dark : colors.light;
  const shadowSet = isDark ? shadows.dark : shadows.light;

  return {
    // Colors
    '--um-color-background': colorSet.background,
    '--um-color-background-secondary': colorSet.backgroundSecondary,
    '--um-color-background-tertiary': colorSet.backgroundTertiary,
    '--um-color-surface': colorSet.surface,
    '--um-color-surface-hover': colorSet.surfaceHover,
    '--um-color-surface-active': colorSet.surfaceActive,
    '--um-color-text': colorSet.text,
    '--um-color-text-secondary': colorSet.textSecondary,
    '--um-color-text-muted': colorSet.textMuted,
    '--um-color-text-subtle': colorSet.textSubtle,
    '--um-color-border': colorSet.border,
    '--um-color-border-subtle': colorSet.borderSubtle,
    '--um-color-border-strong': colorSet.borderStrong,
    '--um-color-border-focus': colorSet.borderFocus,
    '--um-color-primary': colorSet.primary,
    '--um-color-primary-hover': colorSet.primaryHover,
    '--um-color-primary-active': colorSet.primaryActive,

    // Shadows
    '--um-shadow-sm': shadowSet.sm,
    '--um-shadow-md': shadowSet.md,
    '--um-shadow-lg': shadowSet.lg,
    '--um-shadow-xl': shadowSet.xl,
    '--um-shadow-card': shadowSet.card,
    '--um-shadow-card-hover': shadowSet.cardHover,
    '--um-shadow-dropdown': shadowSet.dropdown,
    '--um-shadow-modal': shadowSet.modal,
    '--um-shadow-drawer': shadowSet.drawer,

    // Radius
    '--um-radius-sm': `${radius.sm}px`,
    '--um-radius-md': `${radius.md}px`,
    '--um-radius-lg': `${radius.lg}px`,
    '--um-radius-xl': `${radius.xl}px`,
    '--um-radius-button': `${radius.button}px`,
    '--um-radius-input': `${radius.input}px`,
    '--um-radius-card': `${radius.card}px`,
    '--um-radius-drawer': `${radius.drawer}px`,
    '--um-radius-modal': `${radius.modal}px`,

    // Spacing
    '--um-space-component-gap': `${spacing.component.gap}px`,
    '--um-space-component-padding': `${spacing.component.padding}px`,
    '--um-space-section-gap': `${spacing.section.gap}px`,
    '--um-space-section-padding': `${spacing.section.padding}px`,
    '--um-space-card-padding': `${spacing.card.padding}px`,
    '--um-space-page-gutter-mobile': `${spacing.page.gutterMobile}px`,
    '--um-space-page-gutter-desktop': `${spacing.page.gutterDesktop}px`,

    // Motion
    '--um-motion-fast': motion.transition.fast,
    '--um-motion-normal': motion.transition.normal,
    '--um-motion-slow': motion.transition.slow,
    '--um-motion-spring': motion.transition.spring,

    // Form
    '--um-form-height-sm': `${form.height.sm}px`,
    '--um-form-height-md': `${form.height.md}px`,
    '--um-form-height-lg': `${form.height.lg}px`,
  };
}

export default theme;
