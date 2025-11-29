'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * PillButton - Specialized button for filters, tags, and toggle states
 *
 * Features:
 * - Full rounded corners (pill shape)
 * - Compact sizes ideal for filter bars and tag lists
 * - Active/selected state variant
 * - Icon support (left or right)
 * - Dismissible variant with close button styling
 *
 * Usage:
 * <PillButton variant="default">All</PillButton>
 * <PillButton variant="active">Selected</PillButton>
 * <PillButton variant="outline" size="sm">
 *   <FilterIcon className="h-3 w-3" />
 *   Filter
 * </PillButton>
 */
const pillButtonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5',
    'rounded-full',
    'font-medium whitespace-nowrap',
    'transition-all duration-fast ease-out',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    // Focus styles
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-um-gray-900 dark:focus-visible:ring-white',
    'focus-visible:ring-offset-white dark:focus-visible:ring-offset-um-slate-950',
    // Active state
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        // Default - neutral pill
        default: [
          'bg-um-gray-100 dark:bg-um-slate-800',
          'text-um-gray-700 dark:text-um-slate-300',
          'hover:bg-um-gray-200 dark:hover:bg-um-slate-700',
          'border border-transparent',
        ].join(' '),
        // Active/Selected state
        active: [
          'bg-um-gray-900 dark:bg-white',
          'text-white dark:text-um-slate-900',
          'hover:bg-um-gray-800 dark:hover:bg-um-slate-100',
          'border border-transparent',
        ].join(' '),
        // Outline style
        outline: [
          'bg-transparent',
          'border border-um-gray-200 dark:border-um-slate-700',
          'text-um-gray-700 dark:text-um-slate-300',
          'hover:bg-um-gray-50 dark:hover:bg-um-slate-800',
          'hover:border-um-gray-300 dark:hover:border-um-slate-600',
        ].join(' '),
        // Outline active
        'outline-active': [
          'bg-um-gray-900 dark:bg-white',
          'border border-um-gray-900 dark:border-white',
          'text-white dark:text-um-slate-900',
          'hover:bg-um-gray-800 dark:hover:bg-um-slate-100',
        ].join(' '),
        // Ghost style - minimal
        ghost: [
          'bg-transparent',
          'text-um-gray-600 dark:text-um-slate-400',
          'hover:bg-um-gray-100 dark:hover:bg-um-slate-800',
          'hover:text-um-gray-900 dark:hover:text-white',
        ].join(' '),
        // Subtle - very light background
        subtle: [
          'bg-um-gray-50 dark:bg-um-slate-900',
          'text-um-gray-600 dark:text-um-slate-400',
          'hover:bg-um-gray-100 dark:hover:bg-um-slate-800',
          'hover:text-um-gray-800 dark:hover:text-um-slate-200',
          'border border-transparent',
        ].join(' '),
        // Dismissible - for removable tags
        dismissible: [
          'bg-um-gray-100 dark:bg-um-slate-800',
          'text-um-gray-700 dark:text-um-slate-300',
          'hover:bg-um-gray-200 dark:hover:bg-um-slate-700',
          'border border-transparent',
          'pr-1.5', // Tighter padding for close icon
        ].join(' '),
      },
      size: {
        xs: 'h-6 px-2 text-[11px] [&_svg]:size-3',      // 24px height
        sm: 'h-7 px-2.5 text-xs [&_svg]:size-3.5',      // 28px height
        md: 'h-8 px-3 text-xs [&_svg]:size-4',          // 32px height
        lg: 'h-9 px-4 text-sm [&_svg]:size-4',          // 36px height
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pillButtonVariants> {
  /** Use Radix Slot to merge props onto child */
  asChild?: boolean;
  /** Whether the pill is currently selected/active */
  isActive?: boolean;
}

const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  (
    { className, variant, size, asChild = false, isActive, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // Auto-switch to active variant if isActive is true and variant supports it
    const resolvedVariant = isActive
      ? variant === 'outline'
        ? 'outline-active'
        : 'active'
      : variant;

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : 'button'}
        className={cn(
          pillButtonVariants({ variant: resolvedVariant, size, className })
        )}
        data-active={isActive || undefined}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

PillButton.displayName = 'PillButton';

/**
 * PillButtonGroup - Container for a group of pill buttons
 * Provides consistent spacing and wrapping behavior
 */
const PillButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Gap between pills */
    gap?: 'xs' | 'sm' | 'md';
  }
>(({ className, gap = 'sm', children, ...props }, ref) => {
  const gapClasses = {
    xs: 'gap-1',
    sm: 'gap-1.5',
    md: 'gap-2',
  };

  return (
    <div
      ref={ref}
      role="group"
      className={cn('flex flex-wrap items-center', gapClasses[gap], className)}
      {...props}
    >
      {children}
    </div>
  );
});

PillButtonGroup.displayName = 'PillButtonGroup';

export { PillButton, PillButtonGroup, pillButtonVariants };
