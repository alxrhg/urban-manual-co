import * as React from 'react';
import { cn } from '@/lib/utils';
import { typographyTokens } from './tokens';

export const cardShellClasses = {
  wrapper:
    'group relative flex flex-col gap-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform hover:-translate-y-0.5',
  media:
    'relative aspect-video w-full overflow-hidden rounded-[var(--um-radius-lg)] border border-um-border/70 bg-um-surface-muted/80 dark:bg-um-surface/70 transition-colors duration-300 group-hover:border-um-border',
  title: cn(
    typographyTokens.cardTitle,
    'mt-2 line-clamp-2 transition-colors duration-200 group-hover:text-um-foreground/80'
  ),
  meta: cn(
    typographyTokens.meta,
    'mt-1 flex items-center gap-1.5 transition-opacity duration-200 group-hover:opacity-80'
  ),
} as const;

export interface CardShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardShell = React.forwardRef<HTMLDivElement, CardShellProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(cardShellClasses.wrapper, className)} {...props} />
));
CardShell.displayName = 'CardShell';
