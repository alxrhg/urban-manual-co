'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, MapPin, Utensils, Coffee, Camera, ChevronRight, Loader2 } from 'lucide-react';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface CompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tripTitle?: string;
  destination?: string;
  days: TripDay[];
  selectedDayNumber: number;
  onAddSuggestion?: (suggestion: { category?: string; dayNumber?: number }) => void;
  className?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: QuickSuggestion[];
  isLoading?: boolean;
}

interface QuickSuggestion {
  id: string;
  title: string;
  description?: string;
  category?: string;
  icon?: 'restaurant' | 'coffee' | 'attraction' | 'activity';
}

const QUICK_PROMPTS = [
  { label: 'Where to eat?', icon: Utensils, category: 'restaurant' },
  { label: 'Coffee nearby', icon: Coffee, category: 'cafe' },
  { label: 'Must-see spots', icon: Camera, category: 'attraction' },
  { label: 'Hidden gems', icon: Sparkles, category: 'local_favorite' },
];

/**
 * CompanionPanel - Sliding AI chat panel for trip planning
 *
 * Features:
 * - Slides in from the right
 * - Context-aware suggestions based on current trip
 * - Quick prompts for common questions
 * - Progressive disclosure with expandable suggestions
 */
export default function CompanionPanel({
  isOpen,
  onClose,
  tripTitle,
  destination,
  days,
  selectedDayNumber,
  onAddSuggestion,
  className = '',
}: CompanionPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Get current day context
  const currentDay = days.find(d => d.dayNumber === selectedDayNumber);
  const dayItemsContext = currentDay?.items.map(item => ({
    title: item.title,
    category: item.destination?.category || item.parsedNotes?.type,
    time: item.time,
  })) || [];

  // Handle sending a message
  const handleSend = useCallback(async (message?: string) => {
    const text = message || inputValue.trim();
    if (!text) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response (in production, this would call an API)
    try {
      const response = await generateResponse(text, {
        destination,
        dayNumber: selectedDayNumber,
        dayItems: dayItemsContext,
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        suggestions: response.suggestions,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble right now. Please try again in a moment.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, destination, selectedDayNumber, dayItemsContext]);

  // Handle quick prompt click
  const handleQuickPrompt = useCallback((prompt: typeof QUICK_PROMPTS[0]) => {
    handleSend(prompt.label);
  }, [handleSend]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: QuickSuggestion) => {
    if (onAddSuggestion && suggestion.category) {
      onAddSuggestion({ category: suggestion.category, dayNumber: selectedDayNumber });
    }
  }, [onAddSuggestion, selectedDayNumber]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900
          shadow-2xl z-50 flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">Travel AI</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {destination ? `Planning for ${destination}` : 'Your trip assistant'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome message if no messages */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-violet-500" />
              </div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                Hi! I'm your trip companion
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Ask me anything about {destination || 'your destination'} – restaurants, attractions, local tips, and more.
              </p>

              {/* Quick Prompts */}
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <prompt.icon className="w-4 h-4 text-gray-400" />
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                <p className="text-sm">{message.content}</p>

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {suggestion.title}
                            </p>
                            {suggestion.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {suggestion.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about restaurants, attractions..."
              className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping}
              className="p-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

interface ResponseContext {
  destination?: string;
  dayNumber: number;
  dayItems: { title?: string; category?: string; time?: string | null }[];
}

async function generateResponse(
  query: string,
  context: ResponseContext
): Promise<{ content: string; suggestions?: QuickSuggestion[] }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

  const lowerQuery = query.toLowerCase();
  const city = context.destination || 'the area';

  // Context-aware responses based on query type
  if (lowerQuery.includes('eat') || lowerQuery.includes('restaurant') || lowerQuery.includes('dinner') || lowerQuery.includes('lunch')) {
    return {
      content: `Here are some great dining options in ${city} for Day ${context.dayNumber}:`,
      suggestions: [
        { id: '1', title: 'Local Favorite Restaurant', description: 'Highly rated local cuisine', category: 'restaurant' },
        { id: '2', title: 'Fine Dining Experience', description: 'Special occasion spot', category: 'restaurant' },
        { id: '3', title: 'Casual Eatery', description: 'Quick and delicious', category: 'restaurant' },
      ],
    };
  }

  if (lowerQuery.includes('coffee') || lowerQuery.includes('cafe')) {
    return {
      content: `I found some great coffee spots near your Day ${context.dayNumber} activities:`,
      suggestions: [
        { id: '1', title: 'Artisan Coffee House', description: 'Specialty roasts', category: 'cafe' },
        { id: '2', title: 'Cozy Local Café', description: 'Great atmosphere', category: 'cafe' },
      ],
    };
  }

  if (lowerQuery.includes('see') || lowerQuery.includes('attraction') || lowerQuery.includes('visit') || lowerQuery.includes('spot')) {
    return {
      content: `Must-see attractions in ${city}:`,
      suggestions: [
        { id: '1', title: 'Iconic Landmark', description: 'Most photographed spot', category: 'attraction' },
        { id: '2', title: 'Cultural Museum', description: 'Rich history', category: 'museum' },
        { id: '3', title: 'Scenic Viewpoint', description: 'Stunning panoramas', category: 'attraction' },
      ],
    };
  }

  if (lowerQuery.includes('hidden') || lowerQuery.includes('gem') || lowerQuery.includes('local')) {
    return {
      content: `Here are some hidden gems the locals love:`,
      suggestions: [
        { id: '1', title: 'Secret Garden', description: 'Off the beaten path', category: 'attraction' },
        { id: '2', title: 'Local Market', description: 'Authentic experience', category: 'market' },
      ],
    };
  }

  // Default response
  return {
    content: `I'd be happy to help you explore ${city}! You can ask me about restaurants, cafés, attractions, or local tips. What would you like to know?`,
  };
}
