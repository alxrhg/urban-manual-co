'use client';

import { Destination } from '@/types/destination';
import { MicroDescriptionHover } from './MicroDescriptionHover';

interface DestinationCardListProps {
  destinations: Destination[];
  selectedDestination: Destination | null;
  onDestinationClick: (destination: Destination) => void;
}

export function DestinationCardList({
  destinations,
  selectedDestination,
  onDestinationClick,
}: DestinationCardListProps) {
  if (destinations.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
      {destinations.slice(0, 50).map((d) => (
        <button
          key={d.id || d.slug}
          onClick={() => onDestinationClick(d)}
          className={`text-left border rounded-xl p-3 transition-colors flex flex-col ${
            selectedDestination?.slug === d.slug
              ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800'
              : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-blue-700'
          }`}
        >
            <div className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{d.name}</div>
            <MicroDescriptionHover
              destination={d}
              textClassName="text-[10px] text-gray-500"
            />
        </button>
      ))}
    </div>
  );
}

