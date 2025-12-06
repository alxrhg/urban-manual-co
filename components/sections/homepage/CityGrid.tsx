'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowRight } from 'lucide-react';
import { Section } from '../Section';

interface CityStats {
  city: string;
  country?: string;
  count: number;
  image?: string;
}

interface CityGridProps {
  cityStats: CityStats[];
  maxCities?: number;
}

/**
 * City card with size variants for bento grid
 */
function CityCard({
  city,
  size = 'medium',
}: {
  city: CityStats;
  size?: 'small' | 'medium' | 'large';
}) {
  const slug = city.city.toLowerCase().replace(/\s+/g, '-');

  // Size-specific classes
  const sizeClasses = {
    small: 'aspect-square',
    medium: 'aspect-[4/3]',
    large: 'aspect-[4/3] md:aspect-[3/2] lg:col-span-2 lg:row-span-2',
  };

  const textSizes = {
    small: 'text-lg lg:text-xl',
    medium: 'text-xl lg:text-2xl',
    large: 'text-2xl lg:text-3xl xl:text-4xl',
  };

  return (
    <Link
      href={`/city/${slug}`}
      className={`
        group relative overflow-hidden
        rounded-xl lg:rounded-2xl
        bg-gray-100 dark:bg-gray-800
        ${sizeClasses[size]}
      `}
    >
      {/* Image */}
      {city.image ? (
        <Image
          src={city.image}
          alt={city.city}
          fill
          sizes={
            size === 'large'
              ? '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw'
              : '(max-width: 768px) 50vw, 25vw'
          }
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
          <MapPin className="w-8 h-8" />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 lg:p-6">
        <h3 className={`font-medium text-white ${textSizes[size]}`}>
          {city.city}
        </h3>
        <p className="text-white/80 text-sm mt-1">
          {city.count} {city.count === 1 ? 'place' : 'places'}
        </p>
      </div>

      {/* Hover indicator */}
      <div className="
        absolute top-4 right-4
        w-8 h-8 flex items-center justify-center
        bg-white/20 backdrop-blur-sm rounded-full
        opacity-0 group-hover:opacity-100
        scale-75 group-hover:scale-100
        transition-all duration-300
      ">
        <ArrowRight className="w-4 h-4 text-white" />
      </div>
    </Link>
  );
}

/**
 * City Grid section with bento/masonry layout
 * Shows top cities in an asymmetric grid
 */
export function CityGrid({ cityStats, maxCities = 8 }: CityGridProps) {
  // Sort by count and take top cities with images
  const topCities = useMemo(() => {
    return cityStats
      .filter((c) => c.image)
      .sort((a, b) => b.count - a.count)
      .slice(0, maxCities);
  }, [cityStats, maxCities]);

  // Assign sizes to cities for visual interest
  // First city is large, a couple medium, rest small
  const cityWithSizes = topCities.map((city, index) => ({
    city,
    size: index === 0 ? 'large' : index < 3 ? 'medium' : 'small',
  })) as Array<{ city: CityStats; size: 'small' | 'medium' | 'large' }>;

  if (topCities.length === 0) return null;

  return (
    <Section
      title={`${cityStats.length} Cities, Endless Discovery`}
      subtitle="Explore curated destinations across the globe"
      viewAllHref="/cities"
      viewAllLabel="View all cities"
      className="py-12 md:py-20"
    >
      {/* Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {cityWithSizes.map(({ city, size }) => (
          <CityCard key={city.city} city={city} size={size} />
        ))}
      </div>
    </Section>
  );
}
