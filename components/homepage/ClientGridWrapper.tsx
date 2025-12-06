'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Destination } from '@/types/destination';

/**
 * Client Grid Wrapper - Apple Design System
 *
 * A lightweight client component that adds interactivity to server-rendered grids.
 * Uses event delegation to minimize JavaScript overhead.
 *
 * Features:
 * - Event delegation for click handling (single listener for all cards)
 * - Subtle hover effects via CSS
 * - Minimal bundle size (~2KB)
 * - Navigation to destination page on click
 */

interface ClientGridWrapperProps {
  children: ReactNode;
  destinations: Destination[];
  onDestinationSelect?: (destination: Destination) => void;
}

export function ClientGridWrapper({
  children,
  destinations,
  onDestinationSelect,
}: ClientGridWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Create a map for O(1) lookup
  const destinationMap = useRef<Map<string, Destination>>(new Map());

  // Update the map when destinations change
  useEffect(() => {
    destinationMap.current.clear();
    for (const dest of destinations) {
      destinationMap.current.set(dest.slug, dest);
    }
  }, [destinations]);

  // Event delegation handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Find the closest destination card
      const card = target.closest('[data-destination-slug]') as HTMLElement;
      if (!card) return;

      const slug = card.getAttribute('data-destination-slug');
      if (!slug) return;

      const destination = destinationMap.current.get(slug);
      if (!destination) return;

      // Prevent default and stop propagation
      event.preventDefault();
      event.stopPropagation();

      // Track the click (lazy load tracking module)
      import('@/lib/tracking').then(({ trackDestinationClick }) => {
        trackDestinationClick({
          destinationSlug: destination.slug,
          source: 'grid',
        });
      });

      // Call the callback if provided, otherwise navigate to destination page
      if (onDestinationSelect) {
        onDestinationSelect(destination);
      } else {
        // Navigate to destination page
        window.location.href = `/destination/${destination.slug}`;
      }
    };

    container.addEventListener('click', handleClick);
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [onDestinationSelect]);

  return (
    <div
      ref={containerRef}
      className="client-grid-wrapper"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .client-grid-wrapper [data-destination-slug] {
              cursor: pointer;
            }
            .client-grid-wrapper [data-destination-slug]:active {
              transform: scale(0.98);
              transition: transform 0.1s ease-out;
            }
          `,
        }}
      />
      {children}
    </div>
  );
}

export default ClientGridWrapper;
