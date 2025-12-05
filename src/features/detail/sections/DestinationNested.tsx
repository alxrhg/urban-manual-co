'use client';

import Image from 'next/image';
import { MapPin, ChevronRight } from 'lucide-react';
import type { Destination } from '@/types/destination';

interface DestinationNestedProps {
  parentDestination?: Destination | null;
  nestedDestinations?: Destination[];
  loading?: boolean;
  onDestinationClick?: (slug: string) => void;
}

export function DestinationNested({
  parentDestination,
  nestedDestinations = [],
  loading = false,
  onDestinationClick,
}: DestinationNestedProps) {
  const hasContent = parentDestination || nestedDestinations.length > 0 || loading;

  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      {/* Parent Destination */}
      {parentDestination && (
        <button
          onClick={() => {
            if (parentDestination.slug && onDestinationClick) {
              onDestinationClick(parentDestination.slug);
            }
          }}
          className="w-full flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group text-left"
        >
          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
            {parentDestination.image ? (
              <Image
                src={parentDestination.image}
                alt={parentDestination.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                <MapPin className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
              Located inside
            </p>
            <p className="font-medium text-sm text-black dark:text-white truncate group-hover:underline">
              {parentDestination.name}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
        </button>
      )}

      {/* Nested Destinations */}
      {(nestedDestinations.length > 0 || loading) && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Inside this place
          </h4>

          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-shrink-0 w-28">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded mb-1 animate-pulse" />
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              {nestedDestinations.map(nested => (
                <button
                  key={nested.slug}
                  onClick={() => {
                    if (nested.slug && onDestinationClick) {
                      onDestinationClick(nested.slug);
                    }
                  }}
                  className="group text-left flex-shrink-0 w-28"
                >
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-2 border border-gray-100 dark:border-gray-800">
                    {nested.image ? (
                      <Image
                        src={nested.image}
                        alt={nested.name}
                        fill
                        sizes="112px"
                        className="object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                  <h5 className="font-medium text-xs leading-tight line-clamp-2 text-black dark:text-white group-hover:underline">
                    {nested.name}
                  </h5>
                  {nested.category && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                      {nested.category}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
