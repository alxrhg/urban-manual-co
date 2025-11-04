'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function RecentlyViewed() {
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
            onClick={() => router.push(`/destination/${item.slug}`)}
            className="group text-left"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, (max-width: 1536px) 16vw, 14vw"
                />
              )}
            </div>
            <h3 className="text-xs font-medium line-clamp-1 mb-0.5">{item.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
              {capitalizeCity(item.city)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
