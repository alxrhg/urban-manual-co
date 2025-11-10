'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';
import { useRouter } from 'next/navigation';

interface Destination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string;
  rating?: number;
  price_level?: number;
  michelin_stars?: number;
}

export function ForYouSection() {
  const router = useRouter();
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetch(`/api/personalization/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setDestinations(data.results || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [user?.id]);

  if (!user || loading) return null;
  if (!destinations.length) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-neutral-500">
          For You
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {destinations.slice(0, 6).map((dest, index) => (
          <button
            key={dest.id}
            onClick={() => {
              trackEvent({
                event_type: 'click',
                destination_id: dest.id,
                destination_slug: dest.slug,
                metadata: {
                  category: dest.category,
                  city: dest.city,
                  source: 'for_you_section',
                },
              });
              router.push(`/destination/${dest.slug}`);
            }}
            className={`${CARD_WRAPPER} text-left`}
          >
            <div className={`${CARD_MEDIA} mb-3`}>
              {dest.image ? (
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  quality={80}
                  loading={index < 6 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <MapPin className="h-8 w-8 opacity-20" />
                </div>
              )}
              {dest.michelin_stars && dest.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-dark-blue-600 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-dark-blue-900/90 backdrop-blur-sm flex items-center gap-1.5">
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  <span>{dest.michelin_stars}</span>
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <div className={CARD_TITLE}>{dest.name}</div>
              <div className={CARD_META}>
                <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {dest.city}
                </span>
                {dest.category && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                      {dest.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

