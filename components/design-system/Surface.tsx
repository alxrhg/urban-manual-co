import * as React from 'react';
import { cn } from '@/lib/utils';
import { colorTokens, radiusTokens, shadowTokens } from './tokens';

const paddingMap = {
  none: 'p-0',
  sm: 'p-4 sm:p-5',
  md: 'p-5 sm:p-6 lg:p-7',
} as const;

type PaddingScale = keyof typeof paddingMap;

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: PaddingScale;
  interactive?: boolean;
  muted?: boolean;
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, padding = 'md', interactive = false, muted = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative isolate',
          muted ? colorTokens.surfaceMuted : colorTokens.surface,
          colorTokens.border,
          radiusTokens.lg,
          shadowTokens.soft,
          'transition-all duration-200 ease-out',
          interactive &&
            'hover:-translate-y-0.5 hover:shadow-[0_35px_85px_-55px_rgba(15,23,42,0.8)] dark:hover:shadow-[0_35px_85px_-45px_rgba(0,0,0,0.9)]',
          paddingMap[padding],
          className
        )}
        {...props}
      />
    );
  }
);
Surface.displayName = 'Surface';
