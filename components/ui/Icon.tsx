'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Icon Size Standards
 * Provides consistent icon sizing across the application
 *
 * Sizes:
 * - xs: 12px - Inline badges, very compact UI
 * - sm: 16px - Default UI elements, button icons
 * - md: 20px - Buttons with text, form icons
 * - lg: 24px - Standalone actions, primary icons
 * - xl: 28px - Feature icons, prominent actions
 * - 2xl: 32px - Hero icons, large displays
 */

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const iconSizeMap: Record<IconSize, string> = {
  xs: 'h-3 w-3',      // 12px
  sm: 'h-4 w-4',      // 16px
  md: 'h-5 w-5',      // 20px
  lg: 'h-6 w-6',      // 24px
  xl: 'h-7 w-7',      // 28px
  '2xl': 'h-8 w-8',   // 32px
};

const iconSizePixels: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
};

export interface IconProps extends Omit<React.SVGAttributes<SVGElement>, 'ref'> {
  /** The Lucide icon component to render */
  icon: React.ComponentType<React.SVGAttributes<SVGElement>>;
  /** Predefined size */
  size?: IconSize;
  /** Custom pixel size (overrides size prop) */
  pixelSize?: number;
  /** Accessible label - required if icon is not decorative */
  label?: string;
  /** Whether the icon is purely decorative */
  decorative?: boolean;
}

/**
 * Icon wrapper component for consistent sizing and accessibility
 *
 * Usage:
 * import { Icon } from '@/components/ui/Icon';
 * import { Heart, Star } from 'lucide-react';
 *
 * <Icon icon={Heart} size="md" label="Like" />
 * <Icon icon={Star} size="lg" decorative />
 * <Icon icon={Star} pixelSize={18} />
 */
function Icon({
  icon: IconComponent,
  size = 'sm',
  pixelSize,
  label,
  decorative = false,
  className,
  ...props
}: IconProps) {
  // Use pixel size if provided, otherwise use predefined size
  const sizeClass = pixelSize ? undefined : iconSizeMap[size];
  const style = pixelSize
    ? { width: pixelSize, height: pixelSize, ...props.style }
    : props.style;

  // Accessibility: aria-hidden for decorative, aria-label for meaningful icons
  const accessibilityProps = decorative
    ? { 'aria-hidden': true as const }
    : { 'aria-label': label, role: 'img' as const };

  return (
    <IconComponent
      className={cn(sizeClass, 'shrink-0', className)}
      style={style}
      {...accessibilityProps}
      {...props}
    />
  );
}

/**
 * Hook to get icon size classes
 * Useful when you need to apply sizing to an icon without the wrapper
 */
export function useIconSize(size: IconSize): string {
  return iconSizeMap[size];
}

/**
 * Get pixel size for an icon size token
 */
export function getIconPixelSize(size: IconSize): number {
  return iconSizePixels[size];
}

/**
 * Icon size utility classes for use with Tailwind
 * Can be used directly: className={iconSizes.md}
 */
export const iconSizes = iconSizeMap;

export { Icon };
