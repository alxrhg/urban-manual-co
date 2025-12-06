'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageData } from './HomepageDataProvider';

const FEATURED_CITIES = ['Taipei', 'Tokyo', 'New York', 'London'];

// AI-style rotating placeholders
const AI_PLACEHOLDERS = [
  'Ask me anything about travel...',
  'Where would you like to go?',
  'Find restaurants, hotels, or hidden gems...',
  'Try: "best cafes in Tokyo"',
  'Try: "romantic dinner in Paris"',
  'Try: "budget hotels near me"',
];

/**
 * Interactive Hero Component - Apple Design System
 *
 * Clean, minimal hero with search and filters.
 * Uses SF Pro-inspired typography and Apple's spacious layout principles.
 */
export default function InteractiveHero() {
  const { user } = useAuth();
  const {
    destinations,
    cities,
    categories,
    isLoading,
    selectedCity,
    selectedCategory,
    searchTerm,
    setSelectedCity,
    setSelectedCategory,
    setSearchTerm,
    filteredDestinations,
    openAIChat,
  } = useHomepageData();

  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [showAllCities, setShowAllCities] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotate placeholders when input is empty and not focused
  useEffect(() => {
    if (localSearchTerm.trim() || isFocused) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % AI_PLACEHOLDERS.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [localSearchTerm, isFocused]);

  // Keyboard shortcut: Press '/' to focus search
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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
    setSearchTerm(localSearchTerm);
  }, [localSearchTerm, setSearchTerm]);

  // Handle city filter
  const handleCityClick = useCallback((city: string) => {
    if (city.toLowerCase() === selectedCity.toLowerCase()) {
      setSelectedCity('');
    } else {
      setSelectedCity(city);
    }
  }, [selectedCity, setSelectedCity]);

  // Handle category filter
  const handleCategoryClick = useCallback((category: string) => {
    if (category.toLowerCase() === selectedCategory.toLowerCase()) {
      setSelectedCategory('');
    } else {
      setSelectedCategory(category);
    }
  }, [selectedCategory, setSelectedCategory]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const destinationCount = destinations.length || '800';
  const filteredCount = filteredDestinations.length;
  const hasFilters = selectedCity || selectedCategory || searchTerm;

  return (
    <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
      <div className="flex-1 flex items-center">
        <div className="w-full">
          {/* Greeting - Apple-style large typography */}
          <h2 className="text-[2rem] md:text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-gray-900 dark:text-white mb-3">
            {userName ? `${getGreeting()}, ${userName}` : 'Discover the world'}
          </h2>
          <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-8 tracking-[-0.01em]">
            {isLoading
              ? 'Loading destinations...'
              : hasFilters
                ? `${filteredCount} of ${destinationCount}+ destinations`
                : `${destinationCount}+ curated destinations worldwide`}
          </p>

          {/* Search Input - Chat-style AI search */}
          <form onSubmit={handleSearch} className="mb-10">
            <div className="relative max-w-xl">
              {/* AI indicator */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <Sparkles className={`w-4 h-4 transition-colors ${isFocused ? 'text-purple-500' : 'text-gray-400'}`} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={AI_PLACEHOLDERS[placeholderIndex]}
                className="w-full h-[56px] pl-11 pr-14 text-[15px] bg-gray-100/80 dark:bg-white/[0.08]
                           border-0 rounded-[16px] text-gray-900 dark:text-white
                           placeholder:text-gray-400 dark:placeholder:text-gray-500
                           focus:outline-none focus:ring-2 focus:ring-purple-500/30 dark:focus:ring-purple-500/40
                           focus:bg-white dark:focus:bg-white/[0.12]
                           transition-all duration-200"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center
                           rounded-[12px] bg-gradient-to-r from-purple-500 to-pink-500
                           text-white shadow-lg shadow-purple-500/25
                           hover:from-purple-600 hover:to-pink-600
                           disabled:opacity-50 transition-all duration-200"
                aria-label="Search"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-gray-400 dark:text-gray-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono text-[11px]">/</kbd> to focus • Enter to search
            </p>
          </form>
        </div>
      </div>

      {/* City Filters - Apple-style pill buttons */}
      <div className="flex-1 flex items-end">
        <div className="w-full pt-6">
          <div className="mb-8">
            <div className="flex flex-wrap gap-x-1 gap-y-2">
              <button
                onClick={() => setSelectedCity('')}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 ${
                  !selectedCity
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                All Cities
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

          {/* Category Filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
              <button
                onClick={() => setSelectedCategory('')}
                className={`transition-colors duration-200 ${
                  !selectedCategory
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All
              </button>
              {categories.slice(0, 8).map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`transition-colors duration-200 ${
                    selectedCategory.toLowerCase() === category.toLowerCase()
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {capitalizeCategory(category)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
