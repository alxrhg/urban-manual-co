'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Destination } from '@/types/destination';
import { CARD_MEDIA, CARD_TITLE, CARD_WRAPPER } from './CardStyles';
import { getCityTheme } from '@/lib/design';
import { stripHtmlTags } from '@/lib/stripHtmlTags';

interface DestinationCardProps {
  destination: Destination;
  index: number;
  isVisited?: boolean;
  onClick: () => void;
  showDescription?: boolean;
}

export function DestinationCard({
  destination,
  index,
  isVisited = false,
  onClick,
  showDescription = true,
}: DestinationCardProps) {
  const { theme: cityTheme, tag } = getCityTheme(destination.city);

  return (
    <button
      data-city-theme={cityTheme}
      onClick={onClick}
      className={`${CARD_WRAPPER} cursor-pointer text-left ${isVisited ? 'opacity-60' : ''}`}
    >
      <div className={CARD_MEDIA}>
        {destination.image ? (
          <Image
            src={destination.image}
            alt={destination.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${isVisited ? 'grayscale' : ''}`}
            quality={80}
            loading={index < 6 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <MapPin className="h-10 w-10 opacity-25" />
          </div>
        )}

        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
          {destination.category && (
            <span
              className="rounded-full px-3 py-1 text-[0.65rem] tracking-[0.18em] uppercase"
              style={{ background: tag, color: '#334155' }}
            >
              {destination.category}
            </span>
          )}
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <span className="rounded-full bg-white/95 px-3 py-1 text-[0.65rem] font-semibold text-gray-900 shadow-sm">
              ⭐ {destination.michelin_stars}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[0.65rem] tracking-[0.22em] uppercase text-gray-500">
            {destination.city.replace(/-/g, ' ')}
          </span>
          {isVisited && (
            <span className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.16em] text-gray-400">
              <span className="compass-indicator spin" aria-hidden />
              Visited
            </span>
          )}
        </div>

        <div className={CARD_TITLE} role="heading" aria-level={3}>
          {destination.name}
        </div>

        {showDescription && destination.description && (
          <p className="text-sm leading-relaxed text-gray-600 line-clamp-2">
            {stripHtmlTags(destination.description)}
          </p>
        )}
      </div>
    </button>
  );
}
