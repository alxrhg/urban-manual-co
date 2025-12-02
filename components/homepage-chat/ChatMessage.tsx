'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, MapPin, Star, ExternalLink } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';
import { cn } from '@/lib/utils';
import type { Destination } from '@/types/destination';

export interface ChatMessageDestination {
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string | null;
  michelin_stars?: number | null;
  crown?: boolean;
  rating?: number | null;
  neighborhood?: string | null;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  destinations?: ChatMessageDestination[];
  suggestions?: string[];
  timestamp?: Date;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  onDestinationClick?: (destination: ChatMessageDestination) => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isTyping = false,
  onSuggestionClick,
  onDestinationClick,
}: ChatMessageProps) {
  const { role, content, destinations, suggestions } = message;

  if (role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] md:max-w-[75%]">
          <div className="bg-black dark:bg-white text-white dark:text-black rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed">
            {content}
          </div>
        </div>
      </motion.div>
    );
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
    >
      <div className="max-w-[90%] md:max-w-[85%]">
        {/* AI Label */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1 rounded-full bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20">
            <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Travel AI
          </span>
        </div>

        {/* Message Bubble */}
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl rounded-tl-md px-4 py-3 border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
          {isTyping && !content ? (
            <TypingIndicator />
          ) : (
            <>
              {/* Message Content */}
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <MessageContent content={content} />
              </div>

              {/* Destination Cards */}
              {destinations && destinations.length > 0 && (
                <div className="mt-4">
                  <DestinationResults
                    destinations={destinations}
                    onDestinationClick={onDestinationClick}
                  />
                </div>
              )}

              {/* Suggestions */}
              {suggestions && suggestions.length > 0 && !isTyping && (
                <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                  <SuggestionChips
                    suggestions={suggestions}
                    onSuggestionClick={onSuggestionClick}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// Parse and render message content with basic markdown support
function MessageContent({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        // Parse bold text
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={j} className="font-semibold text-gray-900 dark:text-white">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

// Destination results grid
interface DestinationResultsProps {
  destinations: ChatMessageDestination[];
  onDestinationClick?: (destination: ChatMessageDestination) => void;
}

function DestinationResults({ destinations, onDestinationClick }: DestinationResultsProps) {
  const displayDestinations = destinations.slice(0, 6);
  const hasMore = destinations.length > 6;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {displayDestinations.map((dest) => (
          <DestinationCard
            key={dest.slug}
            destination={dest}
            onClick={() => onDestinationClick?.(dest)}
          />
        ))}
      </div>
      {hasMore && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          +{destinations.length - 6} more results
        </p>
      )}
    </div>
  );
}

// Individual destination card
interface DestinationCardProps {
  destination: ChatMessageDestination;
  onClick?: () => void;
}

function DestinationCard({ destination, onClick }: DestinationCardProps) {
  const { name, city, category, image, michelin_stars, crown, rating, neighborhood } = destination;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group text-left w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-200 dark:bg-gray-700 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-6 w-6 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 flex gap-1">
          {crown && (
            <span className="text-sm" title="Crown Selection">
              👑
            </span>
          )}
          {michelin_stars && michelin_stars > 0 && (
            <span
              className="bg-white/90 dark:bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5"
              title={`${michelin_stars} Michelin Star${michelin_stars > 1 ? 's' : ''}`}
            >
              ⭐ {michelin_stars}
            </span>
          )}
        </div>

        {/* Rating */}
        {rating && rating > 0 && (
          <div className="absolute bottom-1.5 right-1.5 bg-white/90 dark:bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        <h4 className="font-medium text-xs leading-tight line-clamp-2 text-gray-900 dark:text-white mb-0.5">
          {name}
        </h4>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize line-clamp-1">
          {neighborhood || city.replace(/-/g, ' ')} · {category}
        </p>
      </div>
    </motion.button>
  );
}

// Suggestion chips
interface SuggestionChipsProps {
  suggestions: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

function SuggestionChips({ suggestions, onSuggestionClick }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.slice(0, 4).map((suggestion, idx) => (
        <motion.button
          key={idx}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSuggestionClick?.(suggestion)}
          className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
}
