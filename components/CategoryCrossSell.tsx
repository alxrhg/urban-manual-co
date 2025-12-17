'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ChevronRight, MapPin } from 'lucide-react';

interface CityStat {
  city: string;
  count: number;
}

interface CategoryCrossSellProps {
  currentCategory: string;
  currentCity?: string;
  limit?: number;
}

/**
 * CategoryCrossSell Component
 *
 * Shows other cities with the same category of destinations.
 * Improves internal linking by connecting category pages across cities.
 */
export function CategoryCrossSell({ currentCategory, currentCity, limit = 6 }: CategoryCrossSellProps) {
  const [cities, setCities] = useState<CityStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCitiesWithCategory();
  }, [currentCategory, currentCity]);

  const fetchCitiesWithCategory = async () => {
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data } = await supabase
        .from('destinations')
        .select('city')
        .eq('category', currentCategory);

      if (data) {
        // Count destinations per city
        const cityCount: Record<string, number> = {};
        data.forEach((d) => {
          if (d.city !== currentCity) {
            cityCount[d.city] = (cityCount[d.city] || 0) + 1;
          }
        });

        // Sort by count and take top cities
        const sortedCities = Object.entries(cityCount)
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

        setCities(sortedCities);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCity = (city: string) => {
    return city
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (loading || cities.length === 0) return null;

  return (
    <section className="mt-12 py-8 border-t border-gray-100 dark:border-gray-800">
      <h2 className="text-sm font-medium mb-4 text-gray-600 dark:text-gray-400">
        Explore {formatCategory(currentCategory)}s in Other Cities
      </h2>

      <div className="flex flex-wrap gap-2">
        {cities.map(({ city, count }) => (
          <Link
            key={city}
            href={`/city/${city}?category=${currentCategory}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <MapPin className="w-3 h-3 text-gray-400" />
            <span>{formatCity(city)}</span>
            <span className="text-gray-400">({count})</span>
          </Link>
        ))}
        <Link
          href={`/category/${currentCategory}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </section>
  );
}

export default CategoryCrossSell;
