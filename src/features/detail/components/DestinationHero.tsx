'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Destination } from '@/types/destination';

interface DestinationHeroProps {
  destination: Destination;
  className?: string;
}

/**
 * DestinationHero - Hero image section for destination drawer
 *
 * Displays the main destination image with proper aspect ratio and loading states.
 */
export function DestinationHero({ destination, className = '' }: DestinationHeroProps) {
  const imageUrl = destination.image || destination.image_thumbnail;

  if (!imageUrl) {
    return (
      <div className={`rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}>
        <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden aspect-[4/3] ${className}`}>
      <div className="relative w-full h-full bg-gray-100 dark:bg-gray-800">
        <Image
          src={imageUrl}
          alt={destination.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 420px"
          priority={false}
          quality={85}
        />
      </div>
    </div>
  );
}
