'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CuratedJourneyCard } from './CuratedJourneyCard';
import type { CuratedJourneyItem } from './types';

interface JourneyCarouselProps {
  items: CuratedJourneyItem[];
  onSelect?: (item: CuratedJourneyItem) => void;
  labelledBy: string;
}

export function JourneyCarousel({ items, onSelect, labelledBy }: JourneyCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 'previous' | 'next') => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = container.clientWidth * 0.9;
    container.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white via-white/70 to-transparent dark:from-gray-950 dark:via-gray-950/80" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/70 to-transparent dark:from-gray-950 dark:via-gray-950/80" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollBy('previous')}
          className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-gray-300 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700"
          aria-label="Scroll curated journeys backward"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div
          ref={scrollRef}
          className="scrollbar-thin flex w-full gap-4 overflow-x-auto pb-2 pt-2"
          role="list"
          aria-labelledby={labelledBy}
        >
          {items.map(item => (
            <div key={item.id} role="listitem" className="w-[260px] flex-none">
              <CuratedJourneyCard item={item} onSelect={onSelect} />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollBy('next')}
          className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-gray-300 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700"
          aria-label="Scroll curated journeys forward"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
