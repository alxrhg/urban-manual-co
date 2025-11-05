'use client';

import { User, Sparkles, MapPin, Calendar } from 'lucide-react';
import { Destination } from '@/types/destination';
import Image from 'next/image';
import Link from 'next/link';

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

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
          <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-900 dark:text-gray-100">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="flex-1 space-y-4">
        {/* Text Response */}
        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {message.content}
        </div>

        {/* Destination Results */}
        {message.destinations && message.destinations.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {message.destinations.length} {message.destinations.length === 1 ? 'Place' : 'Places'} Found
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {message.destinations.slice(0, 6).map((destination) => (
                <Link
                  key={destination.slug || destination.id}
                  href={`/destination/${destination.slug || destination.id}`}
                  className="group block border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-all hover:shadow-lg"
                >
                  {/* Image */}
                  {destination.image && (
                    <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-900">
                      <Image
                        src={destination.image}
                        alt={destination.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3 space-y-1">
                    <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                      {destination.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3 w-3" />
                      <span className="capitalize">
                        {destination.city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                      {destination.category && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{destination.category}</span>
                        </>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {destination.michelin_stars && destination.michelin_stars > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-full text-[10px] font-medium">
                          ⭐ Michelin {destination.michelin_stars}
                        </span>
                      )}
                      {destination.nearbyEvents && destination.nearbyEvents.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full text-[10px] font-medium">
                          <Calendar className="h-3 w-3" />
                          {destination.nearbyEvents.length}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {message.destinations.length > 6 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                + {message.destinations.length - 6} more places
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
