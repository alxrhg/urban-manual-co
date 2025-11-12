'use client';

import { useId, type ReactNode } from 'react';
import type { CuratedJourneyItem, CuratedJourneyLayout } from './types';
import { JourneyCarousel } from './JourneyCarousel';
import { JourneyGrid } from './JourneyGrid';

interface CuratedJourneyModuleProps {
  id: string;
  title: string;
  description?: string;
  items: CuratedJourneyItem[];
  layout?: CuratedJourneyLayout;
  onItemSelect?: (item: CuratedJourneyItem) => void;
  actionSlot?: ReactNode;
}

export function CuratedJourneyModule({
  id,
  title,
  description,
  items,
  layout,
  onItemSelect,
  actionSlot,
}: CuratedJourneyModuleProps) {
  const headingId = useId();
  const resolvedLayout: CuratedJourneyLayout = layout ?? (items.length > 3 ? 'carousel' : 'grid');

  return (
    <section aria-labelledby={headingId} className="space-y-4" data-module-id={id}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
        {actionSlot}
      </div>
      {resolvedLayout === 'carousel' ? (
        <JourneyCarousel items={items} onSelect={onItemSelect} labelledBy={headingId} />
      ) : (
        <JourneyGrid items={items} onSelect={onItemSelect} labelledBy={headingId} />
      )}
    </section>
  );
}
