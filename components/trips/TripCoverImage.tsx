'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';

interface TripCoverImageProps {
  /** User-uploaded cover image URL */
  coverImageUrl?: string | null;
  /** First destination image from catalog */
  destinationImageUrl?: string | null;
  /** Trip title for alt text */
  title: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether this is a past trip (applies grayscale) */
  isPast?: boolean;
}

/**
 * Trip cover image with fallback to gray placeholder
 *
 * Priority:
 * 1. User-uploaded cover image
 * 2. First destination hero image from catalog
 * 3. Gray placeholder with MapPin icon
 */
export function TripCoverImage({
  coverImageUrl,
  destinationImageUrl,
  title,
  className = '',
  isPast = false,
}: TripCoverImageProps) {
  const baseClasses = `rounded-2xl flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 ${isPast ? 'grayscale-[30%]' : ''}`;
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

  // Priority 3: Gray placeholder with icon
  return (
    <div className={`${combinedClasses} flex items-center justify-center`}>
      <MapPin className="w-6 h-6 text-gray-400 dark:text-gray-500" />
    </div>
  );
}
