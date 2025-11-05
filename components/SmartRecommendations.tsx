'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import Image from 'next/image';
import { MapPin, Sparkles } from 'lucide-react';
import { Destination } from '@/types/destination';

interface SmartRecommendationsProps {
  onCardClick?: (destination: Destination) => void;
}

export function SmartRecommendations({ onCardClick }: SmartRecommendationsProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<string>('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadSmartRecommendations();
  }, [user?.id]);

  const loadSmartRecommendations = async () => {
    try {
      setLoading(true);

      // Determine context (weekend, evening, morning, etc.)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isFriday = dayOfWeek === 5;
      const isNearWeekend = isFriday && hour >= 17; // Friday evening

      let contextType = 'personalized';
      let contextLabel = 'For You';

      if (isWeekend) {
        contextType = 'weekend';
        contextLabel = 'Weekend Picks';
      } else if (isNearWeekend) {
        contextType = 'weekend';
        contextLabel = 'Weekend is Near';
      } else if (hour >= 17 && hour <= 22) {
        contextType = 'evening';
        contextLabel = 'Tonight';
      } else if (hour >= 6 && hour <= 11) {
        contextType = 'morning';
        contextLabel = 'Morning Favorites';
      }

      setContext(contextLabel);

      // Fetch recommendations based on context
      const response = await fetch(`/api/recommendations/smart?context=${contextType}&userId=${user?.id}`);
      const data = await response.json();

      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error loading smart recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) return null;
  if (!recommendations.length) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-gray-400" />
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          {context}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {recommendations.slice(0, 7).map((dest, index) => (
          <button
            key={dest.id}
            onClick={() => {
              if (onCardClick) {
                onCardClick(dest);
              }
            }}
            className={`${CARD_WRAPPER} text-left`}
          >
            <div className={CARD_MEDIA}>
              {dest.image ? (
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <MapPin className="h-8 w-8 opacity-20" />
                </div>
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
            <div className="space-y-0.5">
              <div className={CARD_TITLE}>{dest.name}</div>
              <div className={CARD_META}>
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
