'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface ProgressiveGridProps {
  children: ReactNode;
  className?: string;
  skeletonCount?: number;
  skeletonComponent?: ReactNode;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Progressive Grid that loads children as they enter viewport
 * Provides smooth loading experience with skeleton placeholders
 */
export function ProgressiveGrid({
  children,
  className = '',
  skeletonCount = 0,
  skeletonComponent,
  threshold = 0.1,
  rootMargin = '100px',
}: ProgressiveGridProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const childrenArray = Array.isArray(children) ? children : [children];

  useEffect(() => {
    if (!containerRef.current || childrenArray.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Array.from(containerRef.current?.children || []).indexOf(
              entry.target
            );
            if (index >= 0 && index < childrenArray.length) {
              setVisibleCount((prev) => Math.max(prev, index + 1));
            }
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    const children = containerRef.current.children;
    Array.from(children).forEach((child) => observer.observe(child));

    return () => {
      observer.disconnect();
    };
  }, [childrenArray.length, rootMargin, threshold]);

  return (
    <div ref={containerRef} className={className}>
      {childrenArray.map((child, index) => (
        <div
          key={index}
          className={`
            transition-opacity duration-500 ease-out
            ${index < visibleCount ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {index < visibleCount ? child : skeletonComponent}
        </div>
      ))}
      {/* Additional skeletons for loading state */}
      {skeletonCount > 0 &&
        Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={`skeleton-${i}`}>{skeletonComponent}</div>
        ))}
    </div>
  );
}

