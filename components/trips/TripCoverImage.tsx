'use client';

import Image from 'next/image';
import { getDestinationColors, getGradientStyle } from '@/lib/trip';

interface TripCoverImageProps {
  /** User-uploaded cover image URL */
  coverImageUrl?: string | null;
  /** First destination image from catalog */
  destinationImageUrl?: string | null;
  /** Destination name/slug for gradient fallback */
  destination?: string | null;
  /** Trip emoji for gradient fallback */
  emoji?: string | null;
  /** Trip title for alt text */
  title: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether this is a past trip (applies grayscale) */
  isPast?: boolean;
}

/**
 * Trip cover image with intelligent fallbacks
 *
 * Priority:
 * 1. User-uploaded cover image
 * 2. First destination hero image from catalog
 * 3. Destination-based gradient with trip emoji
 * 4. Default gray gradient with airplane emoji
 */
export function TripCoverImage({
  coverImageUrl,
  destinationImageUrl,
  destination,
  emoji,
  title,
  className = '',
  isPast = false,
}: TripCoverImageProps) {
  const baseClasses = `w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden ${isPast ? 'grayscale-[30%]' : ''}`;
  const combinedClasses = `${baseClasses} ${className}`;

  // Priority 1: User-uploaded cover image
  if (coverImageUrl) {
    return (
      <div className={combinedClasses}>
        <Image
          src={coverImageUrl}
          alt={title}
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Priority 2: First destination image from catalog
  if (destinationImageUrl) {
    return (
      <div className={combinedClasses}>
        <Image
          src={destinationImageUrl}
          alt={title}
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Priority 3 & 4: Gradient with emoji
  const colors = getDestinationColors(destination);
  const gradientStyle = getGradientStyle(colors);
  const displayEmoji = emoji || '✈️';

  return (
    <div
      className={`${combinedClasses} flex items-center justify-center`}
      style={{ background: gradientStyle }}
    >
      <span className="text-2xl" role="img" aria-label="trip icon">
        {displayEmoji}
      </span>
    </div>
  );
}
