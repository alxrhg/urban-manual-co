'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, MapPin, Calendar, Building2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/ui/resizable';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  timestamp?: Date;
}

// Trip item type matching TripBuilderContext
interface TripItemType {
  id: string;
  destination: {
    name?: string;
    slug?: string;
    city?: string;
    category?: string;
    image?: string;
    image_thumbnail?: string;
  };
  day: number;
  orderIndex: number;
  timeSlot?: string;
  duration: number;
  notes?: string;
}

export default function ArtifactPage() {
  return (
    <div className="h-screen bg-stone-50 dark:bg-gray-950">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - Chat */}
        <ResizablePanel defaultSize={55} minSize={40} maxSize={70}>
          <ChatPanel />
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-stone-200 dark:bg-gray-800 hover:bg-stone-300 dark:hover:bg-gray-700 transition-colors" />

        {/* Right Panel - Trip */}
        <ResizablePanel defaultSize={45} minSize={30} maxSize={60}>
          <TripPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

/**
 * ChatPanel - Left side chat interface
 */
function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Use the same AI chat endpoint as homepage
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          userId: user?.id,
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) throw new Error('Chat request failed');

      const data = await response.json();

      // Update conversation history for context
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: data.content || '' },
      ];
      setConversationHistory(newHistory);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.content || 'I couldn\'t find anything. Try another search.',
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-stone-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-900 to-stone-700 dark:from-white dark:to-gray-300 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white dark:text-gray-900" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-stone-900 dark:text-white">Travel Intelligence</h1>
            <p className="text-xs text-stone-500 dark:text-gray-400">Ask me anything about your trip</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-gray-900 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-stone-400 dark:text-gray-600" />
            </div>
            <h2 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
              Plan your perfect trip
            </h2>
            <p className="text-sm text-stone-500 dark:text-gray-400 max-w-sm">
              Ask me about restaurants, hotels, attractions, or get personalized recommendations for your trip.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {[
                "Best restaurants in Paris",
                "3-day Tokyo itinerary",
                "Hidden gems in Barcelona",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-xs bg-stone-100 dark:bg-gray-900 text-stone-700 dark:text-gray-300 rounded-full hover:bg-stone-200 dark:hover:bg-gray-800 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message, idx) => (
            <ChatBubble
              key={idx}
              role={message.role}
              content={message.content}
              suggestions={message.suggestions}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}
          {isLoading && (
            <ChatBubble
              role="assistant"
              content=""
              isTyping={true}
            />
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-stone-200 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about restaurants, hotels, cities..."
            rows={1}
            className="w-full px-4 py-3 pr-12 bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-gray-600 text-stone-900 dark:text-gray-100 resize-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-stone-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * ChatBubble - Individual chat message
 */
function ChatBubble({
  role,
  content,
  suggestions,
  isTyping,
  isStreaming,
  onSuggestionClick,
}: {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  isTyping?: boolean;
  isStreaming?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
}) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl rounded-br-md px-4 py-2.5'
            : 'bg-stone-100 dark:bg-gray-900 text-stone-900 dark:text-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5'
        }`}
      >
        {isTyping ? (
          <div className="flex items-center gap-1 py-1">
            <span className="w-2 h-2 bg-stone-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-stone-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-stone-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{content}</p>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-stone-500 dark:bg-gray-400 animate-pulse ml-0.5" />
            )}
          </>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-200 dark:border-gray-800">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="px-2.5 py-1 text-xs bg-white dark:bg-gray-800 text-stone-700 dark:text-gray-300 rounded-full hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors border border-stone-200 dark:border-gray-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * TripPanel - Right side trip preview/builder
 */
function TripPanel() {
  const { activeTrip } = useTripBuilder();
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);

  const days = activeTrip?.days || [];

  const handleDayChange = (dayNumber: number) => {
    setSelectedDayNumber(dayNumber);
  };

  if (!activeTrip) {
    return <EmptyTripState />;
  }

  const selectedDay = days.find((d) => d.dayNumber === selectedDayNumber) || days[0];

  return (
    <div className="h-full flex flex-col bg-stone-50 dark:bg-gray-950 border-l border-stone-200 dark:border-gray-800">
      {/* Trip Header */}
      <div className="flex-shrink-0 p-4 border-b border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-stone-900 dark:text-white truncate">
              {activeTrip.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-gray-400 mt-0.5">
              {activeTrip.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(activeTrip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {days.length > 0 && (
                <span>{days.length} days</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Day Navigation */}
      {days.length > 0 && (
        <DayTabNav
          days={days}
          selectedDayNumber={selectedDayNumber}
          onSelectDay={handleDayChange}
        />
      )}

      {/* Day Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedDay ? (
          <DayContent day={selectedDay} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MapPin className="w-8 h-8 text-stone-300 dark:text-gray-700 mb-3" />
            <p className="text-sm text-stone-500 dark:text-gray-400">No days planned yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * EmptyTripState - Shown when no trip is active
 */
function EmptyTripState() {
  const { savedTrips, loadTrip } = useTripBuilder();

  return (
    <div className="h-full flex flex-col bg-stone-50 dark:bg-gray-950 border-l border-stone-200 dark:border-gray-800">
      <div className="flex-shrink-0 p-4 border-b border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <h2 className="font-semibold text-stone-900 dark:text-white">Trip Planner</h2>
        <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
          Your itinerary will appear here
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-gray-900 flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-stone-400 dark:text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
          No active trip
        </h3>
        <p className="text-sm text-stone-500 dark:text-gray-400 max-w-xs mb-6">
          Start planning your trip by asking the AI assistant, or select an existing trip.
        </p>

        {savedTrips && savedTrips.length > 0 && (
          <div className="w-full max-w-xs space-y-2">
            <p className="text-xs text-stone-400 dark:text-gray-500 mb-2">Your trips:</p>
            {savedTrips.slice(0, 3).map((trip) => (
              <button
                key={trip.id}
                onClick={() => loadTrip(trip.id)}
                className="w-full p-3 bg-white dark:bg-gray-900 rounded-xl border border-stone-200 dark:border-gray-800 text-left hover:border-stone-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="font-medium text-sm text-stone-900 dark:text-white truncate">
                  {trip.title}
                </div>
                {trip.start_date && (
                  <div className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                    {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <button className="mt-6 px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:bg-stone-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create New Trip
        </button>
      </div>
    </div>
  );
}

/**
 * DayTabNav - Horizontal day navigation
 */
function DayTabNav({
  days,
  selectedDayNumber,
  onSelectDay,
}: {
  days: Array<{ dayNumber: number; date?: string | null; items: unknown[] }>;
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollTo = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 120;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="flex-shrink-0 relative bg-white dark:bg-gray-950 border-b border-stone-200 dark:border-gray-800">
      {/* Scroll Left Button */}
      <button
        onClick={() => scrollTo('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-gradient-to-r from-white dark:from-gray-950 to-transparent flex items-center justify-start pl-1"
      >
        <ChevronLeft className="w-4 h-4 text-stone-400" />
      </button>

      {/* Days */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide px-8 py-2 gap-1"
      >
        {days.map((day) => {
          const isSelected = day.dayNumber === selectedDayNumber;
          const dateStr = day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) : null;

          return (
            <button
              key={day.dayNumber}
              onClick={() => onSelectDay(day.dayNumber)}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${isSelected
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-stone-100 dark:bg-gray-900 text-stone-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-800'
                }
              `}
            >
              <span>Day {day.dayNumber}</span>
              {dateStr && (
                <span className={`ml-1 ${isSelected ? 'text-stone-300 dark:text-gray-600' : 'text-stone-400 dark:text-gray-500'}`}>
                  · {dateStr}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => scrollTo('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-gradient-to-l from-white dark:from-gray-950 to-transparent flex items-center justify-end pr-1"
      >
        <ChevronRight className="w-4 h-4 text-stone-400" />
      </button>
    </div>
  );
}

/**
 * DayContent - Shows items for a specific day
 */
function DayContent({ day }: { day: { dayNumber: number; date?: string | null; items: TripItemType[] } }) {
  const items = day.items;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MapPin className="w-8 h-8 text-stone-300 dark:text-gray-700 mb-3" />
        <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">No stops planned</p>
        <button className="px-4 py-2 text-xs bg-stone-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:bg-stone-800 dark:hover:bg-gray-200 transition-colors">
          Add your first stop
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <DayItem key={item.id || index} item={item} />
      ))}

      <button className="w-full py-3 border border-dashed border-stone-200 dark:border-gray-800 rounded-xl text-xs text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white hover:border-stone-300 dark:hover:border-gray-700 transition-colors flex items-center justify-center gap-1.5">
        <Plus className="w-3.5 h-3.5" />
        Add stop
      </button>
    </div>
  );
}

/**
 * DayItem - Individual item in a day
 */
function DayItem({ item }: { item: TripItemType }) {
  const title = item.destination?.name || 'Untitled';
  const image = item.destination?.image || item.destination?.image_thumbnail;
  const category = item.destination?.category;

  // Format time display
  const formatTime = (timeSlot?: string) => {
    if (!timeSlot) return null;
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes?.toString().padStart(2, '0')} ${period}`;
  };

  const formattedTime = formatTime(item.timeSlot);

  // Check if this is a hotel based on category
  const isHotel = category?.toLowerCase().includes('hotel') || category?.toLowerCase().includes('lodging');

  if (isHotel) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-stone-200 dark:border-gray-800 p-3 hover:border-stone-300 dark:hover:border-gray-700 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-stone-900 dark:text-white truncate">
              {title}
            </div>
            <div className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
              {formattedTime ? `Check-in at ${formattedTime}` : 'Check-in time TBD'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default place item
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-stone-200 dark:border-gray-800 overflow-hidden hover:border-stone-300 dark:hover:border-gray-700 transition-colors cursor-pointer">
      {image && (
        <div className="relative h-24 w-full">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
            sizes="400px"
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-stone-900 dark:text-white truncate">
              {title}
            </div>
            {category && (
              <div className="text-xs text-stone-500 dark:text-gray-400 capitalize mt-0.5">
                {category.replace(/_/g, ' ')}
              </div>
            )}
          </div>
          {formattedTime && (
            <div className="text-xs text-stone-500 dark:text-gray-400 flex-shrink-0">
              {formattedTime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
