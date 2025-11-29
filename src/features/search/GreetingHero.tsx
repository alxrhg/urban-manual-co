'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/types/personalization';
import { JourneyInsights } from '@/lib/greetings/journey-tracker';
import { RecentAchievement } from '@/lib/greetings/achievement-helper';
import { GreetingWeatherData } from '@/lib/greetings/weather-helper';

// Phase type for the typewriter animation sequence
type TypewriterPhase = 'greeting' | 'greeting-pause' | 'prompt' | 'prompt-shimmer' | 'prompt-pause';

// Combined typewriter hook for greeting → prompts sequence
function useSequentialTypewriter(
  greeting: string,
  prompts: string[],
  options: {
    greetingSpeed?: number;
    promptSpeed?: number;
    greetingDelay?: number;
    greetingPauseDuration?: number;
    promptPauseDuration?: number;
    shimmerDuration?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    greetingSpeed = 50,
    promptSpeed = 40,
    greetingDelay = 200,
    greetingPauseDuration = 1500,
    promptPauseDuration = 3000,
    shimmerDuration = 2000,
    enabled = true,
  } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState<TypewriterPhase>('greeting');
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setDisplayedText('');
    setPhase('greeting');
    setCurrentPromptIndex(0);
    setIsTypingComplete(false);
  }, [cleanup]);

  useEffect(() => {
    if (!enabled) {
      reset();
      return;
    }

    cleanup();

    const typeText = (text: string, speed: number, onComplete: () => void) => {
      let currentIndex = 0;
      setDisplayedText('');
      setIsTypingComplete(false);

      intervalRef.current = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsTypingComplete(true);
          onComplete();
        }
      }, speed);
    };

    if (phase === 'greeting') {
      // Start typing greeting after initial delay
      timeoutRef.current = setTimeout(() => {
        typeText(greeting, greetingSpeed, () => {
          setPhase('greeting-pause');
        });
      }, greetingDelay);
    } else if (phase === 'greeting-pause') {
      // Pause after greeting, then transition to prompts
      timeoutRef.current = setTimeout(() => {
        setPhase('prompt');
      }, greetingPauseDuration);
    } else if (phase === 'prompt') {
      // Type current prompt
      const currentPrompt = prompts[currentPromptIndex];
      typeText(currentPrompt, promptSpeed, () => {
        setPhase('prompt-shimmer');
      });
    } else if (phase === 'prompt-shimmer') {
      // Show shimmer effect for a duration
      timeoutRef.current = setTimeout(() => {
        setPhase('prompt-pause');
      }, shimmerDuration);
    } else if (phase === 'prompt-pause') {
      // Pause then move to next prompt
      timeoutRef.current = setTimeout(() => {
        setCurrentPromptIndex((prev) => (prev + 1) % prompts.length);
        setPhase('prompt');
      }, promptPauseDuration - shimmerDuration);
    }

    return cleanup;
  }, [
    phase,
    greeting,
    prompts,
    currentPromptIndex,
    greetingSpeed,
    promptSpeed,
    greetingDelay,
    greetingPauseDuration,
    promptPauseDuration,
    shimmerDuration,
    enabled,
    cleanup,
  ]);

  // Reset when greeting changes (e.g., user logs in)
  useEffect(() => {
    if (enabled) {
      reset();
      setPhase('greeting');
    }
  }, [greeting, enabled, reset]);

  return {
    displayedText,
    phase,
    isTypingComplete,
    isGreeting: phase === 'greeting' || phase === 'greeting-pause',
    isPrompt: phase === 'prompt' || phase === 'prompt-shimmer' || phase === 'prompt-pause',
    showShimmer: phase === 'prompt-shimmer',
    showCursor: !isTypingComplete || phase === 'greeting-pause',
    reset,
  };
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
  const [isTyping, setIsTyping] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate the greeting text
  const greetingText = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    let timeGreeting = "Good evening";
    if (currentHour < 12) timeGreeting = "Good morning";
    else if (currentHour < 18) timeGreeting = "Good afternoon";

    return userName ? `${timeGreeting}, ${userName}` : timeGreeting;
  }, [userName]);

  // Prompt suggestions
  const prompts = useMemo(() => [
    "Ask me anything about travel",
    "Where would you like to go?",
    "Find hotels, restaurants, or hidden gems",
    "Try: budget hotels in Tokyo",
    "Try: best cafes near me",
  ], []);

  // Sequential typewriter: greeting → prompts with shimmer
  const {
    displayedText,
    isGreeting,
    showShimmer,
    showCursor,
    reset: resetTypewriter,
  } = useSequentialTypewriter(greetingText, prompts, {
    greetingSpeed: 50,
    promptSpeed: 35,
    greetingDelay: 300,
    greetingPauseDuration: 800, // Reduced pause after greeting
    promptPauseDuration: 4000,
    shimmerDuration: 2500,
    enabled: showGreeting && !searchQuery && !isInputFocused,
  });

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
        {/* Unified Input with Typewriter Greeting + Prompts */}
        <div className="relative mb-[50px]">
          {isSearching && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          <div className="relative w-full">
            {/* Typewriter text overlay - greeting then prompts */}
            {!searchQuery && !isInputFocused && showGreeting && (
              <div
                className={`absolute left-0 top-0 pointer-events-none text-xs uppercase tracking-[2px] font-medium z-0 transition-all duration-300 ${
                  showShimmer ? 'shimmer-text' : isGreeting ? 'text-neutral-600 dark:text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'
                }`}
                style={{
                  paddingLeft: isSearching ? '32px' : '0'
                }}
                aria-hidden="true"
              >
                <span className="inline-block">
                  {displayedText}
                  {/* Blinking cursor while typing */}
                  {showCursor && displayedText && (
                    <span className="inline-block w-[2px] h-[12px] bg-neutral-400 dark:bg-neutral-500 ml-[2px] animate-blink align-middle" />
                  )}
                </span>
              </div>
            )}
            {/* Fallback static placeholder when greeting is disabled */}
            {!searchQuery && !isInputFocused && !showGreeting && (
              <div
                className="absolute left-0 top-0 pointer-events-none text-xs uppercase tracking-[2px] font-medium z-0 shimmer-text"
                style={{
                  paddingLeft: isSearching ? '32px' : '0'
                }}
                aria-hidden="true"
              >
                Ask me anything
              </div>
            )}
            <input
              ref={inputRef}
              placeholder={isInputFocused ? "Type to search..." : ""}
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


