'use client';

import Image from 'next/image';
import { Destination } from '@/types/destination';

interface LovablyDestinationCardProps {
  destination: Destination;
  borderColor: string;
  onClick: () => void;
}

// Colorful border colors (Lovably-style)
export const LOVABLY_BORDER_COLORS = [
  'border-blue-500',
  'border-red-500',
  'border-green-500',
  'border-yellow-500',
  'border-purple-500',
  'border-orange-500',
  'border-pink-500',
  'border-cyan-500',
];

export function LovablyDestinationCard({ destination, borderColor, onClick }: LovablyDestinationCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative aspect-square overflow-hidden
        border-4 ${borderColor}
        transition-all duration-300
        hover:scale-[1.02]
        bg-gray-100 dark:bg-gray-800
      `}
    >
      {/* Image */}
      {destination.image ? (
        <div className="absolute inset-0">
          <Image
            src={destination.image}
            alt={destination.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
            quality={85}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <span className="text-4xl opacity-20">📍</span>
        </div>
      )}

      {/* Gradient Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Text Overlay (Centered) */}
      <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
        <div className="text-center">
          <h3 className="text-xl md:text-2xl font-medium text-white mb-2 line-clamp-2">
            {destination.name}
          </h3>
          <p className="text-sm text-white/80 line-clamp-1">
            {destination.city && destination.city.charAt(0).toUpperCase() + destination.city.slice(1)}
            {destination.category && ` • ${destination.category}`}
          </p>
        </div>
      </div>

      {/* Michelin Stars Badge (if any) */}
      {destination.michelin_stars && destination.michelin_stars > 0 && (
        <div className="absolute top-2 right-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5 z-20">
          <img
            src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
            alt="Michelin star"
            className="h-3 w-3"
          />
          <span>{destination.michelin_stars}</span>
        </div>
      )}
    </button>
  );
}

