'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, Sparkles, Loader2, X, Clock } from 'lucide-react';
import { SearchFiltersComponent } from '@/src/features/search/SearchFilters';
import { generateContextualGreeting, generateContextualPlaceholder, type GreetingContext } from '@/lib/greetings';
import { UserProfile } from '@/types/personalization';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

const FEATURED_CITY_SLUGS = ['taipei', 'tokyo', 'new-york', 'london'] as const;
const FEATURED_CITY_SET = new Set<string>(FEATURED_CITY_SLUGS);
const MAX_INLINE_CATEGORY_COUNT = 12;

function getCategoryIcon(category: string): React.ComponentType<{ className?: string; size?: number | string }> | null {
  return getCategoryIconComponent(category);
}

interface GreetingHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenFilters?: () => void;
  onSubmit?: (query: string) => void; // CHAT MODE: Explicit submit handler
  userName?: string;
  userProfile?: UserProfile | null;
  lastSession?: {
    id: string;
    last_activity: string;
    context_summary?: {
      city?: string;
      category?: string;
      preferences?: string[];
      lastQuery?: string;
      mood?: string;
      price_level?: string;
    };
  } | null;
  // Phase 2 & 3: Enriched context
  enrichedContext?: {
    journey?: any;
    recentAchievements?: any[];
    nextAchievement?: any;
    weather?: any;
    trendingCity?: string;
    aiGreeting?: string;
  };
  isAIEnabled?: boolean;
  isSearching?: boolean;
  filters?: any;
  onFiltersChange?: (filters: any) => void;
  availableCities?: string[];
  availableCategories?: string[];
  selectedCity?: string;
  selectedCategory?: string;
  onCitySelect?: (city: string | null) => void;
  onCategorySelect?: (category: string | null, options?: { michelin?: boolean }) => void;
  showBrowseLists?: boolean;
}

export default function GreetingHero({
  searchQuery,
  onSearchChange,
  onOpenFilters,
  onSubmit,
  userName,
  userProfile,
  lastSession,
  enrichedContext,
  isAIEnabled = false,
  isSearching = false,
  filters,
  onFiltersChange,
  availableCities = [],
  availableCategories = [],
  selectedCity = '',
  selectedCategory = '',
  onCitySelect,
  onCategorySelect,
  showBrowseLists = true,
}: GreetingHeroProps) {
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute city and category button lists
  const inlineCityButtons = FEATURED_CITY_SLUGS.filter((city) =>
    availableCities.some((availableCity) => availableCity.toLowerCase() === city)
  );
  const overflowCityButtons = availableCities.filter(
    (city) => !FEATURED_CITY_SET.has(city.toLowerCase())
  );
  const inlineCategoryButtons = availableCategories.slice(0, MAX_INLINE_CATEGORY_COUNT);
  const overflowCategoryButtons = availableCategories.slice(MAX_INLINE_CATEGORY_COUNT);

  // Get current time
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // Generate contextual greeting with Phase 2 & 3 enhancements
  const greetingContext: GreetingContext = {
    userName,
    userProfile,
    lastSession,
    currentHour,
    currentDay,
    // Phase 2 & 3 context
    journey: enrichedContext?.journey,
    recentAchievements: enrichedContext?.recentAchievements,
    nextAchievement: enrichedContext?.nextAchievement,
    weather: enrichedContext?.weather,
    trendingCity: enrichedContext?.trendingCity,
    aiGreeting: enrichedContext?.aiGreeting,
  };

  const { greeting, subtext } = generateContextualGreeting(greetingContext);

  // Rotating AI-powered travel intelligence cues
  const contextualPlaceholder = generateContextualPlaceholder(greetingContext);
  const aiPlaceholders = [
    contextualPlaceholder,
    "Ask me anything about travel",
    "Where would you like to explore?",
    "Find romantic hotels in Tokyo",
    "Best time to visit Kyoto?",
    "Show me Michelin restaurants",
    "Vegetarian cafes in Paris",
    "When do cherry blossoms bloom?",
    "Hidden gems in Copenhagen",
    "Compare hotels in Paris",
    "Luxury stays with city views",
    "What's trending in Tokyo?",
    "Find places open late night",
  ];


  // Rotate placeholder text every 3 seconds when input is empty
  useEffect(() => {
    if (!isAIEnabled || searchQuery.trim().length > 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % aiPlaceholders.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [searchQuery, isAIEnabled]);

  // Keyboard shortcut: Press '/' to focus search
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not already focused on an input
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (value: string) => {
    onSearchChange(value);
    
    // Show typing indicator when user is typing
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Hide typing indicator after 1 second of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative" data-name="Search Bar">
      <div className="w-full relative">
        {/* Greeting above search - Enhanced with context */}
        <div className="text-left mb-8">
          <h1 className="text-xs text-gray-500 uppercase tracking-[2px] font-medium">
            {greeting}
          </h1>
        </div>

        {/* Borderless Text Input - Lovably style (no icon, no border, left-aligned) */}
        <div className="relative">
          {isSearching && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          <div className="relative w-full">
            <input
              ref={inputRef}
              placeholder={isAIEnabled ? aiPlaceholders[currentPlaceholderIndex] : "Ask me anything"}
              value={searchQuery}
              onChange={(e) => {
                handleInputChange(e.target.value);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                handleKeyDown(e);
                // CHAT MODE: Submit on Enter key (instant, bypasses debounce)
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (onSubmit && searchQuery.trim()) {
                    onSubmit(searchQuery.trim());
                  }
                }
              }}
              className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 focus:outline-none bg-transparent border-none text-black transition-all duration-300 placeholder:opacity-60"
              style={{
                paddingLeft: isSearching ? '32px' : '0'
              }}
            />
            {/* Typing Indicator - Minimal, editorial style */}
            {isTyping && searchQuery.length > 0 && !isSearching && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <span 
                  className="w-0.5 h-0.5 bg-gray-400 rounded-full opacity-60"
                  style={{ 
                    animation: 'typing-dot 1.4s ease-in-out infinite',
                    animationDelay: '0ms'
                  }} 
                />
                <span 
                  className="w-0.5 h-0.5 bg-gray-400 rounded-full opacity-60"
                  style={{ 
                    animation: 'typing-dot 1.4s ease-in-out infinite',
                    animationDelay: '200ms'
                  }} 
                />
                <span 
                  className="w-0.5 h-0.5 bg-gray-400 rounded-full opacity-60"
                  style={{ 
                    animation: 'typing-dot 1.4s ease-in-out infinite',
                    animationDelay: '400ms'
                  }} 
                />
              </div>
            )}
          </div>
        </div>

        {/* City and Category Lists - Right under search input, no spacing */}
        {showBrowseLists && (
          <div className="w-full space-y-10 overflow-visible mt-0">
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500">Cities</div>
              <div className="flex flex-wrap gap-x-4 md:gap-x-5 gap-y-3 text-xs">
                <button
                  onClick={() => onCitySelect?.(null)}
                  className={`transition-all duration-200 ease-out ${
                    !selectedCity
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  All Cities
                </button>
                {inlineCityButtons.map((city) => (
                  <button
                    key={city}
                    onClick={() => onCitySelect?.(city)}
                    className={`transition-all duration-200 ease-out ${
                      selectedCity === city
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    {capitalizeCity(city)}
                  </button>
                ))}
                {/* Inline expanded overflow cities */}
                {showAllCities && overflowCityButtons.map((city) => (
                  <button
                    key={city}
                    onClick={() => onCitySelect?.(city)}
                    className={`transition-all duration-200 ease-out ${
                      selectedCity === city
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    {capitalizeCity(city)}
                  </button>
                ))}
              </div>
              {overflowCityButtons.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowAllCities(prev => !prev)}
                    className="text-xs font-medium text-black/40 transition-colors duration-200 ease-out hover:text-black/70 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showAllCities
                      ? '− Hide additional cities'
                      : `+ More cities (${overflowCityButtons.length})`}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500">Categories</div>
              <div className="flex flex-wrap gap-x-4 md:gap-x-5 gap-y-3 text-xs">
                <button
                  onClick={() => onCategorySelect?.(null)}
                  className={`transition-all duration-200 ease-out ${
                    !selectedCategory && !filters?.michelin
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  All Categories
                </button>
                <button
                  onClick={() => onCategorySelect?.(null, { michelin: true })}
                  className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                    filters?.michelin
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  Michelin
                </button>
                {inlineCategoryButtons.map((category) => {
                  const IconComponent = getCategoryIcon(category);
                  return (
                    <button
                      key={category}
                      onClick={() => onCategorySelect?.(category)}
                      className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                        selectedCategory === category && !filters?.michelin
                          ? 'font-medium text-black dark:text-white'
                          : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                      }`}
                    >
                      {IconComponent && <IconComponent className="h-3 w-3" size={12} />}
                      {capitalizeCategory(category)}
                    </button>
                  );
                })}
                {/* Inline expanded overflow categories */}
                {showAllCategories && overflowCategoryButtons.map((category) => {
                  const IconComponent = getCategoryIcon(category);
                  return (
                    <button
                      key={category}
                      onClick={() => onCategorySelect?.(category)}
                      className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                        selectedCategory === category && !filters?.michelin
                          ? 'font-medium text-black dark:text-white'
                          : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                      }`}
                    >
                      {IconComponent && <IconComponent className="h-3 w-3" size={12} />}
                      {capitalizeCategory(category)}
                    </button>
                  );
                })}
              </div>
              {overflowCategoryButtons.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowAllCategories(prev => !prev)}
                    className="text-xs font-medium text-black/40 transition-colors duration-200 ease-out hover:text-black/70 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showAllCategories
                      ? '− Hide additional categories'
                      : `+ More categories (${overflowCategoryButtons.length})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


