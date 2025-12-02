'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, Sparkles, Loader2, Command, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHomepageStore } from '@/lib/stores/homepage-store';
import { cn } from '@/lib/utils';

/**
 * HeroSection - Main search and greeting component
 *
 * Features:
 * - Typewriter animated greeting
 * - AI-powered search with rotating placeholders
 * - Keyboard shortcuts (/ to focus, Cmd+K for command palette)
 * - Recent searches
 * - Search suggestions
 * - Voice search (future)
 */

// ============================================================================
// Types
// ============================================================================

interface HeroSectionProps {
  userName?: string;
  onSearch?: (query: string) => void;
  onAISearch?: (query: string) => void;
  isAIEnabled?: boolean;
  showGreeting?: boolean;
  recentSearches?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const AI_PLACEHOLDERS = [
  "Ask me anything about travel",
  "Where would you like to go?",
  "Find hotels, restaurants, or hidden gems",
  "Try: best rooftop bars in London",
  "Try: Michelin-starred restaurants in Tokyo",
  "Try: boutique hotels near Central Park",
];

const SEARCH_SUGGESTIONS = [
  { query: "romantic restaurants Paris", icon: "🍷" },
  { query: "design hotels Tokyo", icon: "🏨" },
  { query: "rooftop bars New York", icon: "🍸" },
  { query: "coffee shops London", icon: "☕" },
  { query: "hidden gems Barcelona", icon: "💎" },
];

// ============================================================================
// Typewriter Hook
// ============================================================================

function useTypewriter(text: string, speed = 60, delay = 200) {
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

// ============================================================================
// Time-based Greeting
// ============================================================================

function getTimeGreeting(userName?: string): string {
  const hour = new Date().getHours();
  let greeting = 'GOOD EVENING';

  if (hour < 12) greeting = 'GOOD MORNING';
  else if (hour < 18) greeting = 'GOOD AFTERNOON';

  return userName ? `${greeting}, ${userName.toUpperCase()}` : greeting;
}

// ============================================================================
// Hero Section Component
// ============================================================================

export const HeroSection = memo(function HeroSection({
  userName,
  onSearch,
  onAISearch,
  isAIEnabled = true,
  showGreeting = true,
  recentSearches = [],
}: HeroSectionProps) {
  // Local state
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store state
  const isSearching = useHomepageStore((state) => state.isSearching);
  const setFilter = useHomepageStore((state) => state.setFilter);

  // Typewriter greeting
  const greetingText = getTimeGreeting(userName);
  const { displayedText: typedGreeting, isComplete: greetingComplete } = useTypewriter(
    greetingText,
    60,
    200
  );

  // Rotate placeholders
  useEffect(() => {
    if (!isAIEnabled || inputValue.length > 0 || isFocused) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % AI_PLACEHOLDERS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [inputValue, isAIEnabled, isFocused]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' to focus search (when not in input)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Cmd/Ctrl + K for command palette feel
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setFilter('searchTerm', value);
  }, [setFilter]);

  const handleSubmit = useCallback((query?: string) => {
    const searchQuery = query || inputValue.trim();
    if (!searchQuery) return;

    setShowSuggestions(false);

    if (isAIEnabled && onAISearch) {
      onAISearch(searchQuery);
    } else if (onSearch) {
      onSearch(searchQuery);
    }
  }, [inputValue, isAIEnabled, onSearch, onAISearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
      setShowSuggestions(false);
    }
  }, [handleSubmit]);

  const handleSuggestionClick = useCallback((query: string) => {
    setInputValue(query);
    handleSubmit(query);
  }, [handleSubmit]);

  const handleClear = useCallback(() => {
    setInputValue('');
    setFilter('searchTerm', '');
    inputRef.current?.focus();
  }, [setFilter]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Delay hiding suggestions to allow click events to fire
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  return (
    <div ref={containerRef} className="w-full relative" data-component="HeroSection">
      {/* Greeting */}
      {showGreeting && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-left mb-12"
        >
          <h1 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium">
            <span className="inline-block">
              {typedGreeting}
              {!greetingComplete && (
                <span className="inline-block w-[2px] h-3 bg-gray-400 ml-0.5 animate-pulse align-middle" />
              )}
            </span>
          </h1>
        </motion.div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          {/* Loading indicator */}
          {isSearching && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          )}

          {/* AI indicator */}
          {isAIEnabled && !isSearching && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
              <Sparkles className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          {/* Shimmering placeholder overlay */}
          <AnimatePresence mode="wait">
            {!inputValue && !isFocused && (
              <motion.div
                key={placeholderIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="absolute left-6 top-0 pointer-events-none text-xs uppercase tracking-[2px] font-medium shimmer-text text-gray-300 dark:text-gray-600"
                aria-hidden="true"
              >
                {isAIEnabled ? AI_PLACEHOLDERS[placeholderIndex] : 'Search destinations'}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={isFocused ? AI_PLACEHOLDERS[placeholderIndex] : ''}
            className={cn(
              'w-full text-left text-xs uppercase tracking-[2px] font-medium',
              'placeholder:text-gray-300 dark:placeholder:text-gray-500',
              'focus:outline-none bg-transparent border-none',
              'text-black dark:text-white transition-all duration-300',
              'pl-6 pr-20'
            )}
            aria-label="Search destinations"
          />

          {/* Right side actions */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Clear button */}
            {inputValue && (
              <button
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Keyboard shortcut hint */}
            {!isFocused && !inputValue && (
              <div className="flex items-center gap-0.5 text-[10px] text-gray-300 dark:text-gray-600">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && isFocused && !inputValue && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-4 z-50"
            >
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                      Recent
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.slice(0, 5).map((search, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(search)}
                          className="px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                <div className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                    Try searching
                  </p>
                  <div className="space-y-1">
                    {SEARCH_SUGGESTIONS.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(suggestion.query)}
                        className="w-full flex items-center gap-3 px-2 py-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <span className="text-base">{suggestion.icon}</span>
                        <span className="text-xs uppercase tracking-wide">{suggestion.query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CSS for shimmer effect */}
      <style jsx>{`
        .shimmer-text {
          background: linear-gradient(
            90deg,
            rgba(156, 163, 175, 0.5) 0%,
            rgba(156, 163, 175, 1) 50%,
            rgba(156, 163, 175, 0.5) 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2s linear infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }

        @keyframes typing-dot {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
});

export default HeroSection;
