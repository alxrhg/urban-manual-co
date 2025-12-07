'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader2, X, MapPin, ArrowRight, RefreshCw } from 'lucide-react';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageData } from './HomepageDataProvider';
import { Destination } from '@/types/destination';
import Image from 'next/image';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';

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

// Follow-up suggestions based on context
const generateFollowUps = (
  query: string,
  destinations: Destination[],
  filters?: { city?: string | null; category?: string | null }
): string[] => {
  const suggestions: string[] = [];
  const city = filters?.city;
  const category = filters?.category;

  // City-specific follow-ups
  if (city) {
    if (category === 'restaurant') {
      suggestions.push(`Best bars in ${city}`);
      suggestions.push(`Cafes in ${city}`);
    } else if (category === 'hotel') {
      suggestions.push(`Restaurants in ${city}`);
      suggestions.push(`Things to do in ${city}`);
    } else if (category === 'bar') {
      suggestions.push(`Restaurants in ${city}`);
      suggestions.push(`Late night spots in ${city}`);
    } else {
      suggestions.push(`Restaurants in ${city}`);
      suggestions.push(`Hotels in ${city}`);
    }
  }

  // Category-specific without city
  if (!city && category) {
    suggestions.push(`${category}s in Tokyo`);
    suggestions.push(`${category}s in Taipei`);
    suggestions.push(`Best ${category}s in New York`);
  }

  // If we have Michelin results, suggest more premium options
  if (destinations.some(d => d.michelin_stars && d.michelin_stars > 0)) {
    suggestions.push('Show me more Michelin starred');
  }

  // Generic fallbacks
  if (suggestions.length < 3) {
    if (city) {
      suggestions.push(`More in ${city}`);
    }
    suggestions.push('Restaurants in Paris');
    suggestions.push('Hotels in London');
  }

  return suggestions.slice(0, 3);
};

/**
 * Interactive Hero Component - Apple Design System
 *
 * Clean, minimal hero with search and inline AI chat.
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
    openDestination,
    michelinOnly,
    setMichelinOnly,
  } = useHomepageData();

  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [showAllCities, setShowAllCities] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inline chat state
  const [chatResponse, setChatResponse] = useState('');
  const [chatDestinations, setChatDestinations] = useState<Destination[]>([]);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [showChatResults, setShowChatResults] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [lastFilters, setLastFilters] = useState<{ city?: string | null; category?: string | null }>({});

  // Close chat results but keep grid filters
  const handleCloseChatResults = useCallback((resetFilters = false) => {
    setShowChatResults(false);
    setChatResponse('');
    setChatDestinations([]);
    setFollowUpSuggestions([]);
    setConversationHistory([]);
    setLastQuery('');

    // Optionally reset grid filters
    if (resetFilters) {
      setSelectedCity('');
      setSelectedCategory('');
      setLastFilters({});
    }
  }, [setSelectedCity, setSelectedCategory]);

  // Rotate placeholders when input is empty and not focused
  useEffect(() => {
    if (localSearchTerm.trim() || isFocused || showChatResults) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % AI_PLACEHOLDERS.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [localSearchTerm, isFocused, showChatResults]);

  // Keyboard shortcut: Press '/' to focus search
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Press Escape to close chat results (keep filters)
      if (e.key === 'Escape' && showChatResults) {
        handleCloseChatResults(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showChatResults, handleCloseChatResults]);

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

  // Handle AI search
  const handleSearch = useCallback(async (e?: React.FormEvent, queryOverride?: string) => {
    if (e) e.preventDefault();
    const query = queryOverride || localSearchTerm.trim();
    if (!query) return;

    setIsSearching(true);
    setShowChatResults(true);
    setLastQuery(query);
    setChatResponse('');
    setChatDestinations([]);
    setFollowUpSuggestions([]);

    try {
      // Use the new Travel Intelligence endpoint
      const response = await fetch('/api/travel-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversationHistory,
          limit: 20,
        }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();

      setChatResponse(data.response || 'Here are some results:');
      setChatDestinations(data.destinations || []);

      // Store filters for contextual follow-ups
      const filters = data.filters || {};
      setLastFilters(filters);

      // Sync AI search filters with the grid
      // This makes the grid show related results
      if (filters.city) {
        setSelectedCity(filters.city);
      }
      if (filters.category) {
        setSelectedCategory(filters.category);
      }
      if (filters.michelin) {
        setMichelinOnly(true);
      }

      // Use follow-ups from API (intelligent suggestions)
      setFollowUpSuggestions(data.followUps || generateFollowUps(query, data.destinations || [], filters));

      // Update conversation history for context
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: query },
        { role: 'assistant', content: data.response || '' },
      ]);

      // Clear input after successful search
      setLocalSearchTerm('');
    } catch (error) {
      console.error('AI search error:', error);
      setChatResponse('Sorry, I had trouble searching. Please try again.');
      setFollowUpSuggestions(['Restaurants in Tokyo', 'Hotels in Paris', 'Cafes in London']);
    } finally {
      setIsSearching(false);
    }
  }, [localSearchTerm, conversationHistory, setSelectedCity, setSelectedCategory, setMichelinOnly]);

  // Handle follow-up suggestion click
  const handleFollowUp = useCallback((suggestion: string) => {
    setLocalSearchTerm(suggestion);
    handleSearch(undefined, suggestion);
  }, [handleSearch]);

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
  const hasFilters = selectedCity || selectedCategory || searchTerm || michelinOnly;

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

          {/* Search Input - Clean monochrome style */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative max-w-xl">
              {/* AI indicator */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <Sparkles className={`w-4 h-4 transition-colors ${isFocused || showChatResults ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={showChatResults ? 'Ask a follow-up question...' : AI_PLACEHOLDERS[placeholderIndex]}
                className="w-full h-[56px] pl-11 pr-14 text-[15px] bg-gray-100/80 dark:bg-white/[0.08]
                           border-0 rounded-[16px] text-gray-900 dark:text-white
                           placeholder:text-gray-400 dark:placeholder:text-gray-500
                           focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20
                           focus:bg-white dark:focus:bg-white/[0.12]
                           transition-all duration-200"
              />
              <button
                type="submit"
                disabled={isSearching || !localSearchTerm.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center
                           rounded-[12px] bg-gray-900 dark:bg-white
                           text-white dark:text-gray-900
                           hover:bg-gray-800 dark:hover:bg-gray-100
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
            {!showChatResults && (
              <p className="mt-2 text-[12px] text-gray-400 dark:text-gray-500">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono text-[11px]">/</kbd> to focus • Enter to search
              </p>
            )}
          </form>

          {/* Inline Chat Results */}
          {showChatResults && (
            <div className="max-w-xl mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Response header with close button */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Response for "{lastQuery}"</span>
                </div>
                <button
                  onClick={() => handleCloseChatResults(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Close results"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* AI Response text */}
              {chatResponse && (
                <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {chatResponse}
                </p>
              )}

              {/* Destination results - compact cards */}
              {chatDestinations.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {chatDestinations.slice(0, 4).map((dest) => (
                    <button
                      key={dest.id || dest.slug}
                      onClick={() => openDestination(dest)}
                      className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-white/5
                                 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-left group"
                    >
                      {dest.image_thumbnail || dest.image ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                          <Image
                            src={dest.image_thumbnail || dest.image || ''}
                            alt={dest.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-200">
                          {dest.name}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {dest.city} • {capitalizeCategory(dest.category)}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* See all in grid link */}
              {(lastFilters.city || lastFilters.category) && filteredDestinations.length > 0 && (
                <button
                  onClick={() => handleCloseChatResults(false)}
                  className="text-[13px] font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-1.5 hover:underline"
                >
                  See all {filteredDestinations.length} results in grid
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Follow-up suggestions */}
              {followUpSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {followUpSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleFollowUp(suggestion)}
                      className="px-3 py-1.5 text-[12px] font-medium text-gray-600 dark:text-gray-300
                                 bg-gray-100 dark:bg-white/10 rounded-full
                                 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                  <button
                    onClick={() => handleCloseChatResults(true)}
                    className="px-3 py-1.5 text-[12px] font-medium text-gray-400 dark:text-gray-500
                               hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Start over
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* City Filters - Apple-style pill buttons (hidden when chat results are shown) */}
      {!showChatResults && (
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

            {/* Category Filters with Icons */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setMichelinOnly(false);
                  }}
                  className={`transition-colors duration-200 font-medium ${
                    !selectedCategory && !michelinOnly
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  All Categories
                </button>
                {/* Michelin filter with icon */}
                <button
                  onClick={() => setMichelinOnly(!michelinOnly)}
                  className={`flex items-center gap-1.5 transition-colors duration-200 ${
                    michelinOnly
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin"
                    className="w-4 h-4"
                  />
                  Michelin
                </button>
                {/* Category filters with icons */}
                {categories.slice(0, 8).map((category) => {
                  const IconComponent = getCategoryIconComponent(category);
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      className={`flex items-center gap-1.5 transition-colors duration-200 ${
                        selectedCategory.toLowerCase() === category.toLowerCase()
                          ? 'text-gray-900 dark:text-white font-medium'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {IconComponent && <IconComponent className="w-4 h-4" />}
                      {capitalizeCategory(category)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
