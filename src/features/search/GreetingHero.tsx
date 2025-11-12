'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateContextualGreeting, generateContextualPlaceholder, type GreetingContext } from '@/lib/greetings';
import { UserProfile } from '@/types/personalization';

type QuickAction = {
  id: string;
  label: string;
  query: string;
  description?: string;
};

function humanizeLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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
}

export default function GreetingHero({
  searchQuery,
  onSearchChange,
  onOpenFilters: _onOpenFilters,
  onSubmit,
  userName,
  userProfile,
  lastSession,
  enrichedContext,
  isAIEnabled = false,
  isSearching = false,
  filters: _filters,
  onFiltersChange: _onFiltersChange,
  availableCities: _availableCities = [],
  availableCategories: _availableCategories = [],
}: GreetingHeroProps) {
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const favoriteCity = userProfile?.favorite_cities?.[0];
  const favoriteCategory = userProfile?.favorite_categories?.[0];
  const favoriteCityLabel = useMemo(() => humanizeLabel(favoriteCity), [favoriteCity]);
  const favoriteCategoryLabel = useMemo(() => humanizeLabel(favoriteCategory), [favoriteCategory]);

  const preferenceSubtext = useMemo(() => {
    if (favoriteCityLabel && favoriteCategoryLabel) {
      return `Still in the mood for ${favoriteCategoryLabel.toLowerCase()} in ${favoriteCityLabel}?`;
    }
    if (favoriteCityLabel) {
      return `Explore what's trending in ${favoriteCityLabel} today.`;
    }
    if (favoriteCategoryLabel) {
      return `Looking for new ${favoriteCategoryLabel.toLowerCase()} to try?`;
    }
    return undefined;
  }, [favoriteCityLabel, favoriteCategoryLabel]);

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [];

    if (favoriteCityLabel && favoriteCategoryLabel) {
      actions.push({
        id: 'city-category',
        label: `Best ${favoriteCategoryLabel} in ${favoriteCityLabel}`,
        description: 'Curated for your favorites',
        query: `Best ${favoriteCategoryLabel} in ${favoriteCityLabel}`,
      });
    }

    if (favoriteCityLabel) {
      actions.push({
        id: 'city-trending',
        label: `${favoriteCityLabel} highlights`,
        description: "See what's hot right now",
        query: `Trending spots in ${favoriteCityLabel}`,
      });
    }

    if (favoriteCategoryLabel) {
      actions.push({
        id: 'category-discover',
        label: `New ${favoriteCategoryLabel}`,
        description: 'Fresh ideas to explore',
        query: `New ${favoriteCategoryLabel} places`,
      });
    }

    const unique = actions.filter((action, index, self) =>
      self.findIndex((item) => item.id === action.id) === index
    );

    return unique.slice(0, 3);
  }, [favoriteCityLabel, favoriteCategoryLabel]);

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

  const heroSubtext = preferenceSubtext ?? subtext;
  const secondarySubtext = preferenceSubtext && subtext && preferenceSubtext !== subtext ? subtext : undefined;
  const showSubtext = searchQuery.trim().length === 0 && !isFocused;
  const showQuickActions = showSubtext && quickActions.length > 0 && !isSearching;

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

  const handleQuickAction = useCallback((action: QuickAction) => {
    onSearchChange(action.query);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    setIsFocused(false);
    inputRef.current?.blur();

    if (onSubmit) {
      setTimeout(() => onSubmit(action.query), 0);
    }

    void import('@/lib/analytics/track').then(({ trackEvent }) => {
      trackEvent({
        event_type: 'quick_action',
        metadata: {
          source: 'greeting_hero',
          actionId: action.id,
          label: action.label,
          query: action.query,
        },
      }).catch(() => {
        // Ignore analytics failures
      });
    });
  }, [onSearchChange, onSubmit]);

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
        <div className="text-left mb-8 space-y-3">
          <h1 className="text-xs text-gray-500 uppercase tracking-[2px] font-medium">
            {greeting}
          </h1>
          {showSubtext && heroSubtext && (
            <div className="space-y-1.5">
              <p className="text-lg md:text-xl lg:text-2xl font-light text-gray-600 dark:text-gray-300">
                {heroSubtext}
              </p>
              {secondarySubtext && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {secondarySubtext}
                </p>
              )}
            </div>
          )}
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
        {showQuickActions && (
          <div className="mt-5 flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleQuickAction(action)}
                className="group inline-flex min-w-[180px] flex-col gap-1 rounded-2xl border border-gray-200 px-4 py-3 text-left transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                aria-label={`Search for ${action.label}`}
              >
                <span className="flex items-center gap-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {action.label}
                </span>
                {action.description && (
                  <span className="text-[11px] text-gray-500 transition group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300">
                    {action.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


