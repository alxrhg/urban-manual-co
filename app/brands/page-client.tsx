'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Destination } from '@/types/destination';
import { UniversalGrid } from '@/components/UniversalGrid';
import { DestinationCard } from '@/components/DestinationCard';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { supabase } from '@/lib/supabase';

export interface BrandStats {
  brand: string;
  count: number;
  featuredImage?: string;
  categories: string[];
}

/**
 * Props for the BrandsPageClient component
 * Initial data is fetched server-side for faster loading
 */
export interface BrandsPageClientProps {
  initialBrandStats?: BrandStats[];
  initialCategories?: string[];
}

// Convert BrandStats to Destination format for DestinationCard
function brandStatsToDestination(brandData: BrandStats): Destination {
  return {
    slug: brandData.brand,
    name: brandData.brand,
    city: brandData.categories.length > 0 ? brandData.categories.join(', ') : 'Various',
    category: `${brandData.count} place${brandData.count !== 1 ? 's' : ''}`,
    micro_description: brandData.categories.length > 0
      ? `${brandData.categories.slice(0, 3).join(', ')}${brandData.categories.length > 3 ? '...' : ''}`
      : undefined,
    image: brandData.featuredImage,
    image_thumbnail: brandData.featuredImage,
  };
}

export default function BrandsPageClient({
  initialBrandStats = [],
  initialCategories = [],
}: BrandsPageClientProps) {
  const router = useRouter();
  // Track whether we have SSR data
  const hasSSRData = initialBrandStats.length > 0;
  // Initialize state with SSR data if available
  const [brandStats, setBrandStats] = useState<BrandStats[]>(initialBrandStats);
  const [filteredBrands, setFilteredBrands] = useState<BrandStats[]>(initialBrandStats);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState('');
  // Skip loading state if we have SSR data
  const [loading, setLoading] = useState(!hasSSRData);
  const itemsPerPage = useItemsPerPage(4); // Items to add per "Show More" click
  const [displayCount, setDisplayCount] = useState(itemsPerPage);

  // Client-side fetch fallback when SSR data is not available
  useEffect(() => {
    if (!hasSSRData) {
      fetchBrandStats();
    }
  }, [hasSSRData]);

  const fetchBrandStats = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('brand, category, image')
        .not('brand', 'is', null);

      if (error) {
        console.error('Error fetching brand stats:', error.message);
        setLoading(false);
        return;
      }

      const destinations = data || [];

      // Count brands and get featured image
      const brandData: Record<string, { count: number; featuredImage?: string; categories: Set<string> }> = {};

      destinations.forEach((dest: { brand?: string | null; category?: string | null; image?: string | null }) => {
        const brand = (dest.brand ?? '').toString().trim();
        if (!brand) return;

        if (!brandData[brand]) {
          brandData[brand] = {
            count: 0,
            featuredImage: dest.image || undefined,
            categories: new Set<string>(),
          };
        }

        brandData[brand].count += 1;

        if (!brandData[brand].featuredImage && dest.image) {
          brandData[brand].featuredImage = dest.image;
        }

        if (dest.category) {
          brandData[brand].categories.add(dest.category);
        }
      });

      const stats = Object.entries(brandData)
        .map(([brand, data]) => ({
          brand,
          count: data.count,
          featuredImage: data.featuredImage,
          categories: Array.from(data.categories) as string[],
        }))
        .sort((a, b) => b.count - a.count);

      setBrandStats(stats);
      setFilteredBrands(stats);

      // Extract unique categories
      const allCategories = Array.from(
        new Set(stats.flatMap(s => s.categories).filter(Boolean))
      ).sort();
      setCategories(allCategories);

      setLoading(false);
    } catch (error) {
      console.error('Exception fetching brand stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters(brandStats, selectedCategory);
  }, [selectedCategory, brandStats]);

  const applyFilters = (brands: BrandStats[], category: string) => {
    let filtered = [...brands];

    // Category filter
    if (category) {
      filtered = filtered.filter(b => b.categories.includes(category));
    }

    setFilteredBrands(filtered);
    // Reset display count when filters change
    setDisplayCount(itemsPerPage);
  };

  if (loading) {
    return (
      <main className="w-full px-6 md:px-10 py-20 min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-xs text-gray-500 dark:text-gray-400">Loading brands...</div>
        </div>
      </main>
    );
  }

  // Featured brands (top 4 by count from all brands)
  const featuredBrands = brandStats.slice(0, 4);

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      {/* Hero Section */}
      <section>
        <div className="w-full">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-2xl font-light mb-2">Discover by Brand</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {brandStats.length} brand{brandStats.length !== 1 ? 's' : ''} • {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>

          {/* Featured Brands Carousel - At the top */}
          {featuredBrands.length > 0 && (
            <div className="mb-12">
              <div className="mb-6">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Featured Brands</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Most popular brands in our collection
                </p>
              </div>
              {/* Horizontal scrolling carousel */}
              <div className="relative -mx-6 md:-mx-10">
                <div className="overflow-x-auto scrollbar-hide px-6 md:px-10">
                  <div className="flex gap-5 md:gap-7 lg:gap-8 pb-4">
                    {featuredBrands.map((brandData) => (
                      <div key={brandData.brand} className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px]">
                        <DestinationCard
                          destination={brandStatsToDestination(brandData)}
                          onClick={() => router.push(`/brand/${encodeURIComponent(brandData.brand)}`)}
                          showBadges={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Filter Panel */}
          {categories.length > 0 && (
            <div className="mb-12">
              <div className="mb-4">
                <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                  Filter by Category
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Select a category to filter brands
                </p>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-3">
                <button
                  onClick={() => {
                    setSelectedCategory("");
                  }}
                  className={`text-xs font-medium transition-all duration-200 ease-out ${
                    !selectedCategory
                      ? "text-black dark:text-white"
                      : "text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      const newCategory = category === selectedCategory ? "" : category;
                      setSelectedCategory(newCategory);
                    }}
                    className={`text-xs font-medium transition-all duration-200 ease-out ${
                      selectedCategory === category
                        ? "text-black dark:text-white"
                        : "text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Grid Section */}
      <div className="pb-12">
        <div className="w-full">
          {filteredBrands.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-sm text-gray-600 dark:text-gray-400">No brands found</span>
            </div>
          ) : (
            <>
              <UniversalGrid
                items={filteredBrands.slice(0, displayCount)}
                gap="md"
                renderItem={(brandData: BrandStats) => (
                  <DestinationCard
                    key={brandData.brand}
                    destination={brandStatsToDestination(brandData)}
                    onClick={() => router.push(`/brand/${encodeURIComponent(brandData.brand)}`)}
                    showBadges={false}
                  />
                )}
              />

              {/* Show More Button */}
              {displayCount < filteredBrands.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setDisplayCount(prev => prev + itemsPerPage)}
                    className="px-6 py-3 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-60 transition-all duration-200 ease-out text-gray-900 dark:text-white"
                  >
                    Show More ({filteredBrands.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
