'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface FadeInViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Animation direction: 'up', 'down', 'left', 'right', or 'none' for fade only */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Delay before animation starts (in ms) */
  delay?: number;
  /** Duration of animation (in ms) */
  duration?: number;
  /** Threshold at which to trigger (0-1) */
  threshold?: number;
  /** Whether to trigger only once */
  triggerOnce?: boolean;
  /** Additional className for the wrapper */
  className?: string;
  /** Render as a different element */
  as?: React.ElementType;
}

/**
 * FadeInView - Animate elements when they enter the viewport
 * Uses CSS classes for smooth, performant animations
 *
 * @example
 * <FadeInView direction="up" delay={100}>
 *   <Card>...</Card>
 * </FadeInView>
 */
export function FadeInView({
  children,
  direction = 'up',
  delay = 0,
  duration = 400,
  threshold = 0.1,
  triggerOnce = true,
  className,
  as: Component = 'div',
  style,
  ...props
}: FadeInViewProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold,
    triggerOnce,
  });

  const getTransform = () => {
    switch (direction) {
      case 'up':
        return 'translateY(20px)';
      case 'down':
        return 'translateY(-20px)';
      case 'left':
        return 'translateX(20px)';
      case 'right':
        return 'translateX(-20px)';
      case 'none':
      default:
        return 'none';
    }
  };

  const baseStyles: React.CSSProperties = {
    opacity: isIntersecting ? 1 : 0,
    transform: isIntersecting ? 'none' : getTransform(),
    transitionProperty: 'opacity, transform',
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    transitionDelay: `${delay}ms`,
    ...style,
  };

  return (
    <Component
      ref={ref}
      className={className}
      style={baseStyles}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Simple wrapper using CSS classes instead of inline styles
 * More performant for many items
 */
export function FadeInViewCSS({
  children,
  className,
  ...props
}: Omit<FadeInViewProps, 'direction' | 'delay' | 'duration' | 'as'>) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: props.threshold ?? 0.1,
    triggerOnce: props.triggerOnce ?? true,
  });

  return (
    <div
      ref={ref}
      className={cn('fade-in-view', isIntersecting && 'in-view', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default FadeInView;
