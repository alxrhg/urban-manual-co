'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Heart, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface BrandExample {
  slug: string;
  name: string;
  city: string;
  image?: string;
  rating?: number;
}

interface BrandAffinity {
  brand: string;
  saved_count: number;
  visited_count: number;
  total_score: number;
  examples: BrandExample[];
}

interface BrandAffinityResponse {
  brand_affinity: BrandAffinity[];
  total_brands: number;
}

interface BrandAffinityDisplayProps {
  userId: string;
}

export function BrandAffinityDisplay({ userId }: BrandAffinityDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BrandAffinityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrandAffinity() {
      try {
        setLoading(true);
        const response = await fetch('/api/account/brand-affinity');

        if (!response.ok) {
          throw new Error('Failed to fetch brand affinity');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching brand affinity:', err);
        setError('Unable to load brand preferences');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchBrandAffinity();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>{error}</p>
      </div>
    );
  }

  if (!data || data.brand_affinity.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <TrendingUp className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Brand Preferences Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          As you save and visit places, we&apos;ll learn your favorite brands and show them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Your Brand Preferences
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Based on {data.total_brands} brands from your saved and visited places
          </p>
        </div>
      </div>

      {/* Brand List */}
      <div className="space-y-4">
        {data.brand_affinity.map((brand, index) => (
          <div
            key={brand.brand}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            {/* Brand Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  index === 0
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : index === 1
                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    : index === 2
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {index + 1}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {brand.brand}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {brand.visited_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {brand.visited_count} visited
                      </span>
                    )}
                    {brand.saved_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {brand.saved_count} saved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Affinity Score */}
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.min(100, Math.round(brand.total_score * 10))}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  affinity
                </div>
              </div>
            </div>

            {/* Affinity Bar */}
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, brand.total_score * 10)}%` }}
              />
            </div>

            {/* Example Destinations */}
            {brand.examples.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {brand.examples.map((example) => (
                  <Link
                    key={example.slug}
                    href={`/destination/${example.slug}`}
                    className="flex-shrink-0 group"
                  >
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {example.image ? (
                        <Image
                          src={example.image}
                          alt={example.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <MapPin className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="mt-1 max-w-[80px]">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {example.name}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {example.city}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {data.total_brands > 10 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Showing top 10 of {data.total_brands} brands
        </p>
      )}
    </div>
  );
}
