'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { generateContextualGreeting, generateContextualPlaceholder, type GreetingContext } from '@/lib/greetings';
import { UserProfile } from '@/types/personalization';
import { JourneyInsights } from '@/lib/greetings/journey-tracker';
import { RecentAchievement } from '@/lib/greetings/achievement-helper';
import { GreetingWeatherData } from '@/lib/greetings/weather-helper';

interface GreetingHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenFilters?: () => void;
  onSubmit?: (query: string) => void;
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
  enrichedContext?: {
    journey?: JourneyInsights | null;
    recentAchievements?: RecentAchievement[];
    nextAchievement?: { name: string; progress: number; target: number; emoji: string } | null;
    weather?: GreetingWeatherData | null;
    trendingCity?: string;
    aiGreeting?: string;
  };
  isAIEnabled?: boolean;
  isSearching?: boolean;
  filters?: Record<string, unknown>;
  onFiltersChange?: (filters: Record<string, unknown>) => void;
  availableCities?: string[];
  availableCategories?: string[];
  showGreeting?: boolean;
  userCity?: string;
  upcomingTrip?: { city: string } | null;
}

export default function GreetingHero({
  searchQuery,
  onSearchChange,
  onSubmit,
  userName,
  userProfile,
  lastSession,
  enrichedContext,
  isAIEnabled = false,
  isSearching = false,
  showGreeting = true,
  userCity,
  upcomingTrip,
}: GreetingHeroProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current time
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // Generate contextual greeting (sentence case)
  const greetingContext: GreetingContext = {
    userName,
    userProfile,
    lastSession,
    currentHour,
    currentDay,
    journey: enrichedContext?.journey,
    recentAchievements: enrichedContext?.recentAchievements,
    nextAchievement: enrichedContext?.nextAchievement,
    weather: enrichedContext?.weather,
    trendingCity: enrichedContext?.trendingCity,
    aiGreeting: enrichedContext?.aiGreeting,
  };

  const { greeting } = generateContextualGreeting(greetingContext);

  // Extract first name only for subtle personalization
  const firstName = userName?.split(' ')[0];

  // Contextual placeholder based on time, location, and trips
  const getContextualPlaceholder = (): string => {
    // Has upcoming trip - suggest for that destination
    if (upcomingTrip?.city) {
      return `things to do in ${upcomingTrip.city.toLowerCase()}`;
    }

    // Use lib/greetings placeholder if available
    if (userProfile || lastSession) {
      return generateContextualPlaceholder(greetingContext);
    }

    // Time-based suggestions
    if (currentHour >= 6 && currentHour < 10) {
      return userCity
        ? `breakfast in ${userCity.toLowerCase()}`
        : 'best coffee shops nearby';
    }

    if (currentHour >= 11 && currentHour < 14) {
      return 'lunch spots nearby';
    }

    if (currentHour >= 17 && currentHour < 21) {
      return 'dinner tonight';
    }

    if (currentHour >= 21 || currentHour < 6) {
      return 'late night eats';
    }

    return 'restaurants, hotels, or hidden gems';
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="w-full h-full relative" data-name="Search Bar">
      <div className="w-full relative">
        {/* Greeting - subtle, muted, sentence case */}
        {showGreeting && (
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500 tracking-wide mb-2">
            {greeting}{firstName ? '' : ''}
          </p>
        )}

        {/* Search input with subtle underline */}
        <div className="search-input-container relative group">
          {isSearching && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          <input
            ref={inputRef}
            placeholder={getContextualPlaceholder()}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              handleKeyDown(e);
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (onSubmit && searchQuery.trim()) {
                  onSubmit(searchQuery.trim());
                }
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full text-xl font-normal text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none bg-transparent border-none py-2 transition-all duration-200"
            style={{ paddingLeft: isSearching ? '32px' : '0' }}
          />
          {/* Subtle underline - visible on focus or hover */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-px transition-colors duration-200 ${
              isFocused
                ? 'bg-gray-400 dark:bg-gray-500'
                : 'bg-gray-200 dark:bg-gray-800 group-hover:bg-gray-300 dark:group-hover:bg-gray-700'
            }`}
          />
        </div>
      </div>
    </div>
  );
}


