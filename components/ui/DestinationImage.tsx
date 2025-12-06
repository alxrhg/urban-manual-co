'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Destination } from '@/types/destination';

interface DestinationImageProps {
  /** The destination object */
  destination: Pick<Destination, 'name' | 'category' | 'city' | 'country' | 'image' | 'image_thumbnail' | 'micro_description'>;
  /** Override the image URL */
  src?: string;
  /** Additional CSS classes */
  className?: string;
  /** Image sizes for responsive loading */
  sizes?: string;
  /** Image quality (1-100) */
  quality?: number;
  /** Fill the parent container */
  fill?: boolean;
  /** Fixed width (required if not fill) */
  width?: number;
  /** Fixed height (required if not fill) */
  height?: number;
  /** Priority loading */
  priority?: boolean;
  /** Custom alt text override */
  alt?: string;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Placeholder fallback component */
  fallback?: React.ReactNode;
}

/**
 * Generate descriptive alt text from destination metadata
 */
function generateDestinationAltText(destination: DestinationImageProps['destination']): string {
  const parts: string[] = [];

  // Start with name
  if (destination.name) {
    parts.push(destination.name);
  }

  // Add category if different from name
  if (destination.category && destination.category.toLowerCase() !== destination.name?.toLowerCase()) {
    parts.push(destination.category);
  }

  // Add location
  if (destination.city) {
    const cityFormatted = destination.city.charAt(0).toUpperCase() + destination.city.slice(1);
    if (destination.country) {
      parts.push(`in ${cityFormatted}, ${destination.country}`);
    } else {
      parts.push(`in ${cityFormatted}`);
    }
  } else if (destination.country) {
    parts.push(`in ${destination.country}`);
  }

  // If we have a micro description, use it as it's more descriptive
  if (destination.micro_description && parts.length <= 1) {
    return destination.micro_description;
  }

  return parts.join(' - ') || 'Destination image';
}

/**
 * Get the best available image URL for a destination
 */
function getDestinationImageUrl(destination: DestinationImageProps['destination'], override?: string): string | null {
  if (override) return override;
  return destination.image_thumbnail || destination.image || null;
}

/**
 * Destination image component with accessible alt text
 * Generates descriptive alt text from destination metadata
 */
export function DestinationImage({
  destination,
  src,
  className = '',
  sizes = '(max-width: 768px) 100vw, 50vw',
  quality = 85,
  fill = true,
  width,
  height,
  priority = false,
  alt,
  onError,
  fallback
}: DestinationImageProps) {
  const [imageError, setImageError] = useState(false);

  const imageUrl = getDestinationImageUrl(destination, src);
  const altText = alt || generateDestinationAltText(destination);

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  // No image or error - show fallback
  if (!imageUrl || imageError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}>
        <span className="text-4xl opacity-20" aria-hidden="true">📍</span>
        <span className="sr-only">{altText}</span>
      </div>
    );
  }

  const imageProps = fill
    ? { fill: true as const }
    : { width: width || 400, height: height || 300 };

  return (
    <Image
      src={imageUrl}
      alt={altText}
      className={className}
      sizes={sizes}
      quality={quality}
      priority={priority}
      onError={handleError}
      {...imageProps}
    />
  );
}

/**
 * Utility function to generate alt text for destinations
 * Can be used directly when DestinationImage component is not suitable
 */
export function getDestinationAltText(destination: Partial<Destination>): string {
  return generateDestinationAltText({
    name: destination.name || '',
    category: destination.category,
    city: destination.city,
    country: destination.country,
    micro_description: destination.micro_description,
    image: destination.image,
    image_thumbnail: destination.image_thumbnail
  });
}
