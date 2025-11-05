'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Destination } from '@/types/destination';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface RecentlyViewedProps {
  onCardClick?: (destination: Destination) => void;
}

export function RecentlyViewed({ onCardClick }: RecentlyViewedProps) {
  const router = useRouter();
  const { recentlyViewed } = useRecentlyViewed();

  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-gray-400" />
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          Recently Viewed
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {recentlyViewed.map((item) => (
          <button
            key={item.slug}
            onClick={() => {
              if (onCardClick) {
                onCardClick(item as Destination);
              } else {
                router.push(`/destination/${item.slug}`);
              }
            }}
            className={`${CARD_WRAPPER} text-left`}
          >
            <div className={`${CARD_MEDIA} mb-2`}>
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, (max-width: 1536px) 16vw, 14vw"
                />
              )}
              {item.michelin_stars && item.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  <span>{item.michelin_stars}</span>
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <h3 className={CARD_TITLE}>{item.name}</h3>
              <div className={CARD_META}>
                <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {capitalizeCity(item.city)}
                </span>
                {item.category && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                      {item.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
