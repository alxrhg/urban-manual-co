'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Card Composition System
 *
 * A flexible, composable card component for consistent styling.
 *
 * Usage:
 * <Card>
 *   <Card.Image src="/image.jpg" alt="Description" />
 *   <Card.Body>
 *     <Card.Title>Card Title</Card.Title>
 *     <Card.Meta>Additional info</Card.Meta>
 *     <Card.Description>Longer description text</Card.Description>
 *   </Card.Body>
 *   <Card.Actions>
 *     <Button>Action</Button>
 *   </Card.Actions>
 * </Card>
 */

// =============================================================================
// CARD ROOT
// =============================================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: 'default' | 'outline' | 'ghost' | 'elevated';
  /** Size preset affecting padding and radius */
  size?: 'sm' | 'md' | 'lg';
  /** Make card interactive (hover effects) */
  interactive?: boolean;
  /** Make the entire card a clickable link */
  asChild?: boolean;
  /** Horizontal layout */
  horizontal?: boolean;
}

const CardRoot = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      interactive = false,
      horizontal = false,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: [
        'bg-white dark:bg-um-slate-900',
        'border border-um-gray-200 dark:border-um-slate-800',
      ].join(' '),
      outline: [
        'bg-transparent',
        'border border-um-gray-200 dark:border-um-slate-800',
      ].join(' '),
      ghost: [
        'bg-transparent',
        'border-0',
      ].join(' '),
      elevated: [
        'bg-white dark:bg-um-slate-900',
        'border border-um-gray-100 dark:border-um-slate-800',
        'shadow-card',
      ].join(' '),
    };

    const sizeClasses = {
      sm: 'rounded-lg',
      md: 'rounded-card',
      lg: 'rounded-card-lg',
    };

    const interactiveClasses = interactive
      ? [
          'cursor-pointer',
          'transition-all duration-normal ease-out',
          'hover:-translate-y-0.5 hover:shadow-card-hover',
          'active:scale-[0.99]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-um-gray-900 dark:focus-visible:ring-white',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-um-slate-950',
        ].join(' ')
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          'group relative',
          'overflow-hidden',
          variantClasses[variant],
          sizeClasses[size],
          interactiveClasses,
          horizontal && 'flex flex-row',
          className
        )}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardRoot.displayName = 'Card';

// =============================================================================
// CARD IMAGE
// =============================================================================

export interface CardImageProps {
  /** Image source */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Aspect ratio */
  aspect?: 'video' | 'square' | 'portrait' | 'wide' | 'auto';
  /** Fill mode */
  fill?: boolean;
  /** Priority loading */
  priority?: boolean;
  /** Additional class */
  className?: string;
  /** Fallback when image fails to load */
  fallback?: React.ReactNode;
}

function CardImage({
  src,
  alt,
  aspect = 'video',
  fill = false,
  priority = false,
  className,
  fallback,
}: CardImageProps) {
  const [hasError, setHasError] = React.useState(false);

  const aspectClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    wide: 'aspect-[2/1]',
    auto: '',
  };

  if (hasError && fallback) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-um-gray-100 dark:bg-um-slate-800',
          aspectClasses[aspect],
          className
        )}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-um-gray-100 dark:bg-um-slate-800',
        aspectClasses[aspect],
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill={fill || true}
        priority={priority}
        className={cn(
          'object-cover',
          'transition-transform duration-slow ease-out',
          'group-hover:scale-105'
        )}
        onError={() => setHasError(true)}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
    </div>
  );
}

// =============================================================================
// CARD BODY
// =============================================================================

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

function CardBody({
  className,
  padding = 'md',
  children,
  ...props
}: CardBodyProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={cn('flex flex-col flex-1', paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// CARD HEADER
// =============================================================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

function CardHeader({
  className,
  padding = 'md',
  children,
  ...props
}: CardHeaderProps) {
  const paddingClasses = {
    none: '',
    sm: 'px-3 pt-3 pb-2',
    md: 'px-4 pt-4 pb-3',
    lg: 'px-6 pt-6 pb-4',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// CARD TITLE
// =============================================================================

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Truncate text */
  truncate?: boolean;
  /** Max lines before truncation */
  lines?: 1 | 2 | 3;
}

function CardTitle({
  className,
  size = 'md',
  truncate = true,
  lines = 2,
  children,
  ...props
}: CardTitleProps) {
  const sizeClasses = {
    sm: 'text-sm font-medium',
    md: 'text-base font-semibold',
    lg: 'text-lg font-semibold',
  };

  const truncateClasses = truncate
    ? lines === 1
      ? 'truncate'
      : `line-clamp-${lines}`
    : '';

  return (
    <h3
      className={cn(
        sizeClasses[size],
        'text-um-gray-900 dark:text-white',
        'leading-snug',
        truncateClasses,
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

// =============================================================================
// CARD META
// =============================================================================

export interface CardMetaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon to display */
  icon?: React.ReactNode;
}

function CardMeta({ className, icon, children, ...props }: CardMetaProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 mt-1',
        'text-xs text-um-gray-500 dark:text-um-slate-400',
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </div>
  );
}

// =============================================================================
// CARD DESCRIPTION
// =============================================================================

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Max lines before truncation */
  lines?: 1 | 2 | 3 | 4;
}

function CardDescription({
  className,
  lines = 3,
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn(
        'text-sm text-um-gray-600 dark:text-um-slate-400',
        'leading-relaxed mt-2',
        `line-clamp-${lines}`,
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// =============================================================================
// CARD BADGE
// =============================================================================

export interface CardBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Badge variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

function CardBadge({
  className,
  variant = 'default',
  children,
  ...props
}: CardBadgeProps) {
  const variantClasses = {
    default: 'bg-um-gray-100 dark:bg-um-slate-800 text-um-gray-700 dark:text-um-slate-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5',
        'text-xs font-medium',
        'rounded-badge',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// =============================================================================
// CARD ACTIONS
// =============================================================================

export interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alignment */
  align?: 'start' | 'center' | 'end' | 'between';
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Border on top */
  bordered?: boolean;
}

function CardActions({
  className,
  align = 'end',
  padding = 'md',
  bordered = false,
  children,
  ...props
}: CardActionsProps) {
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        alignClasses[align],
        paddingClasses[padding],
        bordered && 'border-t border-um-gray-100 dark:border-um-slate-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// CARD FOOTER
// =============================================================================

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

function CardFooter({
  className,
  padding = 'md',
  children,
  ...props
}: CardFooterProps) {
  const paddingClasses = {
    none: '',
    sm: 'px-3 pb-3',
    md: 'px-4 pb-4',
    lg: 'px-6 pb-6',
  };

  return (
    <div
      className={cn(
        'mt-auto',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// CARD OVERLAY
// =============================================================================

export interface CardOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Position */
  position?: 'top' | 'bottom' | 'full';
  /** Gradient backdrop */
  gradient?: boolean;
}

function CardOverlay({
  className,
  position = 'bottom',
  gradient = true,
  children,
  ...props
}: CardOverlayProps) {
  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
    full: 'inset-0',
  };

  const gradientClasses = gradient
    ? position === 'top'
      ? 'bg-gradient-to-b from-black/60 to-transparent'
      : position === 'bottom'
      ? 'bg-gradient-to-t from-black/60 to-transparent'
      : 'bg-black/40'
    : '';

  return (
    <div
      className={cn(
        'absolute p-4',
        positionClasses[position],
        gradientClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const Card = Object.assign(CardRoot, {
  Image: CardImage,
  Body: CardBody,
  Header: CardHeader,
  Title: CardTitle,
  Meta: CardMeta,
  Description: CardDescription,
  Badge: CardBadge,
  Actions: CardActions,
  Footer: CardFooter,
  Overlay: CardOverlay,
});

export {
  CardImage,
  CardBody,
  CardHeader,
  CardTitle,
  CardMeta,
  CardDescription,
  CardBadge,
  CardActions,
  CardFooter,
  CardOverlay,
};
