'use client';

import { useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition - Smooth fade and slide animations between page navigations
 * Wrap page content to add entrance animations
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Reset and trigger animation on route change
    setIsVisible(false);
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, [pathname]);

  return (
    <div
      className={`
        transition-all duration-300 ease-out
        ${isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * FadeIn - Simple fade-in animation on mount
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 300,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`
        transition-opacity ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${className}
      `}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * SlideIn - Slide and fade animation on mount
 */
export function SlideIn({
  children,
  delay = 0,
  duration = 300,
  direction = 'up',
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getTransform = () => {
    if (isVisible) return 'translate(0, 0)';
    switch (direction) {
      case 'up': return 'translateY(16px)';
      case 'down': return 'translateY(-16px)';
      case 'left': return 'translateX(16px)';
      case 'right': return 'translateX(-16px)';
      default: return 'translateY(16px)';
    }
  };

  return (
    <div
      className={`transition-all ease-out ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
      }}
    >
      {children}
    </div>
  );
}

/**
 * StaggerChildren - Stagger animation for list items
 */
export function StaggerChildren({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  className = '',
}: {
  children: ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <SlideIn key={index} delay={initialDelay + index * staggerDelay}>
          {child}
        </SlideIn>
      ))}
    </div>
  );
}
