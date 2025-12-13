'use client';

import { useEffect, useState, useRef, type ReactNode, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Fade In Component
// ============================================================================

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

/**
 * FadeIn - Animate children with fade and optional slide
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 400,
  className,
  direction = 'up',
  distance = 10,
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const directionStyles: Record<string, CSSProperties> = {
    up: { transform: isVisible ? 'translateY(0)' : `translateY(${distance}px)` },
    down: { transform: isVisible ? 'translateY(0)' : `translateY(-${distance}px)` },
    left: { transform: isVisible ? 'translateX(0)' : `translateX(${distance}px)` },
    right: { transform: isVisible ? 'translateX(0)' : `translateX(-${distance}px)` },
    none: {},
  };

  return (
    <div
      ref={ref}
      className={cn('transition-all', className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        ...directionStyles[direction],
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Stagger Container
// ============================================================================

interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

/**
 * StaggerContainer - Apply staggered delays to children
 */
export function StaggerContainer({
  children,
  staggerDelay = 50,
  className,
}: StaggerContainerProps) {
  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <FadeIn key={index} delay={index * staggerDelay}>
              {child}
            </FadeIn>
          ))
        : children}
    </div>
  );
}

// ============================================================================
// Premium Stagger Entry (CSS-based for performance)
// ============================================================================

interface StaggerEntryProps {
  children: ReactNode;
  className?: string;
  /** Index for stagger delay (0-8) */
  index?: number;
}

/**
 * StaggerEntry - CSS-based stagger animation for lists/nav items
 * Uses the .stagger-enter and .stagger-enter-{n} classes from globals.css
 */
export function StaggerEntry({
  children,
  className,
  index = 0,
}: StaggerEntryProps) {
  const staggerClass = `stagger-enter-${Math.min(index, 8)}`;

  return (
    <div className={cn('stagger-enter', staggerClass, className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Scale on Hover
// ============================================================================

interface ScaleOnHoverProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

/**
 * ScaleOnHover - Subtle scale effect on hover
 */
export function ScaleOnHover({
  children,
  scale = 1.02,
  className,
}: ScaleOnHoverProps) {
  return (
    <div
      className={cn(
        'transition-transform duration-200 ease-out hover:scale-[var(--hover-scale)]',
        className
      )}
      style={{ '--hover-scale': scale } as CSSProperties}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Press Effect
// ============================================================================

interface PressEffectProps {
  children: ReactNode;
  className?: string;
}

/**
 * PressEffect - Button press animation
 */
export function PressEffect({ children, className }: PressEffectProps) {
  return (
    <div
      className={cn(
        'transition-transform duration-100 ease-out active:scale-[0.98]',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Success Animation
// ============================================================================

interface SuccessAnimationProps {
  show: boolean;
  className?: string;
}

/**
 * SuccessAnimation - Checkmark animation for success states
 */
export function SuccessAnimation({ show, className }: SuccessAnimationProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'animate-in zoom-in-50 fade-in duration-300',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
            className="animate-[draw_0.3s_ease-out_forwards]"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
              animation: 'draw 0.3s ease-out 0.2s forwards',
            }}
          />
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// Error Animation
// ============================================================================

interface ErrorAnimationProps {
  show: boolean;
  className?: string;
}

/**
 * ErrorAnimation - Shake animation for error states
 */
export function ErrorAnimation({ show, className }: ErrorAnimationProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center animate-[shake_0.5s_ease-in-out]',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// Pulse Ring
// ============================================================================

interface PulseRingProps {
  className?: string;
  color?: string;
}

/**
 * PulseRing - Pulsing ring effect for notifications
 */
export function PulseRing({ className, color = 'bg-green-500' }: PulseRingProps) {
  return (
    <span className={cn('relative flex h-3 w-3', className)}>
      <span
        className={cn(
          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
          color
        )}
      />
      <span
        className={cn(
          'relative inline-flex rounded-full h-3 w-3',
          color
        )}
      />
    </span>
  );
}

// ============================================================================
// Loading Spinner
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * LoadingSpinner - Smooth spinning loader
 */
export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg
      className={cn(
        'animate-spin text-gray-400 dark:text-gray-500',
        sizeClasses[size],
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
