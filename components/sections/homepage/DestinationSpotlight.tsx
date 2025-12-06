'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin } from 'lucide-react';
import { Section } from '../Section';

interface CityStats {
  city: string;
  country?: string;
  count: number;
  image?: string;
}

interface DestinationSpotlightProps {
  cityStats: CityStats[];
}

// Editorial descriptions for featured cities
const cityDescriptions: Record<string, string> = {
  tokyo: 'Ancient traditions meet cutting-edge innovation',
  kyoto: 'Temples, tea houses, and timeless beauty',
  paris: 'The eternal city of light and gastronomy',
  london: 'Historic grandeur meets modern creativity',
  'new york': 'The city that never sleeps',
  bangkok: 'A sensory feast of flavors and culture',
  singapore: 'Where cultures collide in culinary harmony',
  lisbon: 'Sun-drenched streets and seafood treasures',
  melbourne: 'Coffee capital with an artistic soul',
  barcelona: 'Mediterranean charm and modernist marvels',
  taipei: 'Night markets and hidden foodie gems',
  seoul: 'K-culture and culinary traditions',
  dubai: 'Opulence rises from the desert sands',
  copenhagen: 'Nordic design and new Nordic cuisine',
  milan: 'Fashion, art, and aperitivo culture',
};

/**
 * Get editorial description for a city
 */
function getCityDescription(city: string): string {
  const key = city.toLowerCase();
  return cityDescriptions[key] || `Discover curated experiences`;
}

/**
 * Destination Spotlight section
 * Features one large city and supporting city cards
 */
export function DestinationSpotlight({ cityStats }: DestinationSpotlightProps) {
  // Sort cities by count and pick top cities with images
  const citiesWithImages = useMemo(() => {
    return cityStats
      .filter((c) => c.image)
      .sort((a, b) => b.count - a.count);
  }, [cityStats]);

  // Featured city (largest or manually chosen)
  const featuredCity = citiesWithImages[0];

  // Supporting cities (next 3)
  const supportingCities = citiesWithImages.slice(1, 4);

  if (!featuredCity) return null;

  return (
    <Section
      title="Destination Spotlight"
      subtitle="Explore our most curated cities"
      className="py-12 md:py-20"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Featured City - Large Card */}
        <Link
          href={`/city/${featuredCity.city.toLowerCase().replace(/\s+/g, '-')}`}
          className="
            group relative aspect-[4/3] lg:aspect-[3/4]
            rounded-2xl lg:rounded-3xl overflow-hidden
            bg-gray-100 dark:bg-gray-800
          "
        >
          {/* Image */}
          {featuredCity.image ? (
            <Image
              src={featuredCity.image}
              alt={featuredCity.city}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
              <MapPin className="w-16 h-16" />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8">
            <div className="max-w-md">
              <h3 className="text-3xl lg:text-4xl xl:text-5xl font-serif text-white mb-2">
                {featuredCity.city}
              </h3>
              <p className="text-white/80 text-base lg:text-lg mb-4">
                {getCityDescription(featuredCity.city)}
              </p>
              <div className="flex items-center gap-4">
                <span className="text-white/90 text-sm">
                  {featuredCity.count} curated places
                </span>
                <span className="
                  inline-flex items-center gap-1 px-3 py-1.5
                  bg-white text-gray-900
                  rounded-full text-sm font-medium
                  group-hover:bg-gray-100
                  transition-colors duration-200
                ">
                  Explore
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Supporting Cities - Vertical Stack */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-6">
          {supportingCities.map((city) => (
            <Link
              key={city.city}
              href={`/city/${city.city.toLowerCase().replace(/\s+/g, '-')}`}
              className="
                group relative aspect-[16/9] sm:aspect-[4/3] lg:aspect-[3/1]
                rounded-xl lg:rounded-2xl overflow-hidden
                bg-gray-100 dark:bg-gray-800
              "
            >
              {/* Image */}
              {city.image ? (
                <Image
                  src={city.image}
                  alt={city.city}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <MapPin className="w-8 h-8" />
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent lg:bg-gradient-to-t lg:from-black/70 lg:via-black/30 lg:to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 lg:p-5">
                <h4 className="text-xl lg:text-2xl font-medium text-white mb-0.5">
                  {city.city}
                </h4>
                <p className="text-white/80 text-sm">
                  {city.count} places
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* View All Cities Link */}
      <div className="mt-8 text-center">
        <Link
          href="/cities"
          className="
            inline-flex items-center gap-2
            text-sm font-medium
            text-gray-600 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-white
            transition-colors duration-200
          "
        >
          Explore all {cityStats.length}+ cities
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </Section>
  );
}
