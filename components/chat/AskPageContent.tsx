'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { SuggestedQuestions } from '@/components/chat/SuggestedQuestions';
import { Destination } from '@/types/destination';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  destinations?: Destination[];
  city?: string;
  category?: string;
  weather?: any;
  timestamp: Date;
}

export function AskPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle initial query from URL
  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = async (query?: string) => {
    const messageText = query || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: messageText,
          userId: user?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'I found some interesting places for you.',
        destinations: data.destinations || [],
        city: data.intent?.city,
        category: data.intent?.category,
        weather: data.destinations?.[0]?.currentWeather,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    handleSend(question);
  };

  return (
    <div className="h-screen bg-white dark:bg-black flex flex-col overflow-hidden">
      {/* Header - Minimal, matching homepage */}
      <header className="flex-shrink-0 px-4 py-6">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <h1 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium">
            Travel Intelligence
          </h1>
        </div>
      </header>

      {/* Messages - Fixed height with overflow */}
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Ask me anything about travel</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                I can help you find restaurants, hotels, cafes, and more in cities around the world.
              </p>
              <SuggestedQuestions onSelect={handleSuggestedQuestion} />
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input - Borderless, matching homepage */}
      <footer className="flex-shrink-0 border-t border-gray-100 dark:border-gray-900 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {isLoading && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about restaurants, hotels, or cities..."
              disabled={isLoading}
              className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white transition-all duration-300 placeholder:opacity-60"
              style={{
                paddingLeft: isLoading ? '32px' : '0',
              }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-4 text-center">
            Powered by AI. Information may not always be accurate.
          </p>
        </div>
      </footer>
    </div>
  );
}
