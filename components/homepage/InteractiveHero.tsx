'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { capitalizeCity } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageData } from './HomepageDataProvider';

const FEATURED_CITIES = ['Taipei', 'Tokyo', 'New York', 'London'];

/**
 * Interactive Hero Component - Apple Design System
 *
 * Clean, minimal hero with search and filters.
 * Uses SF Pro-inspired typography and Apple's spacious layout principles.
 */
export default function InteractiveHero() {
  const router = useRouter();
  const { user } = useAuth();
  const { destinations, cities, categories, isLoading } = useHomepageData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
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

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const destinationCount = destinations.length || '800';

  return (
    <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
      <div className="flex-1 flex items-center">
        <div className="w-full">
          {/* Greeting - Apple-style large typography */}
          <h2 className="text-[2rem] md:text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-gray-900 dark:text-white mb-3">
            {userName ? `${getGreeting()}, ${userName}` : 'Discover the world'}
          </h2>
          <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-8 tracking-[-0.01em]">
            {isLoading ? 'Loading destinations...' : `${destinationCount}+ curated destinations worldwide`}
          </p>

          {/* Search Input - Apple-style rounded search */}
          <form onSubmit={handleSearch} className="mb-10">
            <div className="relative max-w-xl">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Where do you want to go?"
                className="w-full h-[52px] pl-5 pr-12 text-[15px] bg-gray-100/80 dark:bg-white/[0.08]
                           border-0 rounded-[14px] text-gray-900 dark:text-white
                           placeholder:text-gray-400 dark:placeholder:text-gray-500
                           focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/20
                           transition-all duration-200"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                           rounded-[10px] bg-gray-900 dark:bg-white text-white dark:text-gray-900
                           hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors duration-200"
                aria-label="Search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* City Filters - Apple-style pill buttons */}
      <div className="flex-1 flex items-end">
        <div className="w-full pt-6">
          <div className="mb-12">
            <div className="flex flex-wrap gap-x-1 gap-y-2">
              <button
                onClick={() => {
                  setSelectedCity('');
                  router.push('/');
                }}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 ${
                  !selectedCity
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                All
              </button>
              {displayedCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 ${
                    selectedCity.toLowerCase() === city.toLowerCase()
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  {capitalizeCity(city)}
                </button>
              ))}
              {cities.length > displayedCities.length && !showAllCities && (
                <button
                  onClick={() => setShowAllCities(true)}
                  className="px-3 py-1.5 text-[13px] font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  +{cities.length - displayedCities.length} more
                </button>
              )}
              {showAllCities && (
                <button
                  onClick={() => setShowAllCities(false)}
                  className="px-3 py-1.5 text-[13px] font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          </div>

          {/* Category Filters - Subtle text links */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
              {categories.slice(0, 6).map((category) => (
                <button
                  key={category}
                  onClick={() => router.push(`/category/${category.toLowerCase().replace(/\s+/g, '-')}`)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
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
