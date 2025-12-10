/**
 * Native Link Component
 *
 * Enhanced Next.js Link with native-like behaviors:
 * - View Transitions API for smooth page transitions
 * - Smart prefetching on hover/focus
 * - Haptic feedback on tap
 * - Loading state indication
 */

'use client';

import { forwardRef, useCallback, useState } from 'react';
import Link, { LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import { useViewTransition } from '@/hooks/useViewTransition';
import { Haptics, isHapticsSupported } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface NativeLinkProps extends Omit<LinkProps, 'onClick'> {
  /** Link content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Whether to use view transitions (default: true) */
  viewTransition?: boolean;
  /** Whether to trigger haptic feedback on tap (default: true on mobile) */
  hapticFeedback?: boolean;
  /** Whether to prefetch on hover (default: true) */
  prefetchOnHover?: boolean;
  /** Custom onClick handler */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /** View transition name for element continuity */
  transitionName?: string;
  /** aria-label for accessibility */
  'aria-label'?: string;
  /** Whether link is disabled */
  disabled?: boolean;
  /** Target attribute */
  target?: string;
  /** Rel attribute */
  rel?: string;
}

/**
 * NativeLink - Enhanced link component with native-like behaviors
 *
 * @example
 * ```tsx
 * // Basic usage
 * <NativeLink href="/about">About</NativeLink>
 *
 * // With view transition name (for shared element transitions)
 * <NativeLink href="/city/tokyo" transitionName="city-card-tokyo">
 *   <CityCard city="Tokyo" />
 * </NativeLink>
 *
 * // Disable view transitions for specific links
 * <NativeLink href="/external" viewTransition={false}>
 *   External Link
 * </NativeLink>
 * ```
 */
export const NativeLink = forwardRef<HTMLAnchorElement, NativeLinkProps>(
  (
    {
      children,
      className,
      href,
      viewTransition = true,
      hapticFeedback = true,
      prefetchOnHover = true,
      onClick,
      transitionName,
      disabled = false,
      target,
      rel,
      ...props
    },
    ref
  ) => {
    const router = useRouter();
    const { navigate, isSupported: isViewTransitionSupported } = useViewTransition();
    const [isPrefetched, setIsPrefetched] = useState(false);

    // Check if this is an internal link
    const isInternal =
      typeof href === 'string'
        ? href.startsWith('/') || href.startsWith('#')
        : true;

    // Should use view transitions?
    const shouldUseViewTransition =
      viewTransition && isViewTransitionSupported && isInternal && !target;

    // Handle click with view transition
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Call custom onClick if provided
        onClick?.(e);

        // Don't handle if disabled
        if (disabled) {
          e.preventDefault();
          return;
        }

        // Trigger haptic feedback
        if (hapticFeedback && isHapticsSupported()) {
          Haptics.tap();
        }

        // Use view transition for internal links
        if (shouldUseViewTransition && !e.defaultPrevented) {
          e.preventDefault();
          const url = typeof href === 'string' ? href : href.pathname || '/';
          navigate(url);
        }
      },
      [onClick, disabled, hapticFeedback, shouldUseViewTransition, href, navigate]
    );

    // Handle hover prefetch
    const handleMouseEnter = useCallback(() => {
      if (prefetchOnHover && !isPrefetched && isInternal) {
        const url = typeof href === 'string' ? href : href.pathname || '/';
        router.prefetch(url);
        setIsPrefetched(true);
      }
    }, [prefetchOnHover, isPrefetched, isInternal, href, router]);

    // Handle focus prefetch (for keyboard navigation)
    const handleFocus = useCallback(() => {
      if (prefetchOnHover && !isPrefetched && isInternal) {
        const url = typeof href === 'string' ? href : href.pathname || '/';
        router.prefetch(url);
        setIsPrefetched(true);
      }
    }, [prefetchOnHover, isPrefetched, isInternal, href, router]);

    // Style for view transition name
    const style: React.CSSProperties = transitionName
      ? { viewTransitionName: transitionName }
      : {};

    return (
      <Link
        ref={ref}
        href={href}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        className={cn(
          'touch-manipulation',
          disabled && 'pointer-events-none opacity-50',
          className
        )}
        style={style}
        target={target}
        rel={rel}
        aria-disabled={disabled}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

NativeLink.displayName = 'NativeLink';

export default NativeLink;
