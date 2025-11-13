import * as React from 'react';
import { cn } from '@/lib/utils';
import { colorTokens, radiusTokens } from './tokens';

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
}

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ className, variant = 'default', type = 'button', ...props }, ref) => {
    const variantClass =
      variant === 'ghost'
        ? 'bg-transparent text-um-muted hover:bg-um-border/30 dark:hover:bg-um-border/10'
        : 'bg-um-pill text-um-foreground hover:bg-um-border/50 dark:hover:bg-um-border/30';

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-um-bg disabled:opacity-50 disabled:pointer-events-none',
          colorTokens.border,
          radiusTokens.full,
          'px-4 py-2',
          variantClass,
          className
        )}
        {...props}
      />
    );
  }
);
PillButton.displayName = 'PillButton';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md';
}

const sizeMap = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
} as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-um-bg disabled:opacity-50 disabled:pointer-events-none',
          colorTokens.surface,
          colorTokens.border,
          radiusTokens.full,
          'shadow-sm hover:shadow-md hover:bg-um-surface-muted/70 text-um-muted hover:text-um-foreground',
          sizeMap[size],
          className
        )}
        {...props}
      />
    );
  }
);
IconButton.displayName = 'IconButton';
