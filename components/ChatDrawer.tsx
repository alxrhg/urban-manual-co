'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Drawer } from '@/components/ui/Drawer';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  role: 'user' | 'assistant';
  content: string;
  destinations?: Destination[];
}

export function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          userId: user?.id,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('AI chat failed');
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.content || '',
          destinations: data.destinations,
        },
      ]);
    } catch (error) {
      console.error('AI error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Want to try again?',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSuggestionClick(suggestion: string) {
    setInput(suggestion);
    inputRef.current?.focus();
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} desktopWidth="480px" fullScreen>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-base font-medium text-black dark:text-white">Chat</h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
              Ask me about places to eat, drink, or stay. I know our whole collection.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {['Restaurants in Tokyo', 'Best cafes in Paris', 'Hotels in London'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-gray-700 dark:text-gray-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] ${
                message.role === 'user'
                  ? 'bg-black text-white dark:bg-white dark:text-black rounded-2xl rounded-br-md px-4 py-3'
                  : 'text-black dark:text-white'
              }`}
            >
              <div className="text-sm leading-relaxed">
                {message.content.split('\n').map((line, i) => {
                  const parts = line.split(/(\*\*.*?\*\*)/g);
                  return (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>
                      {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={j}>{part}</span>;
                      })}
                    </p>
                  );
                })}
              </div>

              {/* Destination Cards */}
              {message.destinations && message.destinations.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {message.destinations.slice(0, 4).map((dest) => (
                    <a
                      key={dest.slug}
                      href={`/destination/${dest.slug}`}
                      className="group block"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/destination/${dest.slug}`;
                      }}
                    >
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                        {dest.image ? (
                          <img
                            src={dest.image}
                            alt={dest.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                        {dest.crown && (
                          <div className="absolute top-2 left-2 text-sm">👑</div>
                        )}
                        {dest.michelin_stars && dest.michelin_stars > 0 && (
                          <div className="absolute bottom-2 left-2 bg-white dark:bg-black px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <span className="text-red-500">★</span>
                            <span>{dest.michelin_stars}</span>
                          </div>
                        )}
                      </div>
                      <h4 className="mt-2 font-medium text-sm leading-tight line-clamp-2 text-black dark:text-white">
                        {dest.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                        {dest.city.replace(/-/g, ' ')}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 py-2">
              <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </Drawer>
  );
}
