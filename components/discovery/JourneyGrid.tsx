'use client';

import { CuratedJourneyCard } from './CuratedJourneyCard';
import type { CuratedJourneyItem } from './types';

interface JourneyGridProps {
  items: CuratedJourneyItem[];
  onSelect?: (item: CuratedJourneyItem) => void;
  labelledBy: string;
}

export function JourneyGrid({ items, onSelect, labelledBy }: JourneyGridProps) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-labelledby={labelledBy}
    >
      {items.map(item => (
        <div key={item.id} role="listitem" className="h-full">
          <CuratedJourneyCard item={item} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
