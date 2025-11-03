'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { Search, MapPin, Clock, Map, Grid3x3, SlidersHorizontal, X, Star } from 'lucide-react';
// Lazy load drawer (only when opened)
const DestinationDrawer = dynamic(
  () => import('@/components/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { 
    ssr: false,
    loading: () => null
  }
);
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE } from '@/components/CardStyles';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  initializeSession,
  trackPageView,
  trackDestinationClick,
  trackSearch,
  trackFilterChange,
  getSessionId,
} from '@/lib/tracking';
import GreetingHero from '@/components/GreetingHero';
import { PersonalizedRecommendations } from '@/components/PersonalizedRecommendations';
import { IntelligentSearchFeedback } from '@/components/IntelligentSearchFeedback';
import { SearchFiltersComponent } from '@/components/SearchFilters';
import { ChatInterface } from '@/components/ChatInterface';
import { getCityTheme } from '@/lib/design';
import { stripHtmlTags } from '@/lib/stripHtmlTags';

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 21; // ~3 rows at 7 columns, fits in ~1vh
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<{
    city?: string;
    category?: string;
    michelin?: boolean;
    crown?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    openNow?: boolean;
  }>({});

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
      setCurrentPage(1);
    }
  }, [searchTerm]); // ONLY depend on searchTerm

  // Separate useEffect for filters (only when NO search term)
  useEffect(() => {
    if (!searchTerm.trim()) {
      filterDestinations();
    }
    // Don't reset displayed count here - let the search effect handle it
  }, [selectedCity, selectedCategory, advancedFilters, destinations, visitedSlugs]); // Filters only apply when no search

  // Sync advancedFilters with selectedCity/selectedCategory for backward compatibility
  useEffect(() => {
    setAdvancedFilters(prev => ({
      ...prev,
      city: selectedCity || undefined,
      category: selectedCategory || undefined,
    }));
  }, [selectedCity, selectedCategory]);

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
  const [searchIntent, setSearchIntent] = useState<any>(null); // Store enhanced intent data
  const [seasonalContext, setSeasonalContext] = useState<any>(null);

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

      // Store enhanced intent data for intelligent feedback
      if (data.intent) {
        setSearchIntent(data.intent);
        
        // Fetch seasonal context if city is detected
        if (data.intent.city) {
          try {
            const seasonResponse = await fetch(`/api/seasonality?city=${encodeURIComponent(data.intent.city)}`);
            if (seasonResponse.ok) {
              const seasonData = await seasonResponse.json();
              setSeasonalContext(seasonData);
            }
          } catch (error) {
            // Silently fail - seasonal context is optional
          }
        } else {
          setSeasonalContext(null);
        }
      }

      // ONLY show the latest AI response (simple text)
      setChatResponse(data.content || '');
      
      // ALWAYS set destinations array
      setFilteredDestinations(data.destinations || []);
    } catch (error) {
      console.error('AI chat error:', error);
      setChatResponse('Sorry, I encountered an error. Please try again.');
      setFilteredDestinations([]);
      setSearchIntent(null);
      setSeasonalContext(null);
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
      // City filter (from advancedFilters or selectedCity)
      const cityFilter = advancedFilters.city || selectedCity;
      if (cityFilter) {
        filtered = filtered.filter(d => d.city === cityFilter);
      }

      // Category filter (from advancedFilters or selectedCategory)
      const categoryFilter = advancedFilters.category || selectedCategory;
      if (categoryFilter) {
        filtered = filtered.filter(d =>
          d.category && d.category.toLowerCase().trim() === categoryFilter.toLowerCase().trim()
        );
      }

      // Michelin filter
      if (advancedFilters.michelin) {
        filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
      }

      // Crown filter
      if (advancedFilters.crown) {
        filtered = filtered.filter(d => d.crown === true);
      }

      // Price filter
      if (advancedFilters.minPrice !== undefined) {
        filtered = filtered.filter(d => 
          d.price_level != null && d.price_level >= advancedFilters.minPrice!
        );
      }
      if (advancedFilters.maxPrice !== undefined) {
        filtered = filtered.filter(d => 
          d.price_level != null && d.price_level <= advancedFilters.maxPrice!
        );
      }

      // Rating filter
      if (advancedFilters.minRating !== undefined) {
        filtered = filtered.filter(d => 
          d.rating != null && d.rating >= advancedFilters.minRating!
        );
      }

      // Open Now filter
      if (advancedFilters.openNow) {
        filtered = filtered.filter(d => {
          const hours = d.opening_hours;
          if (!hours?.weekday_text) return false;
          
          try {
            // Get current time in destination's timezone
            const cityKey = d.city.toLowerCase().replace(/\s+/g, '-');
            const CITY_TIMEZONES: Record<string, string> = {
              'tokyo': 'Asia/Tokyo',
              'new-york': 'America/New_York',
              'london': 'Europe/London',
              'paris': 'Europe/Paris',
              'los-angeles': 'America/Los_Angeles',
              'singapore': 'Asia/Singapore',
              'hong-kong': 'Asia/Hong_Kong',
              'sydney': 'Australia/Sydney',
              'dubai': 'Asia/Dubai',
              'bangkok': 'Asia/Bangkok',
            };
            
            let now: Date;
            if (CITY_TIMEZONES[cityKey]) {
              now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[cityKey] }));
            } else {
              now = new Date();
            }
            
            const dayOfWeek = now.getDay();
            const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const todayText = hours.weekday_text[googleDayIndex];
            if (!todayText) return false;
            
            const hoursText = todayText.substring(todayText.indexOf(':') + 1).trim();
            
            if (!hoursText || hoursText.toLowerCase().includes('closed')) {
              return false;
            }
            
            if (hoursText.toLowerCase().includes('24 hours')) {
              return true;
            }
            
            const timeRanges = hoursText.split(',').map((range: string) => range.trim());
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            for (const range of timeRanges) {
              const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
              if (times && times.length >= 2) {
                const parseTime = (timeStr: string): number => {
                  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                  if (!match) return 0;
                  let hours = parseInt(match[1]);
                  const minutes = parseInt(match[2]);
                  const period = match[3].toUpperCase();
                  if (period === 'PM' && hours !== 12) hours += 12;
                  if (period === 'AM' && hours === 12) hours = 0;
                  return hours * 60 + minutes;
                };
                
                const openTime = parseTime(times[0]);
                const closeTime = parseTime(times[1]);
                if (currentTime >= openTime && currentTime < closeTime) {
                  return true;
                }
              }
            }
            
            return false;
          } catch {
            return false;
          }
        });
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
    <ErrorBoundary>
      <main className="relative min-h-screen dark:text-white">
        {/* Hero Section - Separate section, never overlaps with grid */}
        <section className="min-h-[70vh] flex flex-col px-8 py-20">
          <div className="w-full flex md:justify-start flex-1 items-center">
            <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
              {/* Greeting - Always vertically centered */}
              <div className="flex-1 flex items-center">
                <div className="w-full">
                  <GreetingHero
                searchQuery={searchTerm}
                onSearchChange={(value) => {
                  setSearchTerm(value);
                  // Clear conversation history only if search is cleared
                  if (!value.trim()) {
                    setConversationHistory([]);
                    setSearchSuggestions([]);
                    setSearchIntent(null);
                    setSeasonalContext(null);
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
                filters={advancedFilters}
                onFiltersChange={(newFilters) => {
                  setAdvancedFilters(newFilters);
                  // Sync with legacy state for backward compatibility
                  if (newFilters.city !== undefined) {
                    setSelectedCity(newFilters.city || '');
                  }
                  if (newFilters.category !== undefined) {
                    setSelectedCategory(newFilters.category || '');
                  }
                  // Track filter changes
                  Object.entries(newFilters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                      trackFilterChange({ filterType: key, value });
                    }
                  });
                }}
                availableCities={cities}
                availableCategories={categories}
                  />

                  {/* Intelligent Search Feedback - Travel Intelligence Display */}
                  {searchTerm && !searching && searchIntent && (
                    <IntelligentSearchFeedback
                      intent={searchIntent}
                      isSearching={searching}
                      seasonalContext={seasonalContext}
                      onRefine={(suggestion) => {
                        setSearchTerm(suggestion);
                        performAISearch(suggestion);
                      }}
                    />
                  )}

                  {/* Loading State - Travel Intelligence Analysis */}
                  {searchTerm && searching && (
                    <div className="mt-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left">
                      <div className="flex items-center gap-2">
                        <span className="animate-pulse">✨</span>
                        <span>Analyzing your query with travel intelligence...</span>
                      </div>
                    </div>
                  )}

                  {/* Simple Chat Response Fallback */}
                  {searchTerm && !searching && !searchIntent && chatResponse && (
                    <div className="mt-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left">
                      <span className="whitespace-pre-line block">{chatResponse}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* City and Category Lists - Uses space below greeting, aligned to bottom */}
              {!searchTerm && (
                <div className="flex-1 flex items-end">
                  <div className="w-full pt-8 space-y-4">
                    {/* City List */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
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
                        All Cities
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
                    
                    {/* Category List */}
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                        <button
                          onClick={() => {
                            setSelectedCategory("");
                            setAdvancedFilters(prev => ({ ...prev, category: undefined }));
                            trackFilterChange({ filterType: 'category', value: 'all' });
                          }}
                          className={`transition-all ${
                            !selectedCategory
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
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
                              setAdvancedFilters(prev => ({ ...prev, category: newCategory || undefined }));
                              trackFilterChange({ filterType: 'category', value: newCategory || 'all' });
                            }}
                            className={`transition-all ${
                              selectedCategory === category
                                ? "font-medium text-black dark:text-white"
                                : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                            }`}
                          >
                            {capitalizeCategory(category)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

              {/* Content Section - Grid directly below hero */}
              <div className="px-8 pb-20">
                <div className="max-w-[1800px] mx-auto">
                  {/* Filter - Top right of grid section */}
                  <div className="flex justify-end mb-6 relative">
                    <SearchFiltersComponent
                filters={advancedFilters}
                onFiltersChange={(newFilters) => {
                  setAdvancedFilters(newFilters);
                  if (newFilters.city !== undefined) {
                    setSelectedCity(newFilters.city || '');
                  }
                  if (newFilters.category !== undefined) {
                    setSelectedCategory(newFilters.category || '');
                  }
                  Object.entries(newFilters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                      trackFilterChange({ filterType: key, value });
                    }
                  });
                }}
                availableCities={cities}
                availableCategories={categories}
              />
            </div>
            
            {/* Personalized Recommendations - Show only when user is logged in and no active search */}
            {user && !searchTerm.trim() && !selectedCity && !selectedCategory && (
              <PersonalizedRecommendations
                limit={12}
                title="For You"
                showTitle={true}
                onDestinationClick={(destination) => {
                  setSelectedDestination(destination);
                  setIsDrawerOpen(true);
                }}
                className="mb-12"
              />
            )}

            {/* Destination Grid - Original design */}
            {filteredDestinations.length > 0 && (
              <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
                {(() => {
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedDestinations = filteredDestinations.slice(startIndex, endIndex);
                  return paginatedDestinations.map((destination, index) => {
                    const isVisited = user && visitedSlugs.has(destination.slug);
                    const { theme: cityTheme, tag } = getCityTheme(destination.city);

                    return (
                      <button
                        key={destination.slug}
                        data-city-theme={cityTheme}
                        onClick={() => {
                          setSelectedDestination(destination);
                          setIsDrawerOpen(true);

                          trackDestinationClick({
                            destinationSlug: destination.slug,
                            position: index,
                            source: 'grid',
                          });
                        }}
                        className={`${CARD_WRAPPER} cursor-pointer text-left ${isVisited ? 'opacity-60' : ''}`}
                      >
                        <div className={`${CARD_MEDIA}`}>
                          {destination.image ? (
                            <Image
                              src={destination.image}
                              alt={destination.name}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${isVisited ? 'grayscale' : ''}`}
                              quality={80}
                              loading={index < 6 ? 'eager' : 'lazy'}
                              fetchPriority={index === 0 ? 'high' : 'auto'}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <MapPin className="h-10 w-10 opacity-25" />
                            </div>
                          )}

                          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
                            {destination.category && (
                              <span
                                className="rounded-full px-3 py-1 text-[0.65rem] tracking-[0.18em] uppercase"
                                style={{ background: tag, color: '#334155' }}
                              >
                                {destination.category}
                              </span>
                            )}
                            {destination.michelin_stars && destination.michelin_stars > 0 && (
                              <span className="rounded-full bg-white/95 px-3 py-1 text-[0.65rem] font-semibold text-gray-900 shadow-sm">
                                ⭐ {destination.michelin_stars}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[0.65rem] tracking-[0.22em] uppercase text-gray-500">
                              {capitalizeCity(destination.city)}
                            </span>
                            {isVisited && (
                              <span className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.16em] text-gray-400">
                                <span className="compass-indicator spin" aria-hidden /> Visited
                              </span>
                            )}
                          </div>

                          <div className={`${CARD_TITLE}`} role="heading" aria-level={3}>
                            {destination.name}
                          </div>

                          {destination.description && (
                            <p className="text-sm leading-relaxed text-gray-600 line-clamp-2">
                              {stripHtmlTags(destination.description)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  });
                })()}
          </div>

          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);
            if (totalPages <= 1) return null;
            
            return (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${
                          currentPage === pageNum
                            ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
                            : 'border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                
                <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            );
          })()}
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
        </div>
      </main>
    </ErrorBoundary>
  );
}
