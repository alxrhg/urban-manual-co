'use client';

import { useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, Message, ChatMessageDestination } from './ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatMessagesProps {
  messages: Message[];
  isTyping?: boolean;
  streamingContent?: string;
  onSuggestionClick?: (suggestion: string) => void;
  onDestinationClick?: (destination: ChatMessageDestination) => void;
  className?: string;
}

export const ChatMessages = memo(function ChatMessages({
  messages,
  isTyping = false,
  streamingContent = '',
  onSuggestionClick,
  onDestinationClick,
  className,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, streamingContent]);

  return (
    <ScrollArea
      className={cn('flex-1 overflow-y-auto', className)}
      ref={scrollAreaRef}
    >
      <div className="p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message, idx) => (
            <ChatMessage
              key={message.id || `msg-${idx}`}
              message={message}
              onSuggestionClick={onSuggestionClick}
              onDestinationClick={onDestinationClick}
            />
          ))}

          {/* Streaming message */}
          {(isTyping || streamingContent) && (
            <ChatMessage
              key="streaming"
              message={{
                role: 'assistant',
                content: streamingContent,
                isStreaming: true,
              }}
              isTyping={isTyping && !streamingContent}
            />
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-1" />
      </div>
    </ScrollArea>
  );
});

// Empty state component
interface EmptyStateProps {
  onSuggestionClick?: (suggestion: string) => void;
}

export function ChatEmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full p-6 text-center"
    >
      <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20 mb-4">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <span className="text-4xl">✨</span>
        </motion.div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Discover Your Next Adventure
      </h3>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        Ask me anything about restaurants, hotels, cafes, and destinations around the world.
      </p>

      <WelcomeSuggestions onSuggestionClick={onSuggestionClick} />
    </motion.div>
  );
}

// Welcome suggestions for empty state
interface WelcomeSuggestionsProps {
  onSuggestionClick?: (suggestion: string) => void;
}

export function WelcomeSuggestions({ onSuggestionClick }: WelcomeSuggestionsProps) {
  const suggestions = [
    { text: 'Best restaurants in Tokyo', icon: '🍣' },
    { text: 'Michelin-starred restaurants', icon: '⭐' },
    { text: 'Rooftop bars in New York', icon: '🍸' },
    { text: 'Boutique hotels in Paris', icon: '🏨' },
    { text: 'Coffee shops in London', icon: '☕' },
    { text: 'Hidden gems in Rome', icon: '💎' },
  ];

  return (
    <div className="w-full max-w-md">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
        Try asking:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((suggestion, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggestionClick?.(suggestion.text)}
            className="flex items-center gap-2 px-3 py-2.5 text-left text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <span>{suggestion.icon}</span>
            <span className="text-gray-700 dark:text-gray-300 truncate">
              {suggestion.text}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton for chat history
export function ChatMessagesSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
          <div
            className={cn(
              'rounded-2xl animate-pulse',
              i % 2 === 0
                ? 'bg-gray-200 dark:bg-gray-700 w-[60%] h-12'
                : 'bg-gray-100 dark:bg-gray-800 w-[75%] h-24'
            )}
          />
        </div>
      ))}
    </div>
  );
}
