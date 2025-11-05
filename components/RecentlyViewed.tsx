'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
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
        <h2 className="text-sm tracking-wide uppercase text-neutral-500">
          Recently Viewed
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
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
            <div className={CARD_MEDIA}>
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
              <div className={CARD_TITLE}>{item.name}</div>
              <div className={CARD_META}>
                {item.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {capitalizeCity(item.city)}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
