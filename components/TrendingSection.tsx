'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';
import { useRouter } from 'next/navigation';

export interface TrendingDestination {
  id?: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string | null;
  rating?: number | null;
  price_level?: number | null;
  michelin_stars?: number | null;
  is_open_now?: boolean;
}

interface TrendingSectionProps {
  destinations: TrendingDestination[];
}

export function TrendingSection({ destinations }: TrendingSectionProps) {
  const router = useRouter();

  if (!destinations.length) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-neutral-500">
          Trending This Week
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {destinations.map((dest) => (
          <button
            key={dest.slug}
            onClick={async () => {
              trackEvent({
                event_type: 'click',
                destination_id: dest.id,
                destination_slug: dest.slug,
                metadata: {
                  category: dest.category,
                  city: dest.city,
                  source: 'trending_section',
                },
              });

              try {
                await fetch('/api/discovery/track-event', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    eventType: 'click',
                    documentId: dest.slug,
                    source: 'trending_section',
                  }),
                });
              } catch (error) {
                console.warn('Discovery Engine tracking error:', error);
              }

              router.push(`/destination/${dest.slug}`);
            }}
            className="group text-left"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80">
              {dest.image ? (
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <MapPin className="h-8 w-8 opacity-20" />
                </div>
              )}
              {dest.is_open_now && (
                <span className="absolute top-2 right-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                  OPEN NOW
                </span>
              )}
              {dest.michelin_stars && dest.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  <span>{dest.michelin_stars}</span>
                </div>
              )}
            </div>
            <div className="space-y-0.5 mt-3">
              <div className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">{dest.name}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {dest.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {dest.city}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
