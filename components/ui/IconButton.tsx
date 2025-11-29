'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * IconButton - Dedicated component for icon-only buttons
 *
 * Features:
 * - Consistent square sizing with centered icons
 * - Proper touch targets (min 44x44px for accessibility)
 * - Custom focus indicators with subtle scale
 * - Multiple variants for different contexts
 *
 * Usage:
 * <IconButton variant="ghost" size="md" aria-label="Close">
 *   <X className="h-4 w-4" />
 * </IconButton>
 */
const iconButtonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'rounded-button',
    'transition-all duration-normal ease-out',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    // Focus styles
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-um-gray-900 dark:focus-visible:ring-white',
    'focus-visible:ring-offset-white dark:focus-visible:ring-offset-um-slate-950',
    // Active state
    'active:scale-95',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-um-gray-100 dark:bg-um-slate-800',
          'text-um-gray-700 dark:text-um-slate-300',
          'hover:bg-um-gray-200 dark:hover:bg-um-slate-700',
          'border border-transparent',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'text-um-gray-600 dark:text-um-slate-400',
          'hover:bg-um-gray-100 dark:hover:bg-um-slate-800',
          'hover:text-um-gray-900 dark:hover:text-white',
        ].join(' '),
        outline: [
          'bg-transparent',
          'border border-um-gray-200 dark:border-um-slate-700',
          'text-um-gray-700 dark:text-um-slate-300',
          'hover:bg-um-gray-50 dark:hover:bg-um-slate-800',
          'hover:border-um-gray-300 dark:hover:border-um-slate-600',
        ].join(' '),
        subtle: [
          'bg-um-gray-50 dark:bg-um-slate-900',
          'text-um-gray-500 dark:text-um-slate-500',
          'hover:bg-um-gray-100 dark:hover:bg-um-slate-800',
          'hover:text-um-gray-700 dark:hover:text-um-slate-300',
        ].join(' '),
        solid: [
          'bg-um-gray-900 dark:bg-white',
          'text-white dark:text-um-slate-900',
          'hover:bg-um-gray-800 dark:hover:bg-um-slate-100',
        ].join(' '),
        destructive: [
          'bg-transparent',
          'text-red-500 dark:text-red-400',
          'hover:bg-red-50 dark:hover:bg-red-950/50',
          'hover:text-red-600 dark:hover:text-red-300',
        ].join(' '),
      },
      size: {
        xs: 'size-7 [&_svg]:size-3.5',      // 28px - compact
        sm: 'size-8 [&_svg]:size-4',         // 32px - small
        md: 'size-10 [&_svg]:size-5',        // 40px - default
        lg: 'size-11 [&_svg]:size-5',        // 44px - touch target
        xl: 'size-12 [&_svg]:size-6',        // 48px - prominent
      },
      rounded: {
        default: 'rounded-button',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: 'default',
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Use Radix Slot to merge props onto child */
  asChild?: boolean;
  /** Required for accessibility - describes the button's action */
  'aria-label': string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, variant, size, rounded, asChild = false, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : 'button'}
        className={cn(iconButtonVariants({ variant, size, rounded, className }))}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

IconButton.displayName = 'IconButton';

export { IconButton, iconButtonVariants };
