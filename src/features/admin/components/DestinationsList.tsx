'use client';

import { useState } from 'react';
import { Edit2, Trash2, MapPin, Tag, Star, Crown, Search, X } from 'lucide-react';
import { Destination } from './columns';
import Image from 'next/image';

interface DestinationsListProps {
  destinations: Destination[];
  onEdit: (destination: Destination) => void;
  onDelete: (slug: string, name: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
  showSearchInput?: boolean;
}

export function DestinationsList({
  destinations,
  onEdit,
  onDelete,
  searchQuery,
  onSearchChange,
  isLoading = false,
  showSearchInput = true,
}: DestinationsListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredDestinations = destinations.filter((dest) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      dest.name.toLowerCase().includes(query) ||
      dest.city.toLowerCase().includes(query) ||
      dest.category.toLowerCase().includes(query) ||
      dest.slug.toLowerCase().includes(query)
    );
  });

  const renderSearchInput = showSearchInput ? (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search destinations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  ) : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {renderSearchInput}
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading destinations...</p>
        </div>
      </div>
    );
  }

  if (filteredDestinations.length === 0) {
    return (
      <div className="space-y-4">
        {renderSearchInput}
        <div className="text-center py-16 px-6">
          <div className="max-w-md mx-auto">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-medium text-black dark:text-white mb-2">
              {searchQuery ? 'No destinations found' : 'No destinations yet'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {searchQuery
                ? `No destinations match "${searchQuery}". Try adjusting your search terms.`
                : 'Start building your destination library by adding places that travelers will love. Each destination helps create a richer, more discoverable collection.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderSearchInput}
      {showSearchInput && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
        </div>
      )}

      <div className="space-y-2">
        {filteredDestinations.map((destination) => (
          <div
            key={destination.slug}
            className="group relative flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            onMouseEnter={() => setHoveredId(destination.slug)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Image */}
            {destination.image && (
              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <Image
                  src={destination.image}
                  alt={destination.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-black dark:text-white truncate">
                      {destination.name}
                    </h3>
                    {destination.crown && (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-normal text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        <Crown className="h-3 w-3" />
                        Crown
                      </span>
                    )}
                    {destination.michelin_stars && destination.michelin_stars > 0 && (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-normal text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        <Star className="h-3 w-3" />
                        {destination.michelin_stars}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {destination.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {destination.category}
                    </span>
                    {destination.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        {destination.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {destination.description && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {destination.description}
                    </p>
                  )}
                  <div className="mt-2">
                    <code className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                      {destination.slug}
                    </code>
                  </div>
                </div>

                {/* Inline Actions - Visible on hover */}
                <div
                  className={`flex items-center gap-1 transition-opacity ${
                    hoveredId === destination.slug ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <button
                    onClick={() => onEdit(destination)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    aria-label="Edit destination"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(destination.slug, destination.name)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    aria-label="Delete destination"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

