'use client';

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, Minimize2, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Destination {
  slug: string;
  name: string;
  city: string;
  category: string;
  image: string | null;
  michelin_stars: number | null;
  crown: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  destinations?: Destination[];
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

    try {
      // Build conversation history from messages
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call the same /api/ai-chat endpoint as homepage
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.trim(),
          userId: user?.id,
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('AI chat failed');
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.content || '',
        destinations: data.destinations
      }]);
    } catch (error) {
      console.error("AI error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
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
        <span className="font-medium">AI</span>
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
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-black/90 dark:bg-white/90 text-white dark:text-black backdrop-blur-sm'
                        : 'bg-white/60 dark:bg-gray-800/60 text-black dark:text-white backdrop-blur-sm border border-white/20 dark:border-gray-700/50'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-medium opacity-70">AI Assistant</span>
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

                    {/* Destination Cards */}
                    {message.destinations && message.destinations.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {message.destinations.map((dest) => (
                          <a
                            key={dest.slug}
                            href={`/destination/${dest.slug}`}
                            className="group block"
                            onClick={(e) => {
                              e.preventDefault();
                              window.location.href = `/destination/${dest.slug}`;
                            }}
                          >
                            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
                              {dest.image ? (
                                <img
                                  src={dest.image}
                                  alt={dest.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <MapPin className="h-8 w-8 opacity-20" />
                                </div>
                              )}
                              {dest.crown && (
                                <div className="absolute top-2 left-2 text-lg">👑</div>
                              )}
                              {dest.michelin_stars && dest.michelin_stars > 0 && (
                                <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                  <img
                                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                                    alt="Michelin star"
                                    className="h-3 w-3"
                                  />
                                  <span>{dest.michelin_stars}</span>
                                </div>
                              )}
                            </div>
                            <h4 className="font-medium text-xs leading-tight line-clamp-2 mb-1 text-black dark:text-white">
                              {dest.name}
                            </h4>
                            <span className="text-xs text-gray-500 capitalize">
                              {dest.city.replace(/-/g, ' ')} · {dest.category}
                            </span>
                          </a>
                        ))}
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
                placeholder="Ask about destinations, cities, or restaurants..."
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
                  "Best restaurants in Tokyo",
                  "Michelin-starred restaurants",
                  "Cafes in Paris"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(suggestion)}
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
