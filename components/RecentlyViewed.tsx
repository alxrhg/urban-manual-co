'use client';

import { useRouter } from 'next/navigation';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Destination } from '@/types/destination';
import { LovablyDestinationCard, LOVABLY_BORDER_COLORS } from './LovablyDestinationCard';

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
        {recentlyViewed.map((item, index) => (
          <LovablyDestinationCard
            key={item.slug}
            destination={item as Destination}
            borderColor={LOVABLY_BORDER_COLORS[index % LOVABLY_BORDER_COLORS.length]}
            onClick={() => {
              if (onCardClick) {
                onCardClick(item as Destination);
              } else {
                router.push(`/destination/${item.slug}`);
              }
            }}
            showMLBadges={true}
          />
        ))}
      </div>
    </div>
  );
}
