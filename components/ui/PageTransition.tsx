'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * PageTransition - Consistent page transition wrapper
 *
 * Provides cohesive page-level animations for a polished UX.
 * Wraps page content with consistent enter/exit animations.
 *
 * Usage:
 * // In a page component
 * export default function MyPage() {
 *   return (
 *     <PageTransition>
 *       <PageContent />
 *     </PageTransition>
 *   );
 * }
 *
 * // Or use the PageContainer for full page layout
 * <PageContainer title="My Page" description="Page description">
 *   <Content />
 * </PageContainer>
 */

// =============================================================================
// PAGE TRANSITION WRAPPER
// =============================================================================

export interface PageTransitionProps {
  /** Page content */
  children: React.ReactNode;
  /** Animation variant */
  variant?: 'fade' | 'slide' | 'scale' | 'none';
  /** Animation direction for slide */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Delay before animation starts */
  delay?: number;
  /** Additional class */
  className?: string;
}

export function PageTransition({
  children,
  variant = 'fade',
  direction = 'up',
  delay = 0,
  className,
}: PageTransitionProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Reset visibility on route change
    setIsVisible(false);

    // Trigger animation after a frame
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [pathname, delay]);

  if (variant === 'none') {
    return <div className={className}>{children}</div>;
  }

  const animationClasses = {
    fade: 'animate-fade-in',
    slide: {
      up: 'animate-slide-up',
      down: 'animate-[slideDown_0.5s_ease-out_forwards]',
      left: 'animate-slide-in-left',
      right: 'animate-slide-in-right',
    },
    scale: 'animate-scale-in',
  };

  const animation =
    variant === 'slide'
      ? animationClasses.slide[direction]
      : animationClasses[variant];

  return (
    <div
      className={cn(
        'will-change-transform',
        isVisible ? animation : 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// PAGE CONTAINER - Full page layout with header/content structure
// =============================================================================

export interface PageContainerProps {
  /** Page content */
  children: React.ReactNode;
  /** Page title (optional) */
  title?: string;
  /** Page description/subtitle (optional) */
  description?: string;
  /** Max width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Padding variant */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Animation variant */
  animation?: 'fade' | 'slide' | 'scale' | 'none';
  /** Header content (replaces title/description if provided) */
  header?: React.ReactNode;
  /** Additional class for container */
  className?: string;
  /** Additional class for content */
  contentClassName?: string;
}

export function PageContainer({
  children,
  title,
  description,
  maxWidth = 'xl',
  padding = 'md',
  animation = 'fade',
  header,
  className,
  contentClassName,
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-page', // 1280px
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4 py-8 md:px-6 md:py-12',
    md: 'px-6 py-12 md:px-10 md:py-20',
    lg: 'px-8 py-16 md:px-12 md:py-24',
  };

  const hasHeader = title || description || header;

  return (
    <PageTransition variant={animation}>
      <div
        className={cn(
          'min-h-screen w-full',
          paddingClasses[padding],
          className
        )}
      >
        <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
          {hasHeader && (
            <header className="mb-8 md:mb-12">
              {header || (
                <>
                  {title && (
                    <h1 className="um-heading text-2xl md:text-3xl font-light mb-2">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="um-caption text-um-gray-500 dark:text-um-slate-400">
                      {description}
                    </p>
                  )}
                </>
              )}
            </header>
          )}
          <main className={contentClassName}>{children}</main>
        </div>
      </div>
    </PageTransition>
  );
}

// =============================================================================
// PAGE SECTION - Consistent section spacing
// =============================================================================

export interface PageSectionProps {
  /** Section content */
  children: React.ReactNode;
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Spacing from previous section */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  /** Background variant */
  background?: 'none' | 'subtle' | 'muted';
  /** ID for anchor links */
  id?: string;
  /** Additional class */
  className?: string;
}

export function PageSection({
  children,
  title,
  description,
  spacing = 'md',
  background = 'none',
  id,
  className,
}: PageSectionProps) {
  const spacingClasses = {
    none: '',
    sm: 'mt-8 md:mt-12',
    md: 'mt-12 md:mt-16',
    lg: 'mt-16 md:mt-24',
  };

  const backgroundClasses = {
    none: '',
    subtle: 'bg-um-gray-50 dark:bg-um-slate-900/50 -mx-6 px-6 py-8 md:-mx-10 md:px-10 md:py-12 rounded-card-lg',
    muted: 'bg-um-gray-100 dark:bg-um-slate-900 -mx-6 px-6 py-8 md:-mx-10 md:px-10 md:py-12 rounded-card-lg',
  };

  return (
    <section
      id={id}
      className={cn(spacingClasses[spacing], backgroundClasses[background], className)}
    >
      {(title || description) && (
        <header className="mb-6 md:mb-8">
          {title && (
            <h2 className="um-subheading text-lg md:text-xl font-medium">
              {title}
            </h2>
          )}
          {description && (
            <p className="um-caption mt-1 text-um-gray-500 dark:text-um-slate-400">
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

// =============================================================================
// PAGE LOADING - Full page loading state
// =============================================================================

export interface PageLoadingProps {
  /** Show loading state */
  show?: boolean;
  /** Loading message */
  message?: string;
  /** Additional class */
  className?: string;
}

export function PageLoading({
  show = true,
  message,
  className,
}: PageLoadingProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-overlay',
        'flex flex-col items-center justify-center',
        'bg-white dark:bg-um-slate-950',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-um-gray-200 dark:border-um-slate-700 border-t-um-gray-900 dark:border-t-white" />

        {/* Message */}
        {message && (
          <p className="um-caption text-um-gray-500 dark:text-um-slate-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PAGE EMPTY STATE
// =============================================================================

export interface PageEmptyProps {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Action button/element */
  action?: React.ReactNode;
  /** Additional class */
  className?: string;
}

export function PageEmpty({
  icon,
  title,
  description,
  action,
  className,
}: PageEmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'py-16 md:py-24 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-um-gray-300 dark:text-um-slate-600">
          {icon}
        </div>
      )}
      <h3 className="um-heading text-lg font-medium text-um-gray-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="um-body-sm mt-2 max-w-sm text-um-gray-500 dark:text-um-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// =============================================================================
// PAGE ERROR STATE
// =============================================================================

export interface PageErrorProps {
  /** Error title */
  title?: string;
  /** Error message */
  message?: string;
  /** Retry action */
  onRetry?: () => void;
  /** Additional class */
  className?: string;
}

export function PageError({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className,
}: PageErrorProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'py-16 md:py-24 px-6 text-center',
        className
      )}
    >
      {/* Error icon */}
      <div className="mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="h-6 w-6 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="um-heading text-lg font-medium text-um-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="um-body-sm mt-2 max-w-sm text-um-gray-500 dark:text-um-slate-400">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 px-4 py-2 bg-um-gray-900 dark:bg-white text-white dark:text-um-slate-900 rounded-button text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      )}
    </div>
  );
}
