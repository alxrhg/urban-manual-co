'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, Hotel, Utensils, Coffee, Wine, Landmark, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';

interface HeroProps {
  onSearch?: (query: string) => void;
  isSearching?: boolean;
}

// Category quick filters
const categories = [
  { name: 'Hotels', icon: Hotel, href: '/category/hotel' },
  { name: 'Dining', icon: Utensils, href: '/category/restaurant' },
  { name: 'Cafes', icon: Coffee, href: '/category/cafe' },
  { name: 'Bars', icon: Wine, href: '/category/bar' },
  { name: 'Culture', icon: Landmark, href: '/category/culture' },
];

// Popular search suggestions
const popularSearches = [
  'Michelin restaurants in Tokyo',
  'Boutique hotels Paris',
  'Hidden gems NYC',
  'Best rooftop bars Bangkok',
  'Coffee shops Singapore',
];

// Rotating placeholder text
const placeholders = [
  'Ask me anything about travel...',
  'Where would you like to explore?',
  'Best rooftop bars in Tokyo...',
  'Boutique hotels in Paris...',
  'Hidden gems near me...',
];

/**
 * Hero section with AI-powered search
 * The centerpiece of the new homepage
 */
export function Hero({ onSearch, isSearching = false }: HeroProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Rotate placeholder text
  useEffect(() => {
    if (isFocused || searchQuery) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isFocused, searchQuery]);

  // Keyboard shortcut: '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        // Default: Open chat drawer with the query
        openDrawer('chat');
      }
    }
  }, [searchQuery, onSearch, openDrawer]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    if (onSearch) {
      onSearch(suggestion);
    } else {
      openDrawer('chat');
    }
  };

  const handleCategoryClick = (href: string) => {
    router.push(href);
  };

  // Generate time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950" />

      {/* Optional: Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-100/30 dark:bg-amber-900/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="text-center mb-10 md:mb-14">
          {user && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 animate-fade-in">
              {getGreeting()}, {user.user_metadata?.full_name?.split(' ')[0] || 'traveler'}
            </p>
          )}
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-serif text-gray-900 dark:text-white tracking-tight">
            Where curiosity meets curation
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover 897+ handpicked destinations across 64 cities worldwide
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto mb-8">
          <div
            className={`
              relative flex items-center
              bg-white dark:bg-gray-900
              border-2 transition-all duration-300
              ${isFocused
                ? 'border-gray-900 dark:border-white shadow-xl'
                : 'border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-600'
              }
              rounded-2xl
              overflow-hidden
            `}
          >
            <div className="flex items-center pl-5 text-gray-400">
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholders[placeholderIndex]}
              className="
                flex-1 py-4 md:py-5 px-4
                text-base md:text-lg
                bg-transparent
                text-gray-900 dark:text-white
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:outline-none
              "
              aria-label="Search destinations"
            />

            {searchQuery && (
              <button
                type="submit"
                className="
                  flex items-center gap-2 px-5 py-2 mr-2
                  bg-gray-900 dark:bg-white
                  text-white dark:text-gray-900
                  rounded-xl
                  text-sm font-medium
                  hover:bg-gray-800 dark:hover:bg-gray-100
                  transition-colors duration-200
                "
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}
          </div>

          {/* Keyboard hint */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 font-mono">/</kbd> to search
          </p>
        </form>

        {/* Category Quick Filters */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.name}
                onClick={() => handleCategoryClick(category.href)}
                className="
                  flex items-center gap-2 px-4 py-2.5
                  bg-white dark:bg-gray-900
                  border border-gray-200 dark:border-gray-700
                  rounded-full
                  text-sm font-medium text-gray-700 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-800
                  hover:border-gray-300 dark:hover:border-gray-600
                  transition-all duration-200
                  shadow-sm hover:shadow
                "
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Popular Searches */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            Popular searches
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {popularSearches.map((search) => (
              <button
                key={search}
                onClick={() => handleSuggestionClick(search)}
                className="
                  px-3 py-1.5
                  text-sm text-gray-600 dark:text-gray-400
                  hover:text-gray-900 dark:hover:text-white
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  rounded-lg
                  transition-colors duration-200
                "
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
