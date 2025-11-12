import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}

/**
 * Provides a unified background and padding treatment used across all editorial pages.
 * Mirrors the layered gradient treatment from the homepage while allowing full-bleed
 * experiences (maps, hero imagery) by setting `bleed`.
 */
export function PageShell({ children, className, bleed = false }: PageShellProps) {
  return (
    <div
      data-bleed={bleed ? 'true' : undefined}
      className={cn(
        'relative isolate w-full',
        !bleed && 'pb-16 md:pb-24',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-gray-50 via-white to-transparent dark:from-gray-950 dark:via-gray-950 dark:to-transparent"
      />
      <div className="relative w-full">{children}</div>
    </div>
  );
}
