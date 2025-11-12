'use client';

import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { CuratedJourneyItem } from './types';

interface CuratedJourneyCardProps {
  item: CuratedJourneyItem;
  onSelect?: (item: CuratedJourneyItem) => void;
}

export function CuratedJourneyCard({ item, onSelect }: CuratedJourneyCardProps) {
  const handleClick = () => {
    onSelect?.(item);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        'group flex h-full w-full flex-col justify-between rounded-3xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700 dark:hover:bg-gray-900',
      )}
      aria-label={`${item.title}. ${item.description}`}
      data-entrypoint-id={item.analyticsId ?? item.id}
    >
      <div>
        {item.icon && (
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg dark:bg-gray-800" aria-hidden="true">
            {item.icon}
          </div>
        )}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
        <span>{item.meta ?? 'Discover journey'}</span>
        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </button>
  );
}
