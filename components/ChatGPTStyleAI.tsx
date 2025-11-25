'use client';

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Send, Sparkles, X, Minimize2, MapPin, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Destination {
  slug: string;
  name: string;
  city: string;
  neighborhood?: string;
  category: string;
  image: string | null;
  michelin_stars: number | null;
  crown: boolean;
  rating?: number;
  price_level?: number;
  micro_description?: string;
}

interface TravelContext {
  city?: string;
  neighborhood?: string;
  category?: string;
  occasion?: string;
  timeOfDay?: string;
  vibes?: string[];
  pricePreference?: string;
}

interface Suggestion {
  text: string;
  type: 'refine' | 'expand' | 'related' | 'next-step';
}

interface Message {
  role: "user" | "assistant";
  content: string;
  destinations?: Destination[];
  mode?: string;
  context?: TravelContext;
  suggestions?: Suggestion[];
  isPreview?: boolean; // True when showing quick search results before AI response
}

// Memoized destination card - only re-renders when this specific destination changes
const DestinationCard = memo(function DestinationCard({ dest }: { dest: Destination }) {
  return (
    <a
      href={`/destination/${dest.slug}`}
      className="group flex items-start gap-3 p-2 -mx-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      onClick={(e) => {
        e.preventDefault();
        window.location.href = `/destination/${dest.slug}`;
      }}
    >
      <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        {dest.image ? (
          <img
            src={dest.image}
            alt={dest.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <MapPin className="h-5 w-5 opacity-30" />
          </div>
        )}
        {dest.michelin_stars && dest.michelin_stars > 0 && (
          <div className="absolute bottom-1 left-1 bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
            <span className="text-red-500">*</span>
            <span>{dest.michelin_stars}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm leading-tight line-clamp-1 text-black dark:text-white group-hover:underline">
          {dest.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {dest.neighborhood || dest.city} · {dest.category}
          {dest.rating && <span className="ml-1">· {dest.rating}</span>}
        </p>
        {dest.micro_description && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
            {dest.micro_description}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
});

// Memoized destinations grid - only re-renders when destinations array changes
const DestinationsGrid = memo(function DestinationsGrid({
  destinations,
  isPreview
}: {
  destinations: Destination[];
  isPreview?: boolean;
}) {
  if (!destinations || destinations.length === 0) return null;

  return (
    <div className={`mt-3 space-y-2 ${isPreview ? 'opacity-90' : ''}`}>
      {destinations.slice(0, 4).map((dest) => (
        <DestinationCard key={dest.slug} dest={dest} />
      ))}
      {destinations.length > 4 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
          +{destinations.length - 4} more places
        </p>
      )}
    </div>
  );
});

export function ChatGPTStyleAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentContext, setCurrentContext] = useState<TravelContext>({});
  const [currentMode, setCurrentMode] = useState<string>('discover');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Build conversation history from messages
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      destinations: msg.destinations,
      context: msg.context,
    }));

    // Check if this looks like a search query (not conversational)
    const isSearchQuery = /hotel|restaurant|cafe|bar|coffee|food|eat|stay|museum|shop|best|recommend|find|where|looking for/i.test(userMessage);

    try {
      // PHASE 1: Quick search for instant results (only for search queries)
      if (isSearchQuery) {
        const quickSearchPromise = fetch('/api/travel-intelligence/quick-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            context: currentContext,
          }),
        }).then(r => r.ok ? r.json() : null).catch(() => null);

        // Show quick results immediately (non-blocking)
        quickSearchPromise.then(quickData => {
          if (quickData?.destinations?.length > 0) {
            // Show preview destinations while AI thinks
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === 'user') {
                return [...prev, {
                  role: "assistant",
                  content: "Finding the best options for you...",
                  destinations: quickData.destinations,
                  mode: 'discover',
                  context: quickData.context,
                  isPreview: true,
                }];
              }
              return prev;
            });
            // Update context from quick search
            if (quickData.context) {
              setCurrentContext(prev => ({ ...prev, ...quickData.context }));
            }
          }
        });
      }

      // PHASE 2: Full AI response (runs in parallel)
      const response = await fetch('/api/travel-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userId: user?.id,
          conversationHistory,
          context: currentContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Travel Intelligence request failed');
      }

      const data = await response.json();

      // Update current context and mode
      if (data.context) {
        setCurrentContext(prev => ({ ...prev, ...data.context }));
      }
      if (data.mode) {
        setCurrentMode(data.mode);
      }

      // Replace preview message with full AI response
      setMessages(prev => {
        // Remove preview message if exists
        const filtered = prev.filter((msg: any) => !msg.isPreview);
        return [...filtered, {
          role: "assistant",
          content: data.response || '',
          destinations: data.destinations,
          mode: data.mode,
          context: data.context,
          suggestions: data.suggestions,
        }];
      });
    } catch (error) {
      console.error("Travel Intelligence error:", error);
      setMessages(prev => {
        // Remove preview message if exists
        const filtered = prev.filter((msg: any) => !msg.isPreview);
        return [...filtered, {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again.",
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  // Mode indicator colors
  const modeColors: Record<string, string> = {
    discover: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    plan: 'bg-green-500/20 text-green-600 dark:text-green-400',
    compare: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    insight: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    recommend: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
    navigate: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-2 px-6 py-3 bg-white/10 dark:bg-white/10 backdrop-blur-xl text-white border border-white/20 hover:bg-white/20 transition-all duration-200"
        style={{
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
          borderRadius: '9999px'
        }}
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-medium">Travel Intelligence</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center pointer-events-none">
      {/* Chat History - Floating Above */}
      {messages.length > 0 && (
        <div className="w-full max-w-3xl mb-4 px-4 pointer-events-auto">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 max-h-[60vh] overflow-y-auto"
            style={{
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-black/90 dark:bg-white/90 text-white dark:text-black backdrop-blur-sm'
                        : 'bg-white/60 dark:bg-gray-800/60 text-black dark:text-white backdrop-blur-sm border border-white/20 dark:border-gray-700/50'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className={`h-4 w-4 ${message.isPreview ? 'animate-pulse' : ''}`} />
                        <span className="text-xs font-medium opacity-70">
                          {message.isPreview ? 'Quick results' : 'Travel Intelligence'}
                        </span>
                        {message.mode && !message.isPreview && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${modeColors[message.mode] || modeColors.discover}`}>
                            {message.mode}
                          </span>
                        )}
                        {message.isPreview && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-500/20 text-gray-600 dark:text-gray-400 animate-pulse">
                            AI thinking...
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content.split('\n').map((line, i) => {
                        // Parse markdown-style bold
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <div key={i}>
                            {parts.map((part, j) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>;
                              }
                              return <span key={j}>{part}</span>;
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Destination Cards - Memoized for partial updates */}
                    <DestinationsGrid
                      destinations={message.destinations || []}
                      isPreview={message.isPreview}
                    />

                    {/* Follow-up Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(suggestion.text)}
                              className="px-3 py-1.5 text-xs bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white rounded-full transition-colors"
                            >
                              {suggestion.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Input Bar - Bottom Center */}
      <div className="w-full max-w-3xl px-4 pb-6 pointer-events-auto">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 p-4"
          style={{
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Context indicator */}
          {(currentContext.city || currentContext.category) && messages.length > 0 && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <span className="text-xs text-gray-500">Context:</span>
              {currentContext.city && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {currentContext.city}
                </span>
              )}
              {currentContext.category && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {currentContext.category}
                </span>
              )}
              {currentContext.occasion && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {currentContext.occasion}
                </span>
              )}
              <button
                onClick={() => {
                  setCurrentContext({});
                  setMessages([]);
                }}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Clear
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask about restaurants, hotels, neighborhoods..."
                rows={1}
                className="w-full resize-none bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base"
                style={{ maxHeight: '120px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Send className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setMessages([]);
                  setCurrentContext({});
                }}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-lg hover:scale-105 transition-transform"
              >
                {messages.length > 0 ? <Minimize2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </button>
            </div>
          </form>

          {messages.length === 0 && (
            <div className="mt-3 pt-3 border-t border-white/20 dark:border-gray-700/50">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try asking:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Best restaurants in Tokyo for a romantic dinner",
                  "Where to have coffee in Paris near Le Marais",
                  "Michelin-starred spots with great atmosphere",
                  "Plan a food day in London"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 text-xs bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 text-black dark:text-white rounded-full hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
