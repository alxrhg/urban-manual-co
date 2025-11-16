'use client';

import { Destination } from '@/types/destination';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MapPin, ArrowRight } from 'lucide-react';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE } from '@/components/CardStyles';
import { MicroDescriptionHover } from './MicroDescriptionHover';

interface NestedDestinationsProps {
  destinations: Destination[];
  parentName?: string;
  onDestinationClick?: (destination: Destination) => void;
}

export function NestedDestinations({ destinations, parentName, onDestinationClick }: NestedDestinationsProps) {
  const router = useRouter();

  if (!destinations || destinations.length === 0) {
    return null;
  }

  const handleClick = (destination: Destination) => {
    if (onDestinationClick) {
      onDestinationClick(destination);
    } else {
      router.push(`/destination/${destination.slug}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {parentName ? `Located in ${parentName}` : 'Nested Destinations'}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {destinations.length} {destinations.length === 1 ? 'venue' : 'venues'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {destinations.map((dest) => (
          <button
            key={dest.slug}
            onClick={() => handleClick(dest)}
            className={`${CARD_WRAPPER} text-left group cursor-pointer flex flex-col`}
          >
            <div className={`${CARD_MEDIA} mb-3 relative`}>
              {dest.image ? (
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  quality={80}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <MapPin className="h-12 w-12 opacity-20" />
                </div>
              )}
            </div>

            <div className="space-y-0 flex-1 flex flex-col">
              <h4 className={`${CARD_TITLE} line-clamp-2 min-h-[2.5rem]`}>{dest.name}</h4>
                <MicroDescriptionHover
                  destination={dest}
                  textClassName="text-[10px] text-gray-600 dark:text-gray-400"
                />
            </div>

            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
              <span>View details</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface LocatedInBadgeProps {
  parent: Destination;
  onClick?: () => void;
}

export function LocatedInBadge({ parent, onClick }: LocatedInBadgeProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/destination/${parent.slug}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-blue-700 transition-colors group"
    >
      <MapPin className="h-3 w-3" />
      <span>Located in</span>
      <span className="font-medium text-gray-900 dark:text-white group-hover:underline">
        {parent.name}
      </span>
      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

