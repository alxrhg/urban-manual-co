'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, Sparkles, Loader2, X, Clock } from 'lucide-react';
import { SearchFiltersComponent } from '@/components/SearchFilters';

interface ActionPrompt {
  label: string;
  query: string;
}

/**
 * Generate a contextual daily summary based on current date/time
 */
function getDailySummary(date: Date): string {
  const day = date.getDay();
  const dayOfMonth = date.getDate();
  const month = date.getMonth();
  const hour = date.getHours();

  // Special date commentary
  if (dayOfMonth === 13 && day === 5) {
    return "Friday the 13th — time to discover somewhere unexpected.";
  }
  if (month === 11 && dayOfMonth >= 20 && dayOfMonth <= 31) {
    return "Holiday season is here — find the perfect spot for celebrations.";
  }
  if (month === 0 && dayOfMonth <= 7) {
    return "New year, new places to explore. Where will you go first?";
  }

  // Day-of-week based summaries
  const daySummaries: Record<number, string[]> = {
    0: [ // Sunday
      "Sunday vibes — perfect for a leisurely brunch or scenic walk.",
      "Take it slow today. A cozy café or hidden gem awaits.",
    ],
    1: [ // Monday
      "New week, fresh starts. What will you discover today?",
      "Monday energy — fuel up at a great breakfast spot.",
    ],
    2: [ // Tuesday
      "Tuesday is underrated. Beat the crowds at your next favorite place.",
      "Mid-week momentum building. Time for a lunch discovery.",
    ],
    3: [ // Wednesday
      "Halfway through the week — treat yourself to something special.",
      "Hump day calls for a pick-me-up. Coffee or cocktails?",
    ],
    4: [ // Thursday
      "Almost there — preview the weekend with an evening out.",
      "Thursday's the new Friday. Start your weekend early.",
    ],
    5: [ // Friday
      "Weekend mode activated. Where are you headed tonight?",
      "Friday freedom — the city is yours to explore.",
    ],
    6: [ // Saturday
      "Weekend adventures await. Make today count.",
      "Saturday is for wandering. Find something new.",
    ],
  };

  // Time-based refinements
  if (hour >= 6 && hour < 11) {
    if (day === 0 || day === 6) {
      return "Weekend morning — the best time for brunch hunting.";
    }
    return daySummaries[day][0];
  }
  if (hour >= 17 && hour < 21) {
    return "Evening is calling — dinner reservations or cocktail hour?";
  }
  if (hour >= 21 || hour < 2) {
    return "The night is young. Where will you end up?";
  }

  // Default to day-based
  const summaries = daySummaries[day] || ["Every day is a good day for discovery."];
  return summaries[Math.floor(Math.random() * summaries.length)] || summaries[0];
}

/**
 * Generate contextual action prompts based on time/day
 */
function getActionPrompts(date: Date): ActionPrompt[] {
  const hour = date.getHours();
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;

  // Morning prompts (6am-11am)
  if (hour >= 6 && hour < 11) {
    return isWeekend
      ? [
          { label: "Brunch spots", query: "best brunch spots" },
          { label: "Coffee & pastries", query: "specialty coffee and pastries" },
        ]
      : [
          { label: "Quick breakfast", query: "quick breakfast spots" },
          { label: "Great coffee", query: "best coffee shops" },
        ];
  }

  // Lunch (11am-2pm)
  if (hour >= 11 && hour < 14) {
    return [
      { label: "Lunch nearby", query: "best lunch restaurants" },
      { label: "Quick bites", query: "casual lunch spots" },
    ];
  }

  // Afternoon (2pm-5pm)
  if (hour >= 14 && hour < 17) {
    return [
      { label: "Afternoon tea", query: "afternoon tea or cafe" },
      { label: "Happy hour", query: "best happy hour deals" },
    ];
  }

  // Evening (5pm-9pm)
  if (hour >= 17 && hour < 21) {
    return isWeekend
      ? [
          { label: "Dinner date", query: "romantic dinner restaurants" },
          { label: "Group dining", query: "restaurants for groups" },
        ]
      : [
          { label: "Dinner tonight", query: "best dinner spots" },
          { label: "After work drinks", query: "cocktail bars" },
        ];
  }

  // Late night (9pm-2am)
  if (hour >= 21 || hour < 2) {
    return [
      { label: "Late night eats", query: "late night restaurants" },
      { label: "Cocktail bars", query: "best cocktail bars" },
    ];
  }

  // Default / early morning
  return [
    { label: "Explore nearby", query: "hidden gems nearby" },
    { label: "Trending now", query: "trending restaurants" },
  ];
}

interface GreetingHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenFilters?: () => void;
  onSubmit?: (query: string) => void; // CHAT MODE: Explicit submit handler
  userName?: string;
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
  onOpenFilters,
  onSubmit,
  userName,
  isAIEnabled = false,
  isSearching = false,
  filters,
  onFiltersChange,
  availableCities = [],
  availableCategories = [],
}: GreetingHeroProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotating AI-powered travel intelligence cues
  const aiPlaceholders = [
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

  // Get current time for greeting
  const now = new Date();
  const currentHour = now.getHours();
  let greeting = 'GOOD EVENING';
  if (currentHour < 12) {
    greeting = 'GOOD MORNING';
  } else if (currentHour < 18) {
    greeting = 'GOOD AFTERNOON';
  }

  // Format date and time
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const dateStr = now.toLocaleDateString('en-US', options);
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Fetch AI suggestions as user types (lower threshold for AI chat mode)
  useEffect(() => {
    if (!isAIEnabled || !searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const response = await fetch('/api/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        });
        if (!response.ok) {
          console.warn('Autocomplete API failed:', response.status);
          return;
        }
        const data = await response.json();

        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isAIEnabled]);

  const handleSuggestionClick = (suggestion: string) => {
    // Remove emoji prefixes for cleaner search
    const cleanSuggestion = suggestion
      .replace(/^[📍🏛️🏷️]\s*/, '') // Remove emoji prefixes
      .split(' - ')[0] // Take only the main part (remove city suffix for destinations)
      .trim();
    onSearchChange(cleanSuggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
    // Auto-submit if onSubmit handler is provided
    if (onSubmit && cleanSuggestion.trim()) {
      onSubmit(cleanSuggestion.trim());
    }
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="w-full h-full relative" data-name="Search Bar">
      <div className="w-full relative">
        {/* Date and Greeting Section */}
        <div className="text-left mb-8">
          {/* Date Display */}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[2px] mb-1">
            {dateStr}
          </p>

          {/* Greeting */}
          <h1 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium mb-3">
            {greeting}{userName ? `, ${userName}` : ''}
          </h1>

          {/* Daily Summary */}
          <p className="text-[11px] text-gray-500 dark:text-gray-400 italic mb-4">
            {getDailySummary(now)}
          </p>

          {/* Quick Action Prompts */}
          <div className="flex flex-wrap gap-2">
            {getActionPrompts(now).map((prompt, index) => (
              <button
                key={index}
                onClick={() => {
                  onSearchChange(prompt.query);
                  if (onSubmit) {
                    onSubmit(prompt.query);
                  }
                }}
                className="text-[10px] uppercase tracking-[1.5px] px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
              >
                {prompt.label}
              </button>
            ))}
          </div>
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
                onSearchChange(e.target.value);
                if (e.target.value.trim().length >= 2) {
                  setShowSuggestions(true);
                } else {
                  setShowSuggestions(false);
                }
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
              onFocus={() => {
                if (suggestions.length > 0 && searchQuery.trim().length >= 2) {
                  setShowSuggestions(true);
                }
              }}
              className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white transition-all duration-300 placeholder:opacity-60"
              style={{ 
                paddingLeft: isSearching ? '32px' : '0',
                paddingRight: isAIEnabled && !searchQuery ? '80px' : '0'
              }}
            />
            {/* Travel Intelligence hint */}
            {isAIEnabled && !searchQuery && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[1px]">
                <Sparkles className="h-3 w-3" />
                <span>Travel Intelligence</span>
              </div>
            )}
          </div>
          
          {/* AI Suggestions Dropdown */}
          {isAIEnabled && showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 max-h-[300px] overflow-y-auto">
              {loadingSuggestions ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Getting suggestions...</span>
                </div>
              ) : (
                <>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-black dark:text-white">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


