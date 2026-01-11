'use client';

/**
 * ContextualDestinationCard - Destination card with query-specific reasoning
 *
 * Displays destination with contextual "why" text that echoes user's language.
 * Rosewood aesthetic: full-bleed images, elegant typography, minimal chrome.
 */

import Image from 'next/image';
import type { RankedDestination } from '@/types/search-session';
import { MapPin } from 'lucide-react';

interface ContextualDestinationCardProps {
  destination: RankedDestination;
  onClick?: () => void;
}

export function ContextualDestinationCard({
  destination,
  onClick,
}: ContextualDestinationCardProps) {
  const { destination: dest, reasoning } = destination;

  // Fallback image
  const imageSrc = dest.image || dest.image_thumbnail || '/placeholder-destination.jpg';

  // Contextual "why" text - use reasoning if available, otherwise use micro_description
  const whyText = reasoning?.primaryReason || dest.micro_description || '';

  return (
    <button
      onClick={onClick}
      className="group w-full text-left transition-opacity hover:opacity-90"
    >
      {/* Image - Full Bleed, Photography-Forward */}
      <div className="relative w-full aspect-[4/5] mb-4 overflow-hidden bg-gray-100">
        {dest.image ? (
          <Image
            src={imageSrc}
            alt={dest.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <MapPin className="h-12 w-12 text-gray-200" />
          </div>
        )}

        {/* Michelin Badge - Subtle Overlay */}
        {dest.michelin_stars && dest.michelin_stars > 0 && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-sm shadow-sm">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                <img
                  key={i}
                  src="/michelin-star.svg"
                  alt="Michelin star"
                  className="h-3 w-3"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Text Content */}
      <div className="space-y-2">
        {/* Name - Serif Typography */}
        <h3 className="text-lg font-serif text-gray-900 leading-tight line-clamp-2">
          {dest.name}
        </h3>

        {/* City - Light Sans-Serif */}
        <p className="text-xs text-gray-500 font-light tracking-wide uppercase">
          {dest.city}
        </p>

        {/* Contextual "Why" Text - Echoes User's Language */}
        {whyText && (
          <p className="text-sm text-gray-600 font-light leading-relaxed line-clamp-3">
            {whyText}
          </p>
        )}
      </div>
    </button>
  );
}

export default ContextualDestinationCard;
