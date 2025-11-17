/**
 * Shared drawer design styles
 * 
 * This file contains the design tokens for all drawers to ensure consistency.
 * Update these values to change the design of all drawers at once.
 */

export const DRAWER_STYLES = {
  // Glassmorphism background
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

