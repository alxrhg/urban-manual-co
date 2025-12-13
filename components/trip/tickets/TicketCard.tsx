'use client';

import { forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * TicketCard - Base component for the Premium Ticket design system
 *
 * Design principles:
 * - Structured, data-dense, minimalist
 * - Consistent ticket-like appearance
 * - Left slot for time, right slot for content
 */

export interface TicketCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'boarding-pass' | 'hotel' | 'night-pass';
  onClick?: () => void;
  isActive?: boolean;
}

const TicketCard = forwardRef<HTMLDivElement, TicketCardProps>(
  ({ children, className, variant = 'default', onClick, isActive }, ref) => {
    const baseStyles = cn(
      'relative overflow-hidden rounded-xl transition-all duration-200',
      'border border-stone-200 dark:border-gray-700',
      onClick && 'cursor-pointer hover:border-stone-300 dark:hover:border-gray-600',
      onClick && 'active:scale-[0.99]',
      isActive && 'ring-2 ring-stone-400 dark:ring-gray-500',
      {
        // Default ticket and Hotel - clean white background
        'bg-white dark:bg-gray-900': variant === 'default' || variant === 'hotel',
        // Boarding pass - slightly warmer tone with gradient
        'bg-gradient-to-r from-stone-50 to-white dark:from-gray-900 dark:to-gray-800': variant === 'boarding-pass',
        // Night pass - darker, inverted
        'bg-stone-900 dark:bg-gray-950 text-white': variant === 'night-pass',
      },
      className
    );

    return (
      <div
        ref={ref}
        className={baseStyles}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      >
        {children}
      </div>
    );
  }
);

TicketCard.displayName = 'TicketCard';

/**
 * TicketTimeSlot - Left column for time display
 */
export function TicketTimeSlot({
  time,
  label,
  className,
  variant = 'default',
}: {
  time?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'night-pass';
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-3 py-3 min-w-[60px]',
        'border-r border-dashed',
        {
          'border-stone-200 dark:border-gray-700': variant === 'default',
          'border-stone-700': variant === 'night-pass',
        },
        className
      )}
    >
      {time && (
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            {
              'text-stone-900 dark:text-white': variant === 'default',
              'text-white': variant === 'night-pass',
            }
          )}
        >
          {time}
        </span>
      )}
      {label && (
        <span
          className={cn(
            'text-[9px] uppercase tracking-wider font-medium mt-0.5',
            {
              'text-stone-400 dark:text-gray-500': variant === 'default',
              'text-stone-500': variant === 'night-pass',
            }
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * TicketContent - Right column for main content
 */
export function TicketContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex-1 p-3 min-w-0', className)}>
      {children}
    </div>
  );
}

/**
 * TicketDivider - Dashed divider with optional notch cutouts
 */
export function TicketDivider({
  withNotch = false,
  className,
  variant = 'default',
}: {
  withNotch?: boolean;
  className?: string;
  variant?: 'default' | 'night-pass';
}) {
  const borderColor = variant === 'night-pass'
    ? 'border-stone-700'
    : 'border-stone-200 dark:border-gray-700';

  if (!withNotch) {
    return (
      <div
        className={cn(
          'border-t border-dashed my-2',
          borderColor,
          className
        )}
      />
    );
  }

  // Notched divider for boarding pass effect
  return (
    <div className={cn('relative flex items-center my-2', className)}>
      {/* Left notch */}
      <div
        className={cn(
          'absolute -left-3 w-6 h-6 rounded-full',
          variant === 'night-pass'
            ? 'bg-stone-800'
            : 'bg-stone-100 dark:bg-gray-800'
        )}
      />
      {/* Dashed line */}
      <div className={cn('flex-1 border-t border-dashed mx-3', borderColor)} />
      {/* Right notch */}
      <div
        className={cn(
          'absolute -right-3 w-6 h-6 rounded-full',
          variant === 'night-pass'
            ? 'bg-stone-800'
            : 'bg-stone-100 dark:bg-gray-800'
        )}
      />
    </div>
  );
}

/**
 * TicketBadge - Small status/category badge
 */
export function TicketBadge({
  children,
  variant = 'default',
  className,
}: {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'muted' | 'dark';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider',
        {
          'bg-stone-100 text-stone-600 dark:bg-gray-800 dark:text-gray-400': variant === 'default',
          'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400': variant === 'success',
          'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400': variant === 'warning',
          'bg-stone-50 text-stone-400 dark:bg-gray-900 dark:text-gray-500': variant === 'muted',
          'bg-stone-800 text-stone-300': variant === 'dark',
        },
        className
      )}
    >
      {children}
    </span>
  );
}

export default TicketCard;
