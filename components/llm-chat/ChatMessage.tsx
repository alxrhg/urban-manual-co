'use client';

import React, { memo } from 'react';
import { User, Sparkles, MapPin, Star, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Destination {
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string | null;
  michelin_stars?: number | null;
  crown?: boolean;
  rating?: number | null;
  micro_description?: string | null;
}

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  destinations?: Destination[];
  isStreaming?: boolean;
  timestamp?: Date;
}

// Simple markdown parser for chat messages
function parseMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      elements.push(<br key={`br-${lineIndex}`} />);
    }

    // Parse inline markdown
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let partIndex = 0;

    // Bold text **text**
    while (remaining.includes('**')) {
      const startIdx = remaining.indexOf('**');
      const endIdx = remaining.indexOf('**', startIdx + 2);

      if (endIdx === -1) break;

      // Text before bold
      if (startIdx > 0) {
        parts.push(<span key={`${lineIndex}-${partIndex++}`}>{remaining.slice(0, startIdx)}</span>);
      }

      // Bold text
      parts.push(
        <strong key={`${lineIndex}-${partIndex++}`} className="font-semibold">
          {remaining.slice(startIdx + 2, endIdx)}
        </strong>
      );

      remaining = remaining.slice(endIdx + 2);
    }

    // Remaining text
    if (remaining) {
      // Handle inline links [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      let match;
      const linkParts: React.ReactNode[] = [];

      while ((match = linkRegex.exec(remaining)) !== null) {
        if (match.index > lastIndex) {
          linkParts.push(<span key={`${lineIndex}-link-${partIndex++}`}>{remaining.slice(lastIndex, match.index)}</span>);
        }
        linkParts.push(
          <a
            key={`${lineIndex}-link-${partIndex++}`}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {match[1]}
          </a>
        );
        lastIndex = match.index + match[0].length;
      }

      if (linkParts.length > 0) {
        if (lastIndex < remaining.length) {
          linkParts.push(<span key={`${lineIndex}-link-${partIndex++}`}>{remaining.slice(lastIndex)}</span>);
        }
        parts.push(...linkParts);
      } else {
        parts.push(<span key={`${lineIndex}-${partIndex++}`}>{remaining}</span>);
      }
    }

    if (parts.length > 0) {
      elements.push(<span key={`line-${lineIndex}`}>{parts}</span>);
    }
  });

  return elements;
}

function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={`/destination/${destination.slug}`}
      className="group flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {/* Image */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
        {destination.image ? (
          <img
            src={destination.image}
            alt={destination.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-gray-400" />
          </div>
        )}
        {destination.crown && (
          <div className="absolute top-1 left-1 text-sm">👑</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {destination.name}
          </h4>
          <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {destination.city.replace(/-/g, ' ')} · <span className="capitalize">{destination.category}</span>
        </p>

        {/* Rating & Stars */}
        <div className="flex items-center gap-2 mt-1.5">
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <div className="flex items-center gap-0.5 text-xs">
              <img
                src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                alt="Michelin"
                className="w-3 h-3"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">{destination.michelin_stars}</span>
            </div>
          )}
          {destination.rating && (
            <div className="flex items-center gap-0.5 text-xs">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400">{destination.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {destination.micro_description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {destination.micro_description}
          </p>
        )}
      </div>
    </Link>
  );
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  destinations,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser
          ? 'bg-gray-900 dark:bg-white'
          : 'bg-gradient-to-br from-violet-500 to-purple-600'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white dark:text-gray-900" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}>
          {/* Role label for assistant */}
          {!isUser && (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Urban Manual AI</span>
              {isStreaming && (
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          )}

          {/* Message text */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {content ? parseMarkdown(content) : (
              isStreaming && (
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )
            )}
            {isStreaming && content && (
              <span className="inline-block w-0.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        </div>

        {/* Destinations grid */}
        {!isUser && destinations && destinations.length > 0 && (
          <div className="mt-3 space-y-2 w-full">
            {destinations.map((dest) => (
              <DestinationCard key={dest.slug} destination={dest} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatMessage;
