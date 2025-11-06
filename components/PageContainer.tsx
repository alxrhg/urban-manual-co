import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type WidthPreset = 'narrow' | 'standard' | 'wide' | 'full';

const WIDTH_MAP: Record<WidthPreset, string> = {
  narrow: 'max-w-4xl',
  standard: 'max-w-5xl',
  wide: 'max-w-7xl',
  full: 'max-w-[1800px]', // Prevent ultra-wide layouts on large screens
};

interface PageContainerProps {
  children: ReactNode;
  width?: WidthPreset;
  className?: string;
}

/**
 * PageContainer with iOS-friendly spacing
 * Standardized padding scale: 4 -> 6 -> 8 -> 10 -> 12
 * Includes safe-area-inset support for notched devices
 */
export function PageContainer({ children, width = 'wide', className }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12',
        WIDTH_MAP[width],
        className
      )}
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {children}
    </div>
  );
}
