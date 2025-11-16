'use client';

import { Sparkles, MapPin, Star } from 'lucide-react';
import { Destination } from '@/types/destination';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  destinations?: Destination[];
}

interface AIChatMessagesProps {
  messages: AIChatMessage[];
  searching?: boolean;
}

export default function AIChatMessages({ messages, searching = false }: AIChatMessagesProps) {
  if (messages.length === 0 && !searching) {
    return null;
  }

  return (
    <div className="max-w-[680px] mx-auto px-[24px] mb-8 space-y-6">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] ${
              message.role === 'user'
                ? 'bg-black dark:bg-white text-white dark:text-black rounded-2xl px-4 py-3'
                : 'bg-transparent'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">AI</span>
              </div>
            )}
            
            {message.role === 'assistant' && (
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line mb-4">
                {message.content.split('\n').map((line, i) => {
                  // Parse markdown-style bold
                  const parts = line.split(/(\*\*.*?\*\*)/g);
                  return (
                    <div key={i}>
                      {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j} className="text-black dark:text-white">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={j}>{part}</span>;
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* User message */}
            {message.role === 'user' && (
              <div className="text-sm">{message.content}</div>
            )}

            {/* Destination Cards from website content only */}
            {message.role === 'assistant' && message.destinations && message.destinations.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 mt-4">
                {message.destinations.map((dest) => (
                  <a
                    key={dest.slug}
                    href={`/destination/${dest.slug}`}
                    className={CARD_WRAPPER}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = `/destination/${dest.slug}`;
                    }}
                  >
                    <div className={CARD_MEDIA}>
                      {dest.image ? (
                        <img
                          src={dest.image}
                          alt={dest.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                          <MapPin className="h-8 w-8 opacity-20" />
                        </div>
                      )}
                      {dest.crown && (
                        <div className="absolute top-2 left-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        </div>
                      )}
                      {dest.michelin_stars && dest.michelin_stars > 0 && (
                        <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                          <span>⭐</span>
                          <span>{dest.michelin_stars}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <h3 className={CARD_TITLE}>{dest.name}</h3>
                      <div className={CARD_META}>
                        <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {dest.city.replace(/-/g, ' ')}
                        </span>
                        {dest.category && (
                          <>
                            <span className="text-gray-300 dark:text-gray-700">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                              {dest.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {searching && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="animate-pulse">✨</span>
            <span>Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
}

