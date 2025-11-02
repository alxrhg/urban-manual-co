'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { Search, MapPin, Clock, Map, Grid3x3, SlidersHorizontal, X, Star } from 'lucide-react';
import { DestinationDrawer } from '@/components/DestinationDrawer';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  initializeSession,
  trackPageView,
  trackDestinationClick,
  trackSearch,
  trackFilterChange,
  getSessionId,
} from '@/lib/tracking';
import GreetingHero from '@/components/GreetingHero';

// Dynamically import MapView to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// Category icons mapping - comprehensive list
const CATEGORY_ICONS: Record<string, string> = {
  // Food & Dining
  'dining': '🍴',
  'restaurant': '🍽️',
  'restaurants': '🍽️',
  'food': '🍜',
  'cafe': '☕',
  'cafes': '☕',
  'coffee': '☕',
  'bakery': '🥐',
  'bakeries': '🥐',
  'dessert': '🍰',
  'desserts': '🍰',
  'patisserie': '🧁',
  'breakfast': '🥞',
  'brunch': '🥐',
  'lunch': '🍱',
  'dinner': '🍽️',
  'pizza': '🍕',
  'italian': '🍝',
  'french': '🥖',
  'asian': '🥢',
  'japanese': '🍜',
  'sushi': '🍣',
  'mexican': '🌮',
  'burger': '🍔',
  'burgers': '🍔',
  'seafood': '🦞',
  'steakhouse': '🥩',

  // Drinks & Nightlife
  'bar': '🍸',
  'bars': '🍸',
  'pub': '🍺',
  'pubs': '🍺',
  'cocktail': '🍹',
  'cocktails': '🍹',
  'wine': '🍷',
  'nightlife': '🌙',
  'club': '💃',
  'clubs': '💃',

  // Accommodation
  'hotel': '🏨',
  'hotels': '🏨',
  'accommodation': '🛏️',
  'hostel': '🏠',
  'lodging': '🏨',

  // Culture & Entertainment
  'culture': '🎭',
  'museum': '🏛️',
  'museums': '🏛️',
  'art': '🎨',
  'gallery': '🖼️',
  'galleries': '🖼️',
  'theater': '🎭',
  'theatre': '🎭',
  'cinema': '🎬',
  'music': '🎵',
  'concert': '🎤',

  // Shopping
  'shopping': '🛍️',
  'shop': '🛍️',
  'store': '🏪',
  'market': '🏪',
  'boutique': '👗',
  'retail': '🛍️',

  // Activities & Recreation
  'activity': '🎯',
  'activities': '🎯',
  'sport': '⚽',
  'sports': '⚽',
  'fitness': '💪',
  'gym': '🏋️',
  'park': '🌳',
  'parks': '🌳',
  'outdoor': '🏞️',
  'beach': '🏖️',
  'hiking': '🥾',

  // Services
  'spa': '💆',
  'wellness': '🧘',
  'salon': '💇',
  'beauty': '💄',

  // Other
  'other': '✨',
  'attraction': '🎡',
  'attractions': '🎡',
  'landmark': '🗿',
  'landmarks': '🗿',
};

function getCategoryIcon(category: string): string {
  const key = category.toLowerCase().trim();
  return CATEGORY_ICONS[key] || '📍';
}

function capitalizeCategory(category: string): string {
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Check if AI is enabled (client-side check via API)
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAllCities, setShowAllCities] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchTier, setSearchTier] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchIntent, setSearchIntent] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [displayedCount, setDisplayedCount] = useState(24); // Initial load: 24 items
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const LOAD_MORE_INCREMENT = 24;

  useEffect(() => {
    fetchDestinations();

    // Initialize session tracking
    initializeSession();

    // Track homepage view
    trackPageView({ pageType: 'home' });
  }, []);

  useEffect(() => {
    if (user) {
      fetchVisitedPlaces();
    }
  }, [user]);

  // CHAT MODE with auto-trigger: Auto-trigger on typing (debounced) + explicit Enter submit
  // Works like chat but with convenience of auto-trigger
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const timer = setTimeout(() => {
        performAISearch(searchTerm);
      }, 500); // 500ms debounce for auto-trigger
      return () => clearTimeout(timer);
    } else {
      // Clear everything when search is empty
      setFilteredDestinations([]);
      setChatResponse('');
      setConversationHistory([]);
      setSearching(false);
      // Show all destinations when no search (with filters if set)
      filterDestinations();
      setDisplayedCount(24);
    }
  }, [searchTerm]); // ONLY depend on searchTerm

  // Separate useEffect for filters (only when NO search term)
  useEffect(() => {
    if (!searchTerm.trim()) {
      filterDestinations();
    }
    // Don't reset displayed count here - let the search effect handle it
  }, [selectedCity, selectedCategory, openNowOnly, destinations, visitedSlugs]); // Filters only apply when no search

  const fetchDestinations = async () => {
    try {
      // Select only essential columns to avoid issues with missing columns
      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, michelin_stars, crown')
        .order('name');

      if (error) {
        console.error('Error fetching destinations:', error);
        setDestinations([]);
        setCategories([]);
        setLoading(false);
        return;
      }

      setDestinations(data || []);

      // Extract unique categories from actual data
      const uniqueCategories = Array.from(
        new Set(
          (data || [])
            .map(d => d.category?.trim())
            .filter(Boolean)
        )
      ).sort();

      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      setDestinations([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitedPlaces = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('visited_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      // Handle missing table or RLS errors gracefully
      if (error && (error.code === 'PGRST116' || error.code === 'PGRST301')) {
        // Table doesn't exist or RLS blocking - that's fine, just continue
        return;
      }

      if (error) throw error;

      const slugs = new Set(data?.map(v => v.destination_slug) || []);
      setVisitedSlugs(slugs);
    } catch (error) {
      console.error('Error fetching visited places:', error);
    }
  };

  // AI-powered chat using the chat API endpoint - only website content
  const [chatResponse, setChatResponse] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string, destinations?: Destination[]}>>([]);

  // AI Chat-only search - EXACTLY like chat component
  // Accept ANY query (like chat component), API will validate
  const performAISearch = async (query: string) => {
    // Match chat component: only check if empty or loading
    if (!query.trim() || searching) {
      return;
    }

    setSearching(true);
    setSearchTier('ai-enhanced');
    setSearchIntent(null);
    setSearchSuggestions([]);

    try {
      // Match chat component exactly - build history from existing conversation
      // Chat component maps messages array (which doesn't include current query yet due to async state)
      const historyForAPI = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // ALL queries go through AI chat - no exceptions
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          userId: user?.id,
          conversationHistory: historyForAPI, // History WITHOUT current query (matches chat component)
        }),
      });

      if (!response.ok) {
        throw new Error('AI chat failed');
      }

      const data = await response.json();

      // Update conversation history for API context (not displayed)
      const userMessage = { role: 'user' as const, content: query };
      const assistantMessage = { role: 'assistant' as const, content: data.content || '', destinations: data.destinations };
      
      const newHistory = [
        ...conversationHistory,
        userMessage,
        assistantMessage
      ];
      setConversationHistory(newHistory.slice(-10)); // Keep last 10 messages for context

      // ONLY show the latest AI response (simple text)
      setChatResponse(data.content || '');
      
      // ALWAYS set destinations array
      setFilteredDestinations(data.destinations || []);
    } catch (error) {
      console.error('AI chat error:', error);
      setChatResponse('Sorry, I encountered an error. Please try again.');
      setFilteredDestinations([]);
    } finally {
      setSearching(false);
    }
  };

  // Pinterest-like recommendation algorithm
  const getRecommendationScore = (dest: Destination, index: number): number => {
    let score = 0;

    // Priority signals (like Pinterest's quality score)
    if (dest.crown) score += 20; // Crown badge = featured (reduced from 50)
    if (dest.image) score += 10; // Images get boost
    // Michelin stars are displayed but don't affect ranking

    // Category diversity bonus (ensures mixed content like Pinterest)
    const categoryBonus = (index % 7) * 5; // Rotate through categories (increased from 2)
    score += categoryBonus;

    // Random discovery factor (increased for more serendipity)
    score += Math.random() * 30;

    return score;
  };

  const filterDestinations = () => {
    let filtered = destinations;

    // Apply filters only when there's NO search term (AI chat handles all search)
    if (!searchTerm) {
      if (selectedCity) {
        filtered = filtered.filter(d => d.city === selectedCity);
      }

      if (selectedCategory) {
        filtered = filtered.filter(d =>
          d.category && d.category.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
        );
      }
    }
    // When searchTerm exists, AI chat handles all filtering - don't apply text search here

    // Pinterest-style recommendation sorting
    // Only apply smart sorting when no search term (natural discovery)
    if (!searchTerm) {
      filtered = filtered
        .map((dest, index) => ({
          ...dest,
          _score: getRecommendationScore(dest, index)
        }))
        .sort((a, b) => b._score - a._score);
    }

    // 🎯 When user is signed in: separate visited & unvisited, move visited to bottom
    if (user && visitedSlugs.size > 0) {
      const unvisited = filtered.filter(d => !visitedSlugs.has(d.slug));
      const visited = filtered.filter(d => visitedSlugs.has(d.slug));
      filtered = [...unvisited, ...visited];
    }

    setFilteredDestinations(filtered);
  };

  const cities = Array.from(new Set(destinations.map(d => d.city))).sort();
  const displayedCities = showAllCities ? cities : cities.slice(0, 20);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
      <div className="max-w-[1920px] mx-auto">
        {/* Greeting Hero above the search bar */}
        <div className="mb-4 relative" id="greeting-hero-container">
          <GreetingHero
            searchQuery={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              // Clear conversation history only if search is cleared
              if (!value.trim()) {
                setConversationHistory([]);
                setSearchSuggestions([]);
                setSearchIntent(null);
                setSearchTier(null);
                setChatResponse('');
                setFilteredDestinations([]);
              }
            }}
            onSubmit={(query) => {
              // CHAT MODE: Explicit submit on Enter key (like chat component)
              if (query.trim() && !searching) {
                performAISearch(query);
              }
            }}
            onOpenFilters={() => setIsFiltersOpen(true)}
            userName={(function () {
              const raw = ((user?.user_metadata as any)?.name || (user?.email ? user.email.split('@')[0] : undefined)) as string | undefined;
              if (!raw) return undefined;
              return raw
                .split(/[\s._-]+/)
                .filter(Boolean)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            })()}
            isAIEnabled={isAIEnabled}
            isSearching={searching}
          />
        </div>
        {/* Old search and standalone filters removed (now inside GreetingHero) */}

        {/* Filters Popup - positioned 10px below filter button */}
        {isFiltersOpen && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsFiltersOpen(false)} />
            <div className="fixed right-4 top-[180px] z-50 w-80 sm:w-96 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold uppercase">Filters</h2>
                  <button onClick={() => setIsFiltersOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Open Now Toggle */}
                <div className="mb-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-semibold">Open Now</span>
                    </div>
                    <button
                      onClick={() => {
                        const newValue = !openNowOnly;
                        setOpenNowOnly(newValue);
                        trackFilterChange({ filterType: 'openNow', value: newValue });
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        openNowOnly ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
                          openNowOnly ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold mb-2">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedCategory('');
                          trackFilterChange({ filterType: 'category', value: 'all' });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                          selectedCategory === ''
                            ? "bg-black dark:bg-white text-white dark:text-black"
                            : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span>🌍</span>
                        <span>All</span>
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            trackFilterChange({ filterType: 'category', value: category });
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                            selectedCategory === category
                              ? "bg-black dark:bg.white text-white dark:text-black"
                              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                        >
                          <span>{getCategoryIcon(category)}</span>
                          <span>{capitalizeCategory(category)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* City Filter - Hidden during search, replaced by AI chat response */}
        {!searchTerm ? (
          <div className="mb-6 text-center">
            <div className="max-w-[680px] mx-auto px-[24px]">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
              <button
                onClick={() => {
                  setSelectedCity("");
                  trackFilterChange({ filterType: 'city', value: 'all' });
                }}
                  className={`transition-all ${
                  !selectedCity
                    ? "font-medium text-black dark:text-white"
                    : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                  }`}
              >
                All
              </button>
              {displayedCities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    const newCity = city === selectedCity ? "" : city;
                    setSelectedCity(newCity);
                    trackFilterChange({ filterType: 'city', value: newCity || 'all' });
                  }}
                    className={`transition-all ${
                      selectedCity === city
                        ? "font-medium text-black dark:text-white"
                        : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                    }`}
                >
                  {capitalizeCity(city)}
                </button>
              ))}
              {cities.length > 20 && (
                <button
                  onClick={() => setShowAllCities(!showAllCities)}
                    className="font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300 transition-colors"
            >
                  {showAllCities ? '- Show Less' : '+ Show More'}
                </button>
              )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Simple AI Chat Response - replaces country list */}
            <div className="mb-6 text-center">
              <div className="max-w-[680px] mx-auto px-[24px]">
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {searching ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="animate-pulse">✨</span>
                      <span>Thinking...</span>
                    </div>
                  ) : chatResponse ? (
                    <span className="whitespace-pre-line block">{chatResponse}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Destination Grid */}
        {filteredDestinations.length > 0 && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
            {filteredDestinations.slice(0, displayedCount).map((destination, index) => {
              const isVisited = user && visitedSlugs.has(destination.slug);
              return (
              <button
                key={destination.slug}
                onClick={() => {
                  setSelectedDestination(destination);
                  setIsDrawerOpen(true);

                  // Track destination click
                  trackDestinationClick({
                    destinationSlug: destination.slug,
                    position: index,
                    source: 'grid',
                  });
                }}
                className={`${CARD_WRAPPER} cursor-pointer text-left ${isVisited ? 'opacity-60' : ''}`}
              >
                {/* Image Container */}
                <div className={`${CARD_MEDIA} mb-2 relative overflow-hidden`}>
                  {destination.image ? (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className={`object-cover group-hover:scale-105 transition-transform duration-300 ${isVisited ? 'grayscale' : ''}`}
                      quality={80}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <MapPin className="h-12 w-12 opacity-20" />
                    </div>
                  )}

                  {/* Crown Badge */}
                  {/* Feature badge hidden for now */}

                  {/* Michelin Stars */}
                  {destination.michelin_stars && destination.michelin_stars > 0 && (
                    <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-lg z-10">
                      <Image
                        src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                        alt="Michelin star"
                        width={12}
                        height={12}
                        className="h-3 w-3"
                      />
                      <span>{destination.michelin_stars}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-0.5">
                  <h3 className={`${CARD_TITLE}`}>
                    {destination.name}
                  </h3>

                  <div className={`${CARD_META}`}>
                    <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      {capitalizeCity(destination.city)}
                    </span>
                    {destination.category && (
                      <>
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                          {destination.category}
                        </span>
                      </>
                    )}
                    </div>
                </div>
              </button>
            );
            })}
          </div>

          {/* Load More Button */}
          {displayedCount < filteredDestinations.length && (
            <div className="mt-12 text-center">
              <button
                onClick={() => setDisplayedCount(prev => prev + LOAD_MORE_INCREMENT)}
                className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium"
              >
                Load More ({filteredDestinations.length - displayedCount} remaining)
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Destination Drawer */}
      <DestinationDrawer
        destination={selectedDestination}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setTimeout(() => setSelectedDestination(null), 300);
        }}
      />

    </main>
  );
}
