'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DesktopHoverCardProps {
  children: ReactNode;
  content: ReactNode;
  title?: ReactNode;
  align?: 'left' | 'right';
  widthClass?: string;
  className?: string;
  contentClassName?: string;
  showOnMobile?: boolean;
  ariaLabel?: string;
}

/**
 * Lightweight hover/focus popover that only shows on desktop by default.
 * Relies purely on CSS (no portals) so it can wrap inline text without layout shifts.
 */
export function DesktopHoverCard({
  children,
  content,
  title,
  align = 'left',
  widthClass = 'w-72',
  className,
  contentClassName,
  showOnMobile = false,
  ariaLabel,
}: DesktopHoverCardProps) {
  return (
    <div className={cn('relative group/hovercard', className)}>
      <div className="inline-flex w-full min-w-0">{children}</div>
      <div
        className={cn(
          'pointer-events-none absolute top-full mt-2 z-40 opacity-0 invisible translate-y-0 transition-all duration-200 ease-out group-hover/hovercard:visible group-hover/hovercard:opacity-100 group-hover/hovercard:translate-y-1 group-focus-within/hovercard:visible group-focus-within/hovercard:opacity-100 group-focus-within/hovercard:translate-y-1',
          align === 'right' ? 'right-0' : 'left-0',
          showOnMobile ? 'block' : 'hidden md:block'
        )}
        role="tooltip"
        aria-label={ariaLabel}
      >
        <div
          className={cn(
            'relative rounded-2xl border border-gray-200/90 dark:border-gray-800/80 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-2xl p-4',
            widthClass
          )}
        >
          <div
            className={cn(
              'absolute -top-1 left-6 h-3 w-3 rotate-45 border-l border-t border-gray-200/90 dark:border-gray-800/80 bg-white/95 dark:bg-gray-950/95',
              align === 'right' && 'left-auto right-6'
            )}
          />
          {title && (
            <div className="mb-2 text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {title}
            </div>
          )}
          <div className={cn('text-xs leading-relaxed text-gray-700 dark:text-gray-300', contentClassName)}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

