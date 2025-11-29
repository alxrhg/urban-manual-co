'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { generateContextualGreeting, generateContextualPlaceholder, type GreetingContext } from '@/lib/greetings';
import { UserProfile } from '@/types/personalization';
import { JourneyInsights } from '@/lib/greetings/journey-tracker';
import { RecentAchievement } from '@/lib/greetings/achievement-helper';
import { GreetingWeatherData } from '@/lib/greetings/weather-helper';

// Typewriter hook for animated text
function useTypewriter(text: string, speed: number = 50, delay: number = 300) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    const startTimeout = setTimeout(() => {
      let currentIndex = 0;

      const typeInterval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsComplete(true);
        }
      }, speed);

      return () => clearInterval(typeInterval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, delay]);

  return { displayedText, isComplete };
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
  showGreeting?: boolean; // Optional prop to show/hide greeting
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
}: GreetingHeroProps) {
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const { greeting } = generateContextualGreeting(greetingContext);

  // Generate the full greeting text for typewriter
  const fullGreetingText = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    let timeGreeting = "GOOD EVENING";
    if (currentHour < 12) timeGreeting = "GOOD MORNING";
    else if (currentHour < 18) timeGreeting = "GOOD AFTERNOON";

    return userName ? `${timeGreeting}, ${userName.toUpperCase()}` : timeGreeting;
  }, [userName]);

  // Typewriter animation for greeting
  const { displayedText: typedGreeting, isComplete: greetingComplete } = useTypewriter(
    fullGreetingText,
    60, // speed - ms per character
    200  // initial delay
  );

  // Rotating placeholders - Step One spec
  const [isInputFocused, setIsInputFocused] = useState(false);
  const aiPlaceholders = [
    "Ask me anything about travel",
    "Where would you like to go?",
    "Find hotels, restaurants, or hidden gems",
    "Try: budget hotels in Tokyo",
    "Try: best cafes near me",
  ];

  // Rotate placeholder text every 4 seconds when input is empty and not focused
  useEffect(() => {
    if (!isAIEnabled || searchQuery.trim().length > 0 || isInputFocused) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % aiPlaceholders.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [searchQuery, isAIEnabled, isInputFocused, aiPlaceholders.length]);

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
        {/* Greeting above search - Typewriter animation */}
        {showGreeting && (
          <div className="text-left mb-[50px]">
            <h1 className="text-xs text-gray-500 uppercase tracking-[2px] font-medium">
              <span className="inline-block">
                {typedGreeting}
                {/* Blinking cursor while typing */}
                {!greetingComplete && (
                  <span className="inline-block w-[2px] h-[12px] bg-gray-400 ml-[2px] animate-blink align-middle" />
                )}
              </span>
            </h1>
          </div>
        )}

        {/* Borderless Text Input - Minimal editorial style with shimmering placeholder */}
        <div className="relative mb-[50px]">
          {isSearching && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          <div className="relative w-full">
            {/* Shimmering placeholder text overlay */}
            {!searchQuery && !isInputFocused && (
              <div
                className="absolute left-0 top-0 pointer-events-none text-xs uppercase tracking-[2px] font-medium z-0 shimmer-text"
                style={{
                  paddingLeft: isSearching ? '32px' : '0'
                }}
                aria-hidden="true"
              >
                {isAIEnabled ? aiPlaceholders[currentPlaceholderIndex] : "Ask me anything"}
              </div>
            )}
            <input
              ref={inputRef}
              placeholder={isInputFocused ? (isAIEnabled ? aiPlaceholders[currentPlaceholderIndex] : "Ask me anything") : ""}
              value={searchQuery}
              onChange={(e) => {
                handleInputChange(e.target.value);
              }}
              onFocus={() => {
                setIsInputFocused(true);
              }}
              onBlur={() => {
                setIsInputFocused(false);
              }}
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
              className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white transition-all duration-300 relative z-10"
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
      </div>
    </div>
  );
}


