'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface InteractiveHeroProps {
  cities: string[];
  categories: string[];
  initialDestinations: Destination[];
}

const FEATURED_CITIES = ['Taipei', 'Tokyo', 'New York', 'London'];

/**
 * Interactive Hero Component
 *
 * Handles search, city/category filters.
 * Lazy loaded to not block initial page render.
 */
export default function InteractiveHero({
  cities,
  categories,
  initialDestinations,
}: InteractiveHeroProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAllCities, setShowAllCities] = useState(false);

  // Get user's first name for greeting
  const userName = user?.user_metadata?.name?.split(' ')[0] ||
                   user?.email?.split('@')[0];

  // Featured cities that exist in our data
  const featuredCities = FEATURED_CITIES.filter(c =>
    cities.some(city => city.toLowerCase() === c.toLowerCase())
  );
  const remainingCities = cities.filter(
    city => !FEATURED_CITIES.some(fc => fc.toLowerCase() === city.toLowerCase())
  );
  const displayedCities = showAllCities
    ? [...featuredCities, ...remainingCities]
    : featuredCities;

  // Handle search submit
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  }, [searchTerm, router]);

  // Handle city filter
  const handleCityClick = useCallback((city: string) => {
    if (city === selectedCity) {
      setSelectedCity('');
      router.push('/');
    } else {
      setSelectedCity(city);
      router.push(`/city/${city.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }, [selectedCity, router]);

  // Handle category filter
  const handleCategoryClick = useCallback((category: string) => {
    if (category === selectedCategory) {
      setSelectedCategory('');
      router.push('/');
    } else {
      setSelectedCategory(category);
      router.push(`/category/${category.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }, [selectedCategory, router]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
      <div className="flex-1 flex items-center">
        <div className="w-full">
          {/* Greeting */}
          <h2 className="text-2xl md:text-3xl font-medium text-gray-900 dark:text-white mb-2">
            {userName ? `${getGreeting()}, ${userName}` : 'Discover the world'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {initialDestinations.length}+ curated destinations worldwide
          </p>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="mb-8">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Where do you want to go?"
              className="w-full max-w-xl h-12 px-5 text-sm bg-gray-100 dark:bg-gray-900
                         border-0 rounded-2xl text-gray-900 dark:text-white
                         placeholder:text-gray-400 dark:placeholder:text-gray-500
                         focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white
                         transition-all"
            />
          </form>
        </div>
      </div>

      {/* City Filters */}
      <div className="flex-1 flex items-end">
        <div className="w-full pt-6">
          <div className="mb-[50px]">
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
              <button
                onClick={() => {
                  setSelectedCity('');
                  router.push('/');
                }}
                className={`transition-all duration-200 ease-out ${
                  !selectedCity
                    ? 'font-medium text-black dark:text-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60'
                }`}
              >
                All Cities
              </button>
              {displayedCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className={`transition-all duration-200 ease-out ${
                    selectedCity.toLowerCase() === city.toLowerCase()
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60'
                  }`}
                >
                  {capitalizeCity(city)}
                </button>
              ))}
            </div>

            {cities.length > displayedCities.length && !showAllCities && (
              <button
                onClick={() => setShowAllCities(true)}
                className="mt-3 text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
              >
                + More cities ({cities.length - displayedCities.length})
              </button>
            )}
            {showAllCities && (
              <button
                onClick={() => setShowAllCities(false)}
                className="mt-3 text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
              >
                Show less
              </button>
            )}
          </div>

          {/* Category Filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  router.push('/');
                }}
                className={`transition-all duration-200 ease-out ${
                  !selectedCategory
                    ? 'font-medium text-black dark:text-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60'
                }`}
              >
                All Categories
              </button>
              {categories.slice(0, 8).map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`transition-all duration-200 ease-out ${
                    selectedCategory.toLowerCase() === category.toLowerCase()
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
