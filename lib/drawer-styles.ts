/**
 * Shared drawer design styles
 * 
 * This file contains the design tokens for all drawers to ensure consistency.
 * Update these values to change the design of all drawers at once.
 */

export const DRAWER_STYLES = {
  // Animation: Spring physics
  animation: {
    type: 'spring',
    stiffness: 220,
    damping: 28,
    overshootClamp: true,
  },
  
  // Backdrop
  backdrop: {
    dimWhenExpanded: true,
    opacity: 0.18, // 18% opacity
    blur: 18,
  },
  
  // Shadow
  shadow: {
    enabled: true,
    value: '0 4px 38px rgba(0,0,0,0.35)',
  },
  
  // Tier 1 (Utility Drawer)
  tier1: {
    height: 'auto',
    maxHeight: '45%',
    dragToExpand: true,
    cornerRadius: 22,
    showHandle: true,
    background: 'rgba(20,20,20,0.85)', // dark mode
  },
  
  // Tier 2 (Workspace Drawer)
  tier2: {
    height: '88%',
    cornerRadius: 22,
    nested: true,
    allowBackNavigation: true,
    background: 'rgba(14,14,14,0.92)', // dark mode
    headerBackground: 'rgba(18,18,18,0.6)',
    headerBlur: 18,
  },
  
  // Tier 3 (Full Page)
  tier3: {
    background: '#0D0D0D', // dark mode
  },
  
  // Dark mode colors
  darkMode: {
    tier1Bg: 'rgba(20,20,20,0.85)',
    tier2Bg: 'rgba(14,14,14,0.92)',
    tier3Bg: '#0D0D0D',
    card: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
    textPrimary: '#F5F5F5',
    textSecondary: 'rgba(255,255,255,0.56)',
    textTertiary: 'rgba(255,255,255,0.36)',
  },
  
  // Glassmorphism background (legacy support)
  background: 'bg-white/80 dark:bg-gray-950/80',
  backdropBlur: 'backdrop-blur-xl',
  
  // Border styles
  borderTop: 'border-t border-white/20 dark:border-gray-800/20',
  borderLeft: 'border-l border-white/20 dark:border-gray-800/20',
  borderBottom: 'border-b border-white/20 dark:border-gray-800/20',
  borderRight: 'border-r border-white/20 dark:border-gray-800/20',
  
  // Header/Footer backgrounds (transparent for glass effect)
  headerBackground: 'bg-transparent',
  footerBackground: 'bg-transparent',
  
  // Combined classes for common use cases
  glassyBackground: 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl',
  glassyBorderTop: 'border-t border-white/20 dark:border-gray-800/20',
  glassyBorderLeft: 'border-l border-white/20 dark:border-gray-800/20',
  glassyBorderRight: 'border-r border-white/20 dark:border-gray-800/20',
} as const;

/**
 * Get the full glassy background classes for a drawer container
 */
export function getDrawerBackgroundClasses(hasBorderTop = false, hasBorderLeft = false): string {
  const classes: string[] = [
    DRAWER_STYLES.glassyBackground,
  ];
  
  if (hasBorderTop) {
    classes.push(DRAWER_STYLES.glassyBorderTop);
  }
  
  if (hasBorderLeft) {
    classes.push(DRAWER_STYLES.glassyBorderLeft);
  }
  
  return classes.join(' ');
}

