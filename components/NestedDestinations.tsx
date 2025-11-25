'use client';

import { Destination } from '@/types/destination';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MapPin, ArrowRight } from 'lucide-react';
import { capitalizeCity } from '@/lib/utils';

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
    <div>
      <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">
        {parentName ? `Inside ${parentName}` : 'Venues Here'}
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
        {destinations.map((dest) => (
          <button
            key={dest.slug}
            onClick={() => handleClick(dest)}
            className="group text-left flex-shrink-0 w-32 flex flex-col"
          >
            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden mb-2 border border-gray-200 dark:border-gray-800">
              {dest.image ? (
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  className="object-cover group-hover:opacity-90 transition-opacity"
                  quality={85}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <MapPin className="h-8 w-8 opacity-30" />
                </div>
              )}
              {/* Michelin Stars Badge */}
              {dest.michelin_stars && dest.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1">
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                    loading="lazy"
                  />
                  <span>{dest.michelin_stars}</span>
                </div>
              )}
            </div>
            <h4 className="font-medium text-xs leading-tight line-clamp-2 mb-1 text-black dark:text-white">
              {dest.name}
            </h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {dest.category || capitalizeCity(dest.city)}
            </span>
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

